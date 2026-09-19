// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {SplitPayment} from "../src/SplitPayment.sol";

contract DeployScript is Script {
    function run() external returns (address registryAddr, address splitPaymentAddr) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ModelRegistry registry = new ModelRegistry();
        SplitPayment splitPayment = new SplitPayment(address(registry));

        vm.stopBroadcast();

        registryAddr = address(registry);
        splitPaymentAddr = address(splitPayment);

        console2.log("=== Torrentia Contracts Deployed ===");
        console2.log("ModelRegistry deployed at:", registryAddr);
        console2.log("SplitPayment deployed at:", splitPaymentAddr);

        string memory deployment = vm.serializeAddress(
            "deployment",
            "modelRegistry",
            registryAddr
        );
        deployment = vm.serializeAddress("deployment", "splitPayment", splitPaymentAddr);
        deployment = vm.serializeUint("deployment", "chainId", block.chainid);
        deployment = vm.serializeString(
            "deployment",
            "deployedAt",
            vm.toString(block.timestamp)
        );
        vm.writeJson(deployment, "deployments/monad-testnet.json");
    }
}
