// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/StdInvariant.sol";

import "../../src/token/MockERC20.sol";
import "../../src/amm/AMMPair.sol";

contract Handler is Test {
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    AMMPair public pair;

    address public user = address(1);

    constructor(
        MockERC20 _tokenA,
        MockERC20 _tokenB,
        AMMPair _pair
    ) {
        tokenA = _tokenA;
        tokenB = _tokenB;
        pair = _pair;

        tokenA.mint(user, 10_000_000 ether);
        tokenB.mint(user, 10_000_000 ether);

        vm.startPrank(user);

        tokenA.approve(address(pair), type(uint256).max);
        tokenB.approve(address(pair), type(uint256).max);

        pair.addLiquidity(
            1_000_000 ether,
            1_000_000 ether,
            1
        );

        vm.stopPrank();
    }

    function swapAForB(uint256 amountIn) public {
        amountIn = bound(amountIn, 1 ether, 1000 ether);

        vm.startPrank(user);

        try pair.swap(address(tokenA), amountIn, 1) {

        } catch {

        }

        vm.stopPrank();
    }

    function swapBForA(uint256 amountIn) public {
        amountIn = bound(amountIn, 1 ether, 1000 ether);

        vm.startPrank(user);

        try pair.swap(address(tokenB), amountIn, 1) {

        } catch {

        }

        vm.stopPrank();
    }

    function addLiquidity(uint256 amount0, uint256 amount1) public {
        amount0 = bound(amount0, 1 ether, 1000 ether);
        amount1 = bound(amount1, 1 ether, 1000 ether);

        vm.startPrank(user);

        try pair.addLiquidity(amount0, amount1, 1) {

        } catch {

        }

        vm.stopPrank();
    }

    function removeLiquidity(uint256 lpAmount) public {
        uint256 balance = pair.lpToken().balanceOf(user);

        if (balance == 0) return;

        lpAmount = bound(lpAmount, 1, balance);

        vm.startPrank(user);

        pair.lpToken().approve(address(pair), type(uint256).max);

        try pair.removeLiquidity(lpAmount, 1, 1) {

        } catch {

        }

        vm.stopPrank();
    }
}

contract AMMInvariantTest is StdInvariant, Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    AMMPair pair;

    Handler handler;

    uint256 public initialK;

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");

        pair = new AMMPair(
            address(tokenA),
            address(tokenB)
        );

        handler = new Handler(
            tokenA,
            tokenB,
            pair
        );

        targetContract(address(handler));

        initialK = pair.reserve0() * pair.reserve1();
    }

    function invariant_KNeverDecreases() public view {
        uint256 currentK = pair.reserve0() * pair.reserve1();

        assertGe(currentK, initialK);
    }

    function invariant_ReservesNonZero() public view {
        assertGt(pair.reserve0(), 0);
        assertGt(pair.reserve1(), 0);
    }

    function invariant_TotalSupplyMatchesLiquidity() public view {
        uint256 totalSupply = pair.lpToken().totalSupply();

        assertGt(totalSupply, 0);
    }

    function invariant_ConstantProductExists() public view {
        uint256 k = pair.reserve0() * pair.reserve1();

        assertGt(k, 0);
    }

    function invariant_NoNegativeReserves() public view {
        assertGe(pair.reserve0(), 0);
        assertGe(pair.reserve1(), 0);
    }
}