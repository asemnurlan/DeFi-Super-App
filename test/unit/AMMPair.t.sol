// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/token/MockERC20.sol";
import "../src/amm/AMMPair.sol";

contract AMMPairTest is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    AMMPair pair;

    address user = address(1);

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");

        pair = new AMMPair(address(tokenA), address(tokenB));

        tokenA.mint(user, 1_000_000 ether);
        tokenB.mint(user, 1_000_000 ether);

        vm.startPrank(user);
        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);
        vm.stopPrank();
    }

    function testAddLiquidity() public {
        vm.prank(user);
        uint256 lp = pair.addLiquidity(1000 ether, 1000 ether, 1);

        assertGt(lp, 0);
        assertEq(pair.reserve0(), 1000 ether);
        assertEq(pair.reserve1(), 1000 ether);
    }

    function testSwap() public {
        vm.prank(user);
        pair.addLiquidity(1000 ether, 1000 ether, 1);

        vm.prank(user);
        uint256 amountOut = pair.swap(address(tokenA), 100 ether, 1);

        assertGt(amountOut, 0);
        assertGt(pair.reserve0(), 1000 ether);
        assertLt(pair.reserve1(), 1000 ether);
    }

    function testSwapRevertsWithHighSlippage() public {
        vm.prank(user);
        pair.addLiquidity(1000 ether, 1000 ether, 1);

        vm.prank(user);
        vm.expectRevert();
        pair.swap(address(tokenA), 100 ether, 999 ether);
    }

    function testRemoveLiquidity() public {
        vm.prank(user);
        uint256 lp = pair.addLiquidity(1000 ether, 1000 ether, 1);

        vm.prank(user);
        pair.removeLiquidity(lp / 2, 1, 1);

        assertLt(pair.reserve0(), 1000 ether);
        assertLt(pair.reserve1(), 1000 ether);
    }

    function testKDoesNotDecreaseAfterSwap() public {
        vm.prank(user);
        pair.addLiquidity(1000 ether, 1000 ether, 1);

        uint256 kBefore = pair.reserve0() * pair.reserve1();

        vm.prank(user);
        pair.swap(address(tokenA), 100 ether, 1);

        uint256 kAfter = pair.reserve0() * pair.reserve1();

        assertGe(kAfter, kBefore);
    }
}