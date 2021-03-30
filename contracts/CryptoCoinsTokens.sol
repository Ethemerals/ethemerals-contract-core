// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../openzep/token/ERC20/extensions/ERC20Burnable.sol";

contract CryptoCoinsTokens is ERC20Burnable {
    constructor (
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        _mint(msg.sender, 1000000000000000000000000);
    }
}