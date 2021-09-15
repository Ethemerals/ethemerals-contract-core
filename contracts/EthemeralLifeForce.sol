// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../openzep/token/ERC20/extensions/ERC20Burnable.sol";

contract EthemeralLifeForce is Context, ERC20Burnable {
    /**
      * Mint total supply 420 million
      * Transfer to erc721 contract
      *
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 42000000 * 10**18);

        // should total 42 million * 10**18
    }
}
