// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestToken
 * @dev Simple ERC20 token for testing purposes
 */
contract TestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestToken", "TEST") {
        _mint(msg.sender, initialSupply);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

