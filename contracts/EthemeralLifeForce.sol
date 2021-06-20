// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../openzep/token/ERC20/extensions/ERC20Burnable.sol";


contract EthemeralLifeForce is Context, ERC20Burnable {
    /**
      * Mint total supply 420 million
      * Transfer to erc721 contract
      *
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 420000000 * 10**18);

        // should total 420 million * 10**18
    }
}
