// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../openzep/token/ERC20/extensions/ERC20Burnable.sol";

// "Ethemeral Life Force", "ELF"
// ETH per ELF 0.0000036 or 10:250 0000
// 10
// 2500000

contract EthemeralLifeForce is Context, ERC20Burnable {
    /**
      * Mint total supply 420 million
      * Mint to investors and devs
      * Transfer to erc1115 contract
      *
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 420000000 * 10**18);

        // MINT to investors and dev addresses. should total 420 million * 10**18
    }
}
