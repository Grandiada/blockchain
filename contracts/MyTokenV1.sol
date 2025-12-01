// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenV1 is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        // Блокируем реализацию, чтобы ей нельзя было пользоваться напрямую
        _disableInitializers();
    }

    /// Вместо конструктора — initialize
    function initialize(
        uint256 initialSupply,
        address initialOwner
    ) public initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init(initialOwner);
        __UUPSUpgradeable_init();

        _mint(initialOwner, initialSupply);
    }

    /// Mint — только владелец
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// UUPS-хук: кто может апгрейдить реализацию
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
