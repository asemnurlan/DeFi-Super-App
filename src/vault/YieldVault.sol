// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC4626} from "openzeppelin-contracts/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract YieldVault is ERC4626 {
    constructor(IERC20 asset_)
        ERC20("DeFi Super App Vault Share", "DSA-VS")
        ERC4626(asset_)
    {}
}