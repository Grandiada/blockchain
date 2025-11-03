// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }

    // Minting function restricted to the owner
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Token transfer between accounts is already implemented by ERC20's transfer function.
    // Example usage:
    // myToken.transfer(recipient, amount);
    // myToken.transferFrom(sender, recipient, amount);

    // Edge cases like transferring more tokens than balance are already handled:
    // - transfer/transferFrom will revert on insufficient balance.
}
