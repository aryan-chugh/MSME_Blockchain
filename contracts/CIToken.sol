// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CIToken
 * @dev Platform utility token for the MSME Credit Platform
 * Used for oracle staking, platform fees, and governance
 */
contract CIToken is ERC20, Ownable {
    
    // Events
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);

    /**
     * @dev Constructor that mints initial supply to deployer
     * @param initialSupply Initial token supply (will be multiplied by decimals)
     */
    constructor(uint256 initialSupply) ERC20("Credit Intelligence Token", "CIT") Ownable(msg.sender) {
        // Mint initial supply to the contract deployer (treasury/governance)
        _mint(msg.sender, initialSupply * 10**decimals());
        emit TokensMinted(msg.sender, initialSupply * 10**decimals());
    }

    /**
     * @dev Mint new tokens (only owner can call)
     * @param to Address to receive tokens
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount Amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from a specific address (requires allowance)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnFrom(address from, uint256 amount) external {
        _spendAllowance(from, msg.sender, amount);
        _burn(from, amount);
        emit TokensBurned(from, amount);
    }
}
