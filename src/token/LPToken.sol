// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPToken is ERC20 {
    address public immutable pair;

    error OnlyPair();

    constructor(string memory name_, string memory symbol_, address pair_) ERC20(name_, symbol_) {
        pair = pair_;
    }

    modifier onlyPair() {
        if (msg.sender != pair) revert OnlyPair();
        _;
    }

    function mint(address to, uint256 amount) external onlyPair {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyPair {
        _burn(from, amount);
    }
}