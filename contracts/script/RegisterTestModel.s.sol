// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";

contract RegisterTestModelScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        address registryAddress = vm.envOr("MODEL_REGISTRY_ADDRESS", address(0));
        require(registryAddress != address(0), "MODEL_REGISTRY_ADDRESS required");

        ModelRegistry registry = ModelRegistry(registryAddress);

        bytes32 modelId = keccak256("meta-llama/Llama-3-8B-Instruct");
        string memory metadataURI = "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
        uint256 chunkPrice = 0.001 ether; // 0.001 MON per chunk
        uint16 creatorShareBps = 7000;    // 70% creator, 30% seeder
        uint32 chunkCount = 50;

        vm.startBroadcast(deployerPrivateKey);

        registry.registerModel(
            modelId,
            metadataURI,
            chunkPrice,
            creatorShareBps,
            chunkCount
        );

        vm.stopBroadcast();

        console2.log("=== Test Model Registered ===");
        console2.logBytes32(modelId);
        console2.log("Chunk price:", chunkPrice);
        console2.log("Creator share (bps):", creatorShareBps);
    }
}
