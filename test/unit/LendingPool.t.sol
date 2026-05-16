// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "src/token/MockERC20.sol";
import "src/lending/LendingPool.sol";
contract LendingPoolTest is Test {
    MockERC20 collateral;
    MockERC20 debt;
    LendingPool lending;

    address user = address(1);
    address liquidator = address(2);

    function setUp() public {
        collateral = new MockERC20("Collateral", "COL");
        debt = new MockERC20("Debt", "DEBT");

        lending = new LendingPool();

        lending.supportToken(address(collateral), 2000 ether);
        lending.supportToken(address(debt), 1 ether);

        collateral.mint(user, 10 ether);
        debt.mint(address(lending), 100_000 ether);
        debt.mint(liquidator, 100_000 ether);

        vm.startPrank(user);
        collateral.approve(address(lending), type(uint256).max);
        debt.approve(address(lending), type(uint256).max);
        vm.stopPrank();

        vm.prank(liquidator);
        debt.approve(address(lending), type(uint256).max);
    }

    function testDeposit() public {
        vm.prank(user);
        lending.deposit(address(collateral), 1 ether);

        assertEq(lending.collateralBalance(user, address(collateral)), 1 ether);
    }

    function testBorrowWithinLTV() public {
        vm.startPrank(user);
        lending.deposit(address(collateral), 1 ether);
        lending.borrow(address(debt), 1000 ether);
        vm.stopPrank();

        assertEq(lending.debtBalance(user, address(debt)), 1000 ether);
    }

    function testBorrowAboveLTVReverts() public {
        vm.startPrank(user);
        lending.deposit(address(collateral), 1 ether);

        vm.expectRevert();
        lending.borrow(address(debt), 2000 ether);

        vm.stopPrank();
    }

    function testRepay() public {
        vm.startPrank(user);
        lending.deposit(address(collateral), 1 ether);
        lending.borrow(address(debt), 1000 ether);
        lending.repay(address(debt), 500 ether);
        vm.stopPrank();

        assertEq(lending.debtBalance(user, address(debt)), 500 ether);
    }

    function testLiquidation() public {
        vm.startPrank(user);
        lending.deposit(address(collateral), 1 ether);
        lending.borrow(address(debt), 1500 ether);
        vm.stopPrank();

        lending.setPrice(address(collateral), 1000 ether);

        vm.prank(liquidator);
        lending.liquidate(user, address(debt), address(collateral), 500 ether);

        assertLt(lending.debtBalance(user, address(debt)), 1500 ether);
    }
}