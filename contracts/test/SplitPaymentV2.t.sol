// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {SplitPaymentV2} from "../src/SplitPaymentV2.sol";

contract SplitPaymentV2Test is Test {
    ModelRegistry registry;
    SplitPaymentV2 channel;

    uint256 downloaderKey = 0xD00D;
    address downloader;
    address creator = address(0xA11CE);
    address seeder = address(0xB0B);
    bytes32 modelId = keccak256("session-model");
    bytes32 sessionId = keccak256("session-1");
    bytes32 customModelId = keccak256("custom-split-model");
    bytes32 customSessionId = keccak256("custom-split-session");
    uint256 price = 0.001 ether;

    function setUp() public {
        downloader = vm.addr(downloaderKey);
        registry = new ModelRegistry();
        channel = new SplitPaymentV2(address(registry));

        vm.prank(creator);
        registry.registerModel(modelId, "ipfs://manifest", price, 7000, 10);
        vm.deal(downloader, 10 ether);
    }

    function test_SettleBatch_UsesRegisteredSplitAndPermissionlessRelay() public {
        uint48 serviceDeadline = uint48(block.timestamp + 1 days);
        vm.prank(downloader);
        channel.openSession{value: 2 * price}(sessionId, modelId, serviceDeadline);

        SplitPaymentV2.ChunkPaymentClaim[] memory claims = new SplitPaymentV2.ChunkPaymentClaim[](2);
        bytes[] memory signatures = new bytes[](2);
        for (uint32 i = 0; i < 2; i++) {
            claims[i] = SplitPaymentV2.ChunkPaymentClaim({
                sessionId: sessionId,
                chunkIndex: i,
                chunkHash: keccak256(abi.encode("chunk", i)),
                seeder: seeder,
                deadline: serviceDeadline
            });
            signatures[i] = _sign(claims[i]);
        }

        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder.balance;
        channel.settleBatch(sessionId, claims, signatures);

        assertEq(creator.balance - creatorBefore, 2 * price * 7000 / 10000);
        assertEq(seeder.balance - seederBefore, 2 * price - (2 * price * 7000 / 10000));
        (, , , uint256 totalClaimed, , , ) = channel.sessions(sessionId);
        assertEq(totalClaimed, 2 * price);
    }

    function test_SettleBatch_SupportsCreatorConfiguredSixtyFortySplit() public {
        vm.prank(creator);
        registry.registerModel(customModelId, "ipfs://custom-manifest", price, 6000, 10);

        uint48 serviceDeadline = uint48(block.timestamp + 1 days);
        vm.prank(downloader);
        channel.openSession{value: price}(customSessionId, customModelId, serviceDeadline);

        SplitPaymentV2.ChunkPaymentClaim[] memory claims = new SplitPaymentV2.ChunkPaymentClaim[](1);
        claims[0] = SplitPaymentV2.ChunkPaymentClaim(
            customSessionId,
            0,
            keccak256("custom-chunk"),
            seeder,
            serviceDeadline
        );
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = _sign(claims[0]);

        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder.balance;
        channel.settleBatch(customSessionId, claims, signatures);

        assertEq(creator.balance - creatorBefore, price * 6000 / 10000);
        assertEq(seeder.balance - seederBefore, price * 4000 / 10000);
    }

    function test_SettleBatch_RejectsReplay() public {
        uint48 serviceDeadline = uint48(block.timestamp + 1 days);
        vm.prank(downloader);
        channel.openSession{value: 2 * price}(sessionId, modelId, serviceDeadline);

        SplitPaymentV2.ChunkPaymentClaim[] memory claims = new SplitPaymentV2.ChunkPaymentClaim[](1);
        claims[0] = SplitPaymentV2.ChunkPaymentClaim(sessionId, 0, bytes32(uint256(1)), seeder, serviceDeadline);
        bytes[] memory signatures = new bytes[](1);
        signatures[0] = _sign(claims[0]);
        channel.settleBatch(sessionId, claims, signatures);

        vm.expectRevert(SplitPaymentV2.ChunkAlreadyClaimed.selector);
        channel.settleBatch(sessionId, claims, signatures);
    }

    function test_ReclaimWaitsForSettlementGracePeriod() public {
        uint48 serviceDeadline = uint48(block.timestamp + 1 days);
        vm.prank(downloader);
        channel.openSession{value: price}(sessionId, modelId, serviceDeadline);

        vm.warp(uint256(serviceDeadline) + channel.SETTLEMENT_GRACE_PERIOD());
        vm.expectRevert(SplitPaymentV2.SessionExpired.selector);
        vm.prank(downloader);
        channel.reclaimUnspent(sessionId);

        vm.warp(block.timestamp + 1);
        uint256 before = downloader.balance;
        vm.prank(downloader);
        channel.reclaimUnspent(sessionId);
        assertEq(downloader.balance - before, price);
    }

    function _sign(SplitPaymentV2.ChunkPaymentClaim memory claim) internal view returns (bytes memory) {
        bytes32 domainTypeHash = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
        bytes32 domain = keccak256(
            abi.encode(
                domainTypeHash,
                keccak256("Torrentia Payment Channel"),
                keccak256("2"),
                block.chainid,
                address(channel)
            )
        );
        bytes32 claimTypeHash = channel.CLAIM_TYPEHASH();
        bytes32 structHash = keccak256(
            abi.encode(claimTypeHash, claim.sessionId, claim.chunkIndex, claim.chunkHash, claim.seeder, claim.deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domain, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(downloaderKey, digest);
        return abi.encodePacked(r, s, v);
    }
}
