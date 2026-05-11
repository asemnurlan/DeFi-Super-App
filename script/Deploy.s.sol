// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MockPriceFeed} from "../src/oracles/MockPriceFeed.sol"; 

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        MockPriceFeed oracle = new MockPriceFeed(8, "BTC / USD", 6500000000000);
        vm.stopBroadcast();
    }
}