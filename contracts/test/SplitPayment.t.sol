// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {ModelRegistry} from "../src/ModelRegistry.sol";
import {SplitPayment} from "../src/SplitPayment.sol";

contract SplitPaymentTest is Test {
    ModelRegistry public registry;
    SplitPayment public splitPayment;

    address public creator = address(0xA11CE);
    address public seeder1 = address(0xB0B);
    address public seeder2 = address(0xCAFE);
    address public downloader = address(0xD00D);

    bytes32 public model70_30 = keccak256("model-70-30");
    bytes32 public model50_50 = keccak256("model-50-50");
    bytes32 public model99_01 = keccak256("model-99-01");
    bytes32 public model01_99 = keccak256("model-01-99");
    bytes32 public modelOdd = keccak256("model-odd-wei");

    uint256 public standardPrice = 0.001 ether; // 1e15 wei

    event PaymentSplit(
        bytes32 indexed modelId,
        address indexed seeder,
        address indexed creator,
        uint256 seederAmount,
        uint256 creatorAmount,
        uint256 totalPaid
    );

    function setUp() public {
        registry = new ModelRegistry();
        splitPayment = new SplitPayment(address(registry));

        // Fund downloader
        vm.deal(downloader, 100 ether);

        // Register models with various creatorShareBps
        vm.startPrank(creator);
        registry.registerModel(model70_30, "ipfs://uri-70", standardPrice, 7000, 100);
        registry.registerModel(model50_50, "ipfs://uri-50", standardPrice, 5000, 100);
        registry.registerModel(model99_01, "ipfs://uri-99", standardPrice, 9900, 100);
        registry.registerModel(model01_99, "ipfs://uri-01", standardPrice, 100, 100);
        registry.registerModel(modelOdd, "ipfs://uri-odd", 1001 wei, 7000, 10);
        vm.stopPrank();
    }

    function test_Constructor_RevertIfZeroAddress() public {
        vm.expectRevert(SplitPayment.InvalidRegistryAddress.selector);
        new SplitPayment(address(0));
    }

    function test_PayForChunk_70_30_Success() public {
        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder1.balance;

        uint256 expectedCreator = 0.0007 ether;
        uint256 expectedSeeder = 0.0003 ether;

        vm.expectEmit(true, true, true, true, address(splitPayment));
        emit PaymentSplit(
            model70_30,
            seeder1,
            creator,
            expectedSeeder,
            expectedCreator,
            standardPrice
        );

        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model70_30, seeder1);

        assertEq(creator.balance - creatorBefore, expectedCreator);
        assertEq(seeder1.balance - seederBefore, expectedSeeder);
        assertEq(address(splitPayment).balance, 0); // No dust remaining in contract
    }

    function test_PayForChunk_50_50_Success() public {
        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder1.balance;

        uint256 expectedCreator = 0.0005 ether;
        uint256 expectedSeeder = 0.0005 ether;

        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model50_50, seeder1);

        assertEq(creator.balance - creatorBefore, expectedCreator);
        assertEq(seeder1.balance - seederBefore, expectedSeeder);
        assertEq(address(splitPayment).balance, 0);
    }

    function test_PayForChunk_99_01_Success() public {
        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder1.balance;

        uint256 expectedCreator = (standardPrice * 9900) / 10000;
        uint256 expectedSeeder = standardPrice - expectedCreator;

        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model99_01, seeder1);

        assertEq(creator.balance - creatorBefore, expectedCreator);
        assertEq(seeder1.balance - seederBefore, expectedSeeder);
        assertEq(address(splitPayment).balance, 0);
    }

    function test_PayForChunk_01_99_Success() public {
        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder1.balance;

        uint256 expectedCreator = (standardPrice * 100) / 10000;
        uint256 expectedSeeder = standardPrice - expectedCreator;

        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model01_99, seeder1);

        assertEq(creator.balance - creatorBefore, expectedCreator);
        assertEq(seeder1.balance - seederBefore, expectedSeeder);
        assertEq(address(splitPayment).balance, 0);
    }

    function test_PayForChunk_OddWeiRounding_SeederGetsRemainder() public {
        uint256 creatorBefore = creator.balance;
        uint256 seederBefore = seeder1.balance;

        // 1001 * 7000 / 10000 = 700.7 -> floor is 700 wei to creator
        // seeder gets 1001 - 700 = 301 wei
        vm.prank(downloader);
        splitPayment.payForChunk{value: 1001 wei}(modelOdd, seeder1);

        assertEq(creator.balance - creatorBefore, 700 wei);
        assertEq(seeder1.balance - seederBefore, 301 wei);
        assertEq(address(splitPayment).balance, 0);
    }

    function test_PayForChunk_RevertIfUnderpaid() public {
        vm.prank(downloader);
        vm.expectRevert(
            abi.encodeWithSelector(
                SplitPayment.IncorrectPaymentAmount.selector,
                standardPrice,
                standardPrice - 1
            )
        );
        splitPayment.payForChunk{value: standardPrice - 1}(model70_30, seeder1);
    }

    function test_PayForChunk_RevertIfOverpaid() public {
        vm.prank(downloader);
        vm.expectRevert(
            abi.encodeWithSelector(
                SplitPayment.IncorrectPaymentAmount.selector,
                standardPrice,
                standardPrice + 1
            )
        );
        splitPayment.payForChunk{value: standardPrice + 1}(model70_30, seeder1);
    }

    function test_PayForChunk_RevertIfZeroSeeder() public {
        vm.prank(downloader);
        vm.expectRevert(SplitPayment.InvalidSeederAddress.selector);
        splitPayment.payForChunk{value: standardPrice}(model70_30, address(0));
    }

    function test_PayForChunk_RevertIfModelInactive() public {
        vm.prank(creator);
        registry.deactivateModel(model70_30);

        vm.prank(downloader);
        vm.expectRevert(
            abi.encodeWithSelector(
                SplitPayment.ModelNotActive.selector,
                model70_30
            )
        );
        splitPayment.payForChunk{value: standardPrice}(model70_30, seeder1);
    }

    function test_PayForChunk_RevertIfModelNotFound() public {
        bytes32 nonexistent = keccak256("nonexistent");
        vm.prank(downloader);
        vm.expectRevert(
            abi.encodeWithSelector(
                SplitPayment.ModelNotActive.selector,
                nonexistent
            )
        );
        splitPayment.payForChunk{value: standardPrice}(nonexistent, seeder1);
    }

    function test_PayForChunk_SequentialPaymentsDifferentSeeders() public {
        uint256 creatorBefore = creator.balance;
        uint256 seeder1Before = seeder1.balance;
        uint256 seeder2Before = seeder2.balance;

        // Downloader pays seeder1
        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model70_30, seeder1);

        // Downloader pays seeder2
        vm.prank(downloader);
        splitPayment.payForChunk{value: standardPrice}(model70_30, seeder2);

        // Creator received 70% twice = 0.0014 ether
        assertEq(creator.balance - creatorBefore, 0.0014 ether);
        // Seeder1 received 30% once = 0.0003 ether
        assertEq(seeder1.balance - seeder1Before, 0.0003 ether);
        // Seeder2 received 30% once = 0.0003 ether
        assertEq(seeder2.balance - seeder2Before, 0.0003 ether);
        assertEq(address(splitPayment).balance, 0);
    }
}
