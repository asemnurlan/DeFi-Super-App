// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockPriceFeed {
    uint8 private _decimals;
    string private _description;
    uint256 private _version;
    
    int256 private _latestAnswer;
    uint256 private _latestTimestamp;
    uint80 private _latestRound;

    constructor(uint8 decimals_, string memory description_, int256 initialPrice) {
        _decimals = decimals_;
        _description = description_;
        _latestAnswer = initialPrice;
        _latestTimestamp = block.timestamp;
        _latestRound = 1;
    }

    function updatePrice(int256 newPrice) external {
        _latestAnswer = newPrice;
        _latestTimestamp = block.timestamp;
        _latestRound++;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function description() external view returns (string memory) {
        return _description;
    }

    function version() external view returns (uint256) {
        return _version;
    }

    function getRoundData(uint80 _roundId)
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_roundId, _latestAnswer, _latestTimestamp, _latestTimestamp, _roundId);
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (_latestRound, _latestAnswer, _latestTimestamp, _latestTimestamp, _latestRound);
    }
}