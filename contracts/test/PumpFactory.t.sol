// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {PumpFactory} from "../src/PumpFactory.sol";
import {MemeToken} from "../src/MemeToken.sol";

contract PumpFactoryTest is Test {
    PumpFactory factory;
    address alice = address(0xA11CE);

    function setUp() public {
        factory = new PumpFactory(address(this), 100);
        vm.deal(alice, 10 ether);
    }

    function testLaunchBuySell() public {
        vm.startPrank(alice);
        (uint256 id, address token) = factory.createLaunch(
            "Frog",
            "FROG",
            1e14,
            1e10,
            1_000_000 ether
        );
        (uint256 cost,) = factory.quoteBuy(id, 10 ether);
        factory.buy{value: cost}(id, 10 ether);
        assertEq(MemeToken(token).balanceOf(alice), 10 ether);
        uint256 beforeBal = alice.balance;
        factory.sell(id, 5 ether);
        assertEq(MemeToken(token).balanceOf(alice), 5 ether);
        assertGt(alice.balance, beforeBal);
        vm.stopPrank();
    }
}
