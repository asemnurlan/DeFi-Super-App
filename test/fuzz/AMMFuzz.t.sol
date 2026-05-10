// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../src/token/MockERC20.sol";
import "../../src/amm/AMMPair.sol";

contract AMMFuzzTest is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    AMMPair pair;

    address user = address(1);

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");

        pair = new AMMPair(address(tokenA), address(tokenB));

        tokenA.mint(user, 10_000_000 ether);
        tokenB.mint(user, 10_000_000 ether);

        vm.startPrank(user);
        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);
        pair.addLiquidity(1_000_000 ether, 1_000_000 ether, 1);
        vm.stopPrank();
    }

    function testFuzzSwap(uint256 amountIn) public {
        amountIn = bound(amountIn, 1 ether, 1000 ether);

        uint256 kBefore = pair.reserve0() * pair.reserve1();

        vm.prank(user);
        pair.swap(address(tokenA), amountIn, 1);

        uint256 kAfter = pair.reserve0() * pair.reserve1();

        assertGe(kAfter, kBefore);
    }
}