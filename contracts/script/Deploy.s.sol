// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {PumpFactory} from "../src/PumpFactory.sol";

contract Deploy is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);
        PumpFactory factory = new PumpFactory(deployer, 100);
        vm.stopBroadcast();
        vm.setEnv("FACTORY", vm.toString(address(factory)));
    }
}
