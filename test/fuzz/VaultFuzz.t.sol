// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/token/MockERC20.sol";
import "../../src/vault/DeFiVault.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract VaultFuzzTest is Test {
    MockERC20 asset;
    DeFiVault vault;

    address user = address(1);

    function setUp() public {
        asset = new MockERC20("Asset", "AST");

        DeFiVault implementation = new DeFiVault();

        bytes memory data = abi.encodeCall(DeFiVault.initialize, (address(asset), address(this)));

        ERC1967Proxy proxy = new ERC1967Proxy(address(implementation), data);

        vault = DeFiVault(address(proxy));

        asset.mint(user, 1_000_000 ether);

        vm.prank(user);
        asset.approve(address(vault), type(uint256).max);
    }

    function testFuzzDeposit(uint256 amount) public {
        amount = bound(amount, 1 ether, 10_000 ether);

        vm.prank(user);
        uint256 shares = vault.deposit(amount, user);

        assertGt(shares, 0);
        assertEq(vault.totalAssets(), amount);
    }

    function testFuzzWithdraw(uint256 amount) public {
        amount = bound(amount, 1 ether, 10_000 ether);

        vm.startPrank(user);
        vault.deposit(amount, user);
        vault.withdraw(amount / 2, user, user);
        vm.stopPrank();

        assertGt(vault.totalAssets(), 0);
    }
}