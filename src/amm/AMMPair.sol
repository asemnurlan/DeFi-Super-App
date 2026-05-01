// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "../libraries/YulMath.sol";

contract AMMPair is ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token0;
    IERC20 public immutable token1;
    LPToken public immutable lpToken;

    uint256 public reserve0;
    uint256 public reserve1;

    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant FEE_NUMERATOR = 997;

    event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
    event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpBurned);
    event Swap(address indexed user, address indexed tokenIn, uint256 amountIn, uint256 amountOut);

    error InvalidToken();
    error ZeroAmount();
    error InsufficientOutput();
    error InsufficientLiquidity();
    error SlippageExceeded();

    constructor(address _token0, address _token1) {
        require(_token0 != address(0) && _token1 != address(0), "zero address");
        require(_token0 != _token1, "same token");

        token0 = IERC20(_token0);
        token1 = IERC20(_token1);

        lpToken = new LPToken("DeFi Super LP", "DSLP", address(this));
    }

    function addLiquidity(
        uint256 amount0,
        uint256 amount1,
        uint256 minLpOut
    ) external nonReentrant returns (uint256 lpOut) {
        if (amount0 == 0 || amount1 == 0) revert ZeroAmount();

        uint256 totalSupply = lpToken.totalSupply();

        if (totalSupply == 0) {
            lpOut = YulMath.sqrt(amount0 * amount1);
        } else {
            uint256 lp0 = (amount0 * totalSupply) / reserve0;
            uint256 lp1 = (amount1 * totalSupply) / reserve1;
            lpOut = YulMath.minYul(lp0, lp1);
        }

        if (lpOut == 0) revert InsufficientLiquidity();
        if (lpOut < minLpOut) revert SlippageExceeded();

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        reserve0 += amount0;
        reserve1 += amount1;

        lpToken.mint(msg.sender, lpOut);

        emit LiquidityAdded(msg.sender, amount0, amount1, lpOut);
    }

    function removeLiquidity(
        uint256 lpAmount,
        uint256 minAmount0,
        uint256 minAmount1
    ) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        if (lpAmount == 0) revert ZeroAmount();

        uint256 totalSupply = lpToken.totalSupply();

        amount0 = (lpAmount * reserve0) / totalSupply;
        amount1 = (lpAmount * reserve1) / totalSupply;

        if (amount0 < minAmount0 || amount1 < minAmount1) revert SlippageExceeded();

        reserve0 -= amount0;
        reserve1 -= amount1;

        lpToken.burn(msg.sender, lpAmount);

        token0.safeTransfer(msg.sender, amount0);
        token1.safeTransfer(msg.sender, amount1);

        emit LiquidityRemoved(msg.sender, amount0, amount1, lpAmount);
    }

    function swap(
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant returns (uint256 amountOut) {
        if (amountIn == 0) revert ZeroAmount();

        bool isToken0In = tokenIn == address(token0);
        if (!isToken0In && tokenIn != address(token1)) revert InvalidToken();

        IERC20 inputToken = isToken0In ? token0 : token1;
        IERC20 outputToken = isToken0In ? token1 : token0;

        uint256 reserveIn = isToken0In ? reserve0 : reserve1;
        uint256 reserveOut = isToken0In ? reserve1 : reserve0;

        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();

        amountOut = getAmountOut(tokenIn, amountIn);

        if (amountOut < minAmountOut) revert SlippageExceeded();
        if (amountOut == 0) revert InsufficientOutput();

        inputToken.safeTransferFrom(msg.sender, address(this), amountIn);

        if (isToken0In) {
            reserve0 += amountIn;
            reserve1 -= amountOut;
        } else {
            reserve1 += amountIn;
            reserve0 -= amountOut;
        }

        outputToken.safeTransfer(msg.sender, amountOut);

        emit Swap(msg.sender, tokenIn, amountIn, amountOut);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256) {
        bool isToken0In = tokenIn == address(token0);
        if (!isToken0In && tokenIn != address(token1)) revert InvalidToken();

        uint256 reserveIn = isToken0In ? reserve0 : reserve1;
        uint256 reserveOut = isToken0In ? reserve1 : reserve0;

        uint256 amountInWithFee = amountIn * FEE_NUMERATOR;

        return (reserveOut * amountInWithFee) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
    }

    function getReserves() external view returns (uint256, uint256) {
        return (reserve0, reserve1);
    }
}