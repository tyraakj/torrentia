// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {SplitPaymentV2} from "../src/SplitPaymentV2.sol";

contract DeployV2Script is Script {
    function run() external returns (address splitPaymentV2Addr) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address registryAddr = vm.envOr("MODEL_REGISTRY_ADDRESS", address(0xe2cEDee4817B11716728aed3C3d7AD0438813340));

        vm.startBroadcast(deployerPrivateKey);

        SplitPaymentV2 splitPaymentV2 = new SplitPaymentV2(registryAddr);

        vm.stopBroadcast();

        splitPaymentV2Addr = address(splitPaymentV2);

        console2.log("=== SplitPaymentV2 Deployed ===");
        console2.log("ModelRegistry address:", registryAddr);
        console2.log("SplitPaymentV2 deployed at:", splitPaymentV2Addr);
    }
}
