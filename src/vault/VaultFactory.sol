// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./DeFiVault.sol";

contract VaultFactory {
    address public immutable implementation;

    event VaultCreated(address indexed asset, address indexed owner, address vault);

    constructor(address _implementation) {
        require(_implementation != address(0), "zero implementation");
        implementation = _implementation;
    }

    function createVault(address asset, address owner) external returns (address vault) {
        bytes memory data = abi.encodeCall(DeFiVault.initialize, (asset, owner));

        ERC1967Proxy proxy = new ERC1967Proxy(implementation, data);

        vault = address(proxy);

        emit VaultCreated(asset, owner, vault);
    }
}