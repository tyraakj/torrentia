// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ModelRegistry} from "./ModelRegistry.sol";
import {TorrentiaEIP712} from "./TorrentiaEIP712.sol";

/// @title SplitPaymentV2
/// @notice One funded download session with signed chunk vouchers and batched settlement.
/// @dev Settlement is permissionless. A relayer may submit a batch, while funds go to
///      the seeder named by every voucher in that batch.
contract SplitPaymentV2 is TorrentiaEIP712, ReentrancyGuard {

    struct Session {
        address downloader;
        bytes32 modelId;
        uint256 deposit;
        uint256 totalClaimed;
        uint48 serviceDeadline;
        uint48 settlementDeadline;
        bool closed;
    }

    struct ChunkPaymentClaim {
        bytes32 sessionId;
        uint32 chunkIndex;
        bytes32 chunkHash;
        address seeder;
        uint48 deadline;
    }

    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "ChunkPaymentClaim(bytes32 sessionId,uint32 chunkIndex,bytes32 chunkHash,address seeder,uint48 deadline)"
    );

    uint48 public constant SETTLEMENT_GRACE_PERIOD = 1 hours;

    ModelRegistry public immutable registry;
    mapping(bytes32 => Session) public sessions;
    mapping(bytes32 => mapping(uint256 => uint256)) public claimedChunksBitmap;

    event SessionOpened(
        bytes32 indexed sessionId,
        address indexed downloader,
        bytes32 indexed modelId,
        uint256 deposit,
        uint48 serviceDeadline,
        uint48 settlementDeadline
    );
    event BatchSettled(
        bytes32 indexed sessionId,
        address indexed seeder,
        uint256 chunkCount,
        uint256 totalSeederAmount,
        uint256 totalCreatorAmount
    );
    event SessionClosed(bytes32 indexed sessionId, address indexed downloader, uint256 refundedAmount);

    error InvalidRegistryAddress();
    error InvalidSessionId();
    error SessionAlreadyExists();
    error SessionNotActive();
    error SessionExpired();
    error ClaimExpired();
    error InvalidModelId();
    error InvalidSeeder();
    error InvalidChunkHash();
    error InvalidSignature();
    error ChunkAlreadyClaimed();
    error EmptyBatch();
    error ArrayLengthMismatch();
    error InsufficientDeposit();
    error TransferFailed();
    error Unauthorized();

    constructor(address _registry) TorrentiaEIP712("Torrentia Payment Channel", "2") {
        if (_registry == address(0)) revert InvalidRegistryAddress();
        registry = ModelRegistry(_registry);
    }

    /// @notice Opens a funded session for one model.
    function openSession(bytes32 sessionId, bytes32 modelId, uint48 serviceDeadline) external payable nonReentrant {
        if (sessionId == bytes32(0)) revert InvalidSessionId();
        if (sessions[sessionId].downloader != address(0)) revert SessionAlreadyExists();
        if (msg.value == 0 || serviceDeadline <= block.timestamp) revert SessionExpired();

        ModelRegistry.Model memory model = registry.getModel(modelId);
        if (!model.active || model.originalCreator == address(0)) revert InvalidModelId();

        uint48 settlementDeadline = serviceDeadline + SETTLEMENT_GRACE_PERIOD;
        sessions[sessionId] = Session({
            downloader: msg.sender,
            modelId: modelId,
            deposit: msg.value,
            totalClaimed: 0,
            serviceDeadline: serviceDeadline,
            settlementDeadline: settlementDeadline,
            closed: false
        });

        emit SessionOpened(sessionId, msg.sender, modelId, msg.value, serviceDeadline, settlementDeadline);
    }

    /// @notice Settles a batch of vouchers. Any caller may relay the transaction.
    /// @dev All claims in a batch must target the same seeder to preserve one payout transfer.
    function settleBatch(
        bytes32 sessionId,
        ChunkPaymentClaim[] calldata claims,
        bytes[] calldata signatures
    ) external nonReentrant {
        if (claims.length == 0) revert EmptyBatch();
        if (claims.length != signatures.length) revert ArrayLengthMismatch();

        Session storage session = sessions[sessionId];
        if (session.downloader == address(0) || session.closed) revert SessionNotActive();
        if (block.timestamp > session.settlementDeadline) revert SessionExpired();

        ModelRegistry.Model memory model = registry.getModel(session.modelId);
        if (!model.active || model.originalCreator == address(0)) revert InvalidModelId();

        address batchSeeder = claims[0].seeder;
        if (batchSeeder == address(0)) revert InvalidSeeder();

        uint256 batchTotal = model.chunkPrice * claims.length;
        uint256 totalCreatorAmount = (batchTotal * uint256(model.creatorShareBps)) / 10000;
        uint256 totalSeederAmount = batchTotal - totalCreatorAmount;

        if (session.totalClaimed + batchTotal > session.deposit) revert InsufficientDeposit();

        for (uint256 i = 0; i < claims.length; i++) {
            ChunkPaymentClaim calldata claim = claims[i];
            if (claim.seeder != batchSeeder) revert InvalidSeeder();
            _validateAndMarkClaim(sessionId, session, model, claim, signatures[i]);
        }

        session.totalClaimed += batchTotal;

        if (totalCreatorAmount > 0) {
            (bool creatorSuccess, ) = payable(model.originalCreator).call{value: totalCreatorAmount}("");
            if (!creatorSuccess) revert TransferFailed();
        }
        if (totalSeederAmount > 0) {
            (bool seederSuccess, ) = payable(batchSeeder).call{value: totalSeederAmount}("");
            if (!seederSuccess) revert TransferFailed();
        }

        emit BatchSettled(sessionId, batchSeeder, claims.length, totalSeederAmount, totalCreatorAmount);
    }

    /// @notice Returns the unused session deposit after service and settlement deadlines.
    function reclaimUnspent(bytes32 sessionId) external nonReentrant {
        Session storage session = sessions[sessionId];
        if (session.downloader != msg.sender) revert Unauthorized();
        if (session.closed) revert SessionNotActive();
        if (block.timestamp <= session.settlementDeadline) revert SessionExpired();

        session.closed = true;
        uint256 refund = session.deposit - session.totalClaimed;
        if (refund > 0) {
            (bool success, ) = payable(msg.sender).call{value: refund}("");
            if (!success) revert TransferFailed();
        }
        emit SessionClosed(sessionId, msg.sender, refund);
    }

    function _validateAndMarkClaim(
        bytes32 sessionId,
        Session storage session,
        ModelRegistry.Model memory model,
        ChunkPaymentClaim calldata claim,
        bytes calldata signature
    ) internal {
        if (claim.sessionId != sessionId) revert InvalidSessionId();
        if (claim.chunkHash == bytes32(0)) revert InvalidChunkHash();
        if (claim.chunkIndex >= model.chunkCount) revert InvalidModelId();
        if (block.timestamp > claim.deadline || claim.deadline > session.settlementDeadline) {
            revert ClaimExpired();
        }

        uint256 wordIndex = uint256(claim.chunkIndex) / 256;
        uint256 bitIndex = uint256(claim.chunkIndex) % 256;
        uint256 mask = 1 << bitIndex;
        if ((claimedChunksBitmap[sessionId][wordIndex] & mask) != 0) revert ChunkAlreadyClaimed();

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claim.sessionId,
                claim.chunkIndex,
                claim.chunkHash,
                claim.seeder,
                claim.deadline
            )
        );
        if (_recover(_hashTypedDataV4(structHash), signature) != session.downloader) {
            revert InvalidSignature();
        }

        claimedChunksBitmap[sessionId][wordIndex] |= mask;
    }
}
