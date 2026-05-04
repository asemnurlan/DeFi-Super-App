// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./DeFiVault.sol";

contract DeFiVaultV2 is DeFiVault {
    function version() external pure returns (string memory) {
        return "V2";
    }
}