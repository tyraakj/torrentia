// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ModelRegistry} from "./ModelRegistry.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SplitPayment
 * @notice Settles chunk download payments on Monad by atomically splitting native funds
 *         between the serving seeder and the original model creator.
 * @dev Read model terms from ModelRegistry. Transfers are atomic in a single transaction.
 */
contract SplitPayment is ReentrancyGuard {
    /// @notice Immutable reference to the ModelRegistry contract
    ModelRegistry public immutable registry;

    // Events
    event PaymentSplit(
        bytes32 indexed modelId,
        address indexed seeder,
        address indexed creator,
        uint256 seederAmount,
        uint256 creatorAmount,
        uint256 totalPaid
    );

    // Custom Errors
    error InvalidRegistryAddress();
    error ModelNotActive(bytes32 modelId);
    error IncorrectPaymentAmount(uint256 expected, uint256 received);
    error InvalidSeederAddress();
    error CreatorTransferFailed();
    error SeederTransferFailed();

    /**
     * @notice Initializes the SplitPayment contract with the registry address.
     * @param _registry Address of the ModelRegistry contract
     */
    constructor(address _registry) {
        if (_registry == address(0)) {
            revert InvalidRegistryAddress();
        }
        registry = ModelRegistry(_registry);
    }

    /**
     * @notice Pays for a model chunk and atomically splits funds between seeder and creator.
     * @param modelId Unique identifier of the model being downloaded
     * @param seederAddress Address of the peer who seeded and served the chunk
     */
    function payForChunk(bytes32 modelId, address seederAddress) external payable nonReentrant {
        if (seederAddress == address(0)) {
            revert InvalidSeederAddress();
        }

        ModelRegistry.Model memory model = registry.getModel(modelId);

        if (!model.active) {
            revert ModelNotActive(modelId);
        }

        if (msg.value != model.chunkPrice) {
            revert IncorrectPaymentAmount(model.chunkPrice, msg.value);
        }

        // Creator receives floor of split percentage; seeder receives remaining wei to prevent rounding loss
        uint256 creatorAmount = (msg.value * uint256(model.creatorShareBps)) / 10000;
        uint256 seederAmount = msg.value - creatorAmount;

        emit PaymentSplit(
            modelId,
            seederAddress,
            model.originalCreator,
            seederAmount,
            creatorAmount,
            msg.value
        );

        // Atomic native asset transfers
        if (creatorAmount > 0) {
            (bool successCreator, ) = model.originalCreator.call{value: creatorAmount}("");
            if (!successCreator) {
                revert CreatorTransferFailed();
            }
        }

        if (seederAmount > 0) {
            (bool successSeeder, ) = seederAddress.call{value: seederAmount}("");
            if (!successSeeder) {
                revert SeederTransferFailed();
            }
        }
    }
}
