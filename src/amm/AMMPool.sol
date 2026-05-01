// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import {LPToken} from "./LPToken.sol";

contract AMMPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    LPToken public immutable lpToken;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public constant FEE = 3;
    uint256 public constant FEE_DENOMINATOR = 1000;

    event LiquidityAdded(address indexed user, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event LiquidityRemoved(address indexed user, uint256 amount0, uint256 amount1, uint256 lpBurned);
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);

    error InvalidAmount();
    error InsufficientLiquidity();
    error SlippageExceeded();
    error InvalidToken();

    constructor(address _token0, address _token1) {
        require(_token0 != _token1, "same token");
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        lpToken = new LPToken();
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external nonReentrant returns (uint256 lpMinted) {
        if (amount0 == 0 || amount1 == 0) revert InvalidAmount();

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        if (lpToken.totalSupply() == 0) {
            lpMinted = sqrt(amount0 * amount1);
        } else {
            uint256 lp0 = (amount0 * lpToken.totalSupply()) / reserve0;
            uint256 lp1 = (amount1 * lpToken.totalSupply()) / reserve1;
            lpMinted = lp0 < lp1 ? lp0 : lp1;
        }

        if (lpMinted == 0) revert InsufficientLiquidity();

        reserve0 += amount0;
        reserve1 += amount1;

        lpToken.mint(msg.sender, lpMinted);

        emit LiquidityAdded(msg.sender, amount0, amount1, lpMinted);
    }

    function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (lpAmount == 0) revert InvalidAmount();

        uint256 totalSupply = lpToken.totalSupply();

        amount0 = (lpAmount * reserve0) / totalSupply;
        amount1 = (lpAmount * reserve1) / totalSupply;

        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        lpToken.burn(msg.sender, lpAmount);

        reserve0 -= amount0;
        reserve1 -= amount1;

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, lpAmount);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InvalidAmount();

        bool isToken0 = tokenIn == address(token0);
        if (!isToken0 && tokenIn != address(token1)) revert InvalidToken();

        IERC20 inputToken = isToken0 ? token0 : token1;
        IERC20 outputToken = isToken0 ? token1 : token0;

        uint256 reserveIn = isToken0 ? reserve0 : reserve1;
        uint256 reserveOut = isToken0 ? reserve1 : reserve0;

        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - FEE);
        amountOut = (amountInWithFee * reserveOut) / ((reserveIn * FEE_DENOMINATOR) + amountInWithFee);

        if (amountOut < minAmountOut) revert SlippageExceeded();

        inputToken.safeTransferFrom(msg.sender, address(this), amountIn);
        outputToken.safeTransfer(msg.sender, amountOut);

        if (isToken0) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }

    function sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;

        uint256 z = (x + 1) / 2;
        y = x;

        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}