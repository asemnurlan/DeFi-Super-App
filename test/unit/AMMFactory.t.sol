// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/token/MockERC20.sol";
import "../src/amm/AMMFactory.sol";

contract AMMFactoryTest is Test {
    MockERC20 tokenA;
    MockERC20 tokenB;
    AMMFactory factory;

    function setUp() public {
        tokenA = new MockERC20("Token A", "A");
        tokenB = new MockERC20("Token B", "B");
        factory = new AMMFactory();
    }

    function testCreatePair() public {
        address pair = factory.createPair(address(tokenA), address(tokenB));

        assertTrue(pair != address(0));
        assertEq(factory.allPairsLength(), 1);
    }

    function testCreate2Pair() public {
        bytes32 salt = keccak256("PAIR_SALT");

        address predicted = factory.predictPairAddress(address(tokenA), address(tokenB), salt);
        address pair = factory.createPairDeterministic(address(tokenA), address(tokenB), salt);

        assertEq(pair, predicted);
    }
}