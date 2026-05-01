// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LendingPool is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PRECISION = 1e18;
    uint256 public constant LTV = 75e16;
    uint256 public constant LIQUIDATION_THRESHOLD = 80e16;
    uint256 public constant LIQUIDATION_BONUS = 105e16;

    mapping(address => bool) public supportedTokens;
    mapping(address => uint256) public prices;

    mapping(address => mapping(address => uint256)) public collateralBalance;
    mapping(address => mapping(address => uint256)) public debtBalance;

    address[] public collateralTokens;
    address[] public debtTokens;

    event TokenSupported(address token, uint256 price);
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event Borrowed(address indexed user, address indexed token, uint256 amount);
    event Repaid(address indexed user, address indexed token, uint256 amount);
    event Liquidated(address indexed liquidator, address indexed user, address debtToken, address collateralToken, uint256 repaid);

    error UnsupportedToken();
    error ZeroAmount();
    error UnsafePosition();
    error HealthyPosition();
    error InsufficientCollateral();
    error InsufficientLiquidity();

    constructor() Ownable(msg.sender) {}

    function supportToken(address token, uint256 price) external onlyOwner {
        require(token != address(0), "zero token");
        require(price > 0, "zero price");

        if (!supportedTokens[token]) {
            supportedTokens[token] = true;
            collateralTokens.push(token);
            debtTokens.push(token);
        }

        prices[token] = price;

        emit TokenSupported(token, price);
    }

    function setPrice(address token, uint256 price) external onlyOwner {
        require(supportedTokens[token], "not supported");
        require(price > 0, "zero price");

        prices[token] = price;
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (amount == 0) revert ZeroAmount();

        collateralBalance[msg.sender][token] += amount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (amount == 0) revert ZeroAmount();
        if (collateralBalance[msg.sender][token] < amount) revert InsufficientCollateral();

        collateralBalance[msg.sender][token] -= amount;

        if (!_isHealthy(msg.sender)) revert UnsafePosition();

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, token, amount);
    }

    function borrow(address token, uint256 amount) external nonReentrant {
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (amount == 0) revert ZeroAmount();

        if (IERC20(token).balanceOf(address(this)) < amount) revert InsufficientLiquidity();

        debtBalance[msg.sender][token] += amount;

        if (!_isHealthyAfterBorrow(msg.sender)) revert UnsafePosition();

        IERC20(token).safeTransfer(msg.sender, amount);

        emit Borrowed(msg.sender, token, amount);
    }

    function repay(address token, uint256 amount) external nonReentrant {
        if (!supportedTokens[token]) revert UnsupportedToken();
        if (amount == 0) revert ZeroAmount();

        uint256 debt = debtBalance[msg.sender][token];
        uint256 repayAmount = amount > debt ? debt : amount;

        debtBalance[msg.sender][token] -= repayAmount;

        IERC20(token).safeTransferFrom(msg.sender, address(this), repayAmount);

        emit Repaid(msg.sender, token, repayAmount);
    }

    function liquidate(
        address user,
        address debtToken,
        address collateralToken,
        uint256 repayAmount
    ) external nonReentrant {
        if (!_isSupportedPair(debtToken, collateralToken)) revert UnsupportedToken();
        if (repayAmount == 0) revert ZeroAmount();

        if (_isHealthy(user)) revert HealthyPosition();

        uint256 userDebt = debtBalance[user][debtToken];
        uint256 actualRepay = repayAmount > userDebt ? userDebt : repayAmount;

        uint256 debtValue = (actualRepay * prices[debtToken]) / PRECISION;
        uint256 collateralToSeize = (debtValue * LIQUIDATION_BONUS * PRECISION) / prices[collateralToken] / PRECISION;

        if (collateralToSeize > collateralBalance[user][collateralToken]) {
            collateralToSeize = collateralBalance[user][collateralToken];
        }

        debtBalance[user][debtToken] -= actualRepay;
        collateralBalance[user][collateralToken] -= collateralToSeize;

        IERC20(debtToken).safeTransferFrom(msg.sender, address(this), actualRepay);
        IERC20(collateralToken).safeTransfer(msg.sender, collateralToSeize);

        emit Liquidated(msg.sender, user, debtToken, collateralToken, actualRepay);
    }

    function getHealthFactor(address user) public view returns (uint256) {
        uint256 debtValue = getDebtValue(user);

        if (debtValue == 0) {
            return type(uint256).max;
        }

        uint256 collateralValue = getCollateralValue(user);

        return (collateralValue * LIQUIDATION_THRESHOLD) / debtValue;
    }

    function getBorrowableValue(address user) public view returns (uint256) {
        uint256 collateralValue = getCollateralValue(user);
        uint256 maxBorrowValue = (collateralValue * LTV) / PRECISION;
        uint256 currentDebtValue = getDebtValue(user);

        if (maxBorrowValue <= currentDebtValue) {
            return 0;
        }

        return maxBorrowValue - currentDebtValue;
    }

    function getCollateralValue(address user) public view returns (uint256 value) {
        for (uint256 i = 0; i < collateralTokens.length; i++) {
            address token = collateralTokens[i];
            value += (collateralBalance[user][token] * prices[token]) / PRECISION;
        }
    }

    function getDebtValue(address user) public view returns (uint256 value) {
        for (uint256 i = 0; i < debtTokens.length; i++) {
            address token = debtTokens[i];
            value += (debtBalance[user][token] * prices[token]) / PRECISION;
        }
    }

    function _isHealthy(address user) internal view returns (bool) {
        return getHealthFactor(user) >= PRECISION;
    }

    function _isHealthyAfterBorrow(address user) internal view returns (bool) {
        uint256 debtValue = getDebtValue(user);
        uint256 collateralValue = getCollateralValue(user);
        uint256 maxBorrowValue = (collateralValue * LTV) / PRECISION;

        return debtValue <= maxBorrowValue;
    }

    function _isSupportedPair(address tokenA, address tokenB) internal view returns (bool) {
        return supportedTokens[tokenA] && supportedTokens[tokenB];
    }
}