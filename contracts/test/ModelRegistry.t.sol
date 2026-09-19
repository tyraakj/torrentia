// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";

contract ModelRegistryTest is Test {
    ModelRegistry public registry;

    address public creator = address(0xA11CE);
    address public stranger = address(0xB0B);

    bytes32 public testModelId = keccak256("model-meta-llama-3-8b");
    string public testURI = "ipfs://QmZtmD2qt8STMQNd6ppmqmxjgHG5jMBh4vaM54asbusx28";
    uint256 public testChunkPrice = 0.001 ether;
    uint16 public testCreatorShareBps = 7000; // 70%
    uint32 public testChunkCount = 100;

    event ModelRegistered(
        bytes32 indexed modelId,
        address indexed creator,
        string metadataURI,
        uint256 chunkPrice,
        uint16 creatorShareBps,
        uint32 chunkCount
    );

    event ModelDeactivated(
        bytes32 indexed modelId,
        address indexed creator
    );

    function setUp() public {
        registry = new ModelRegistry();
    }

    function test_RegisterModel_Success() public {
        vm.prank(creator);

        vm.expectEmit(true, true, false, true, address(registry));
        emit ModelRegistered(
            testModelId,
            creator,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        ModelRegistry.Model memory model = registry.getModel(testModelId);
        assertEq(model.originalCreator, creator);
        assertEq(model.metadataURI, testURI);
        assertEq(model.chunkPrice, testChunkPrice);
        assertEq(model.creatorShareBps, testCreatorShareBps);
        assertEq(model.chunkCount, testChunkCount);
        assertTrue(model.active);
    }

    function test_RegisterModel_RevertIfDuplicate() public {
        vm.prank(creator);
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.ModelAlreadyExists.selector, testModelId));
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );
    }

    function test_RegisterModel_RevertIfCreatorShareBpsTooLow() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.InvalidCreatorShareBps.selector, 99));
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            99,
            testChunkCount
        );
    }

    function test_RegisterModel_RevertIfCreatorShareBpsTooHigh() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.InvalidCreatorShareBps.selector, 9901));
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            9901,
            testChunkCount
        );
    }

    function test_RegisterModel_RevertIfZeroChunkPrice() public {
        vm.prank(creator);
        vm.expectRevert(ModelRegistry.InvalidChunkPrice.selector);
        registry.registerModel(
            testModelId,
            testURI,
            0,
            testCreatorShareBps,
            testChunkCount
        );
    }

    function test_RegisterModel_RevertIfZeroChunkCount() public {
        vm.prank(creator);
        vm.expectRevert(ModelRegistry.InvalidChunkCount.selector);
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            0
        );
    }

    function test_RegisterModel_RevertIfEmptyMetadataURI() public {
        vm.prank(creator);
        vm.expectRevert(ModelRegistry.EmptyMetadataURI.selector);
        registry.registerModel(
            testModelId,
            "",
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );
    }

    function test_DeactivateModel_Success() public {
        vm.prank(creator);
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        vm.prank(creator);
        vm.expectEmit(true, true, false, true, address(registry));
        emit ModelDeactivated(testModelId, creator);
        registry.deactivateModel(testModelId);

        ModelRegistry.Model memory model = registry.getModel(testModelId);
        assertFalse(model.active);
    }

    function test_DeactivateModel_RevertIfNonCreator() public {
        vm.prank(creator);
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.UnauthorizedCaller.selector, stranger));
        registry.deactivateModel(testModelId);
    }

    function test_DeactivateModel_RevertIfNotFound() public {
        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.ModelNotFound.selector, testModelId));
        registry.deactivateModel(testModelId);
    }

    function test_DeactivateModel_RevertIfAlreadyInactive() public {
        vm.prank(creator);
        registry.registerModel(
            testModelId,
            testURI,
            testChunkPrice,
            testCreatorShareBps,
            testChunkCount
        );

        vm.prank(creator);
        registry.deactivateModel(testModelId);

        vm.prank(creator);
        vm.expectRevert(abi.encodeWithSelector(ModelRegistry.ModelAlreadyInactive.selector, testModelId));
        registry.deactivateModel(testModelId);
    }
}
