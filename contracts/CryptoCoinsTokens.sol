// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "../openzep/token/ERC20/extensions/ERC20Burnable.sol";
import "../openzep/access/AccessControlEnumerable.sol";
import "../openzep/utils/Context.sol";

// gas limit 3000000
// "CryptoCoinsTokens", "CCT"

contract CryptoCoinsTokens is Context, AccessControlEnumerable, ERC20Burnable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /**
      * Mint total supply 420 million
      * Mint to investors and devs
      * Transfer to erc1115 contract
      * Allows burning
      *
     */
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        _mint(msg.sender, 420000000 * 10**18);

        // MINT to investors and dev addresses. should total 420 million * 10**18
    }

    function mint(address to, uint256 amount) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "CCT: must have minter role to mint");
        _mint(to, amount);
    }


}
