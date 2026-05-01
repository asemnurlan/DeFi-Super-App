// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/Create2.sol";
import "./AMMPair.sol";

contract AMMFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, bool deterministic);

    error PairExists();
    error SameToken();
    error ZeroAddress();

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        if (getPair[token0][token1] != address(0)) revert PairExists();

        pair = address(new AMMPair(token0, token1));

        _savePair(token0, token1, pair, false);
    }

    function createPairDeterministic(
        address tokenA,
        address tokenB,
        bytes32 salt
    ) external returns (address pair) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        if (getPair[token0][token1] != address(0)) revert PairExists();

        bytes memory bytecode = abi.encodePacked(
            type(AMMPair).creationCode,
            abi.encode(token0, token1)
        );

        pair = Create2.deploy(0, salt, bytecode);

        _savePair(token0, token1, pair, true);
    }

    function predictPairAddress(
        address tokenA,
        address tokenB,
        bytes32 salt
    ) external view returns (address predicted) {
        (address token0, address token1) = _sortTokens(tokenA, tokenB);

        bytes memory bytecode = abi.encodePacked(
            type(AMMPair).creationCode,
            abi.encode(token0, token1)
        );

        bytes32 bytecodeHash = keccak256(bytecode);

        predicted = Create2.computeAddress(salt, bytecodeHash, address(this));
    }

    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }

    function _savePair(address token0, address token1, address pair, bool deterministic) internal {
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        allPairs.push(pair);

        emit PairCreated(token0, token1, pair, deterministic);
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();
        if (tokenA == tokenB) revert SameToken();

        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
}