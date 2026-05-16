// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "../src/governance/GovernanceToken.sol";
import "../src/governance/TimeLock.sol";
import "../src/governance/GovernorContract.sol";

contract DeployGovernance is Script {
    uint48 public constant VOTING_DELAY = 1; 
    uint32 public constant VOTING_PERIOD = 50400; 
    uint256 public constant PROPOSAL_THRESHOLD = 0; 
    uint256 public constant QUORUM_NUMERATOR = 4; 
    uint256 public constant MIN_DELAY = 3600; 

    function run() external returns (GovernanceToken, TimeLock, GovernorContract) {
        uint256 deployerPrivateKey = vm.envOr("PRIVATE_KEY", uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80));
        
        vm.startBroadcast(deployerPrivateKey);

        // 1. Деплоим токен управления
        GovernanceToken govToken = new GovernanceToken(1000000 * 10**18);

        // Нам нужно заранее знать адрес контракта Governor, чтобы передать его в Timelock.
        // Вычисляем адрес, по которому будет развернут governor (так как nonce деплоера увеличится на 1)
        address deployerAddress = vm.addr(deployerPrivateKey);
        uint256 currentNonce = vm.getNonce(deployerAddress);
        address predictedGovernorAddress = vm.computeCreateAddress(deployerAddress, currentNonce + 1);

        // Настраиваем роли прямо для конструктора Timelock
        address[] memory proposers = new address[](1);
        proposers[0] = predictedGovernorAddress; // Только Governor сможет создавать пропозалы

        address[] memory executors = new address[](1);
        executors[0] = address(0); // Кто угодно сможет исполнять прошедшие таймлок задачи

        // 2. Деплоим TimeLock (админом ставим address(0), чтобы у деплоера вообще не было контроля!)
        TimeLock timelock = new TimeLock(MIN_DELAY, proposers, executors, address(0));

        // 3. Деплоим GovernorContract (его адрес совпадет с предсказанным выше)
        GovernorContract governor = new GovernorContract(
            govToken,
            timelock,
            VOTING_DELAY,
            VOTING_PERIOD,
            PROPOSAL_THRESHOLD,
            QUORUM_NUMERATOR
        );

        vm.stopBroadcast();

        return (govToken, timelock, governor);
    }
}