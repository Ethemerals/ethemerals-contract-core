// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "../openzep/token/ERC721/ERC721.sol";
import "../openzep/access/Ownable.sol";

interface IEthemerals {
  function ownerOf(uint256 _tokenId) external view returns (address);
}

contract EthemeralEquipables is ERC721, Ownable {

  event DelegateChange(address indexed delegate, bool add);
  event AllowDelegatesChange(address indexed user, bool allow);

  // NFT TOKENOMICS
  // Only redeemable by certain Ethemerals
  // Items start at 10001
  string private _uri;
  IEthemerals nftContract;

  uint public itemSupply;
  uint public petSupply = 1;

  // Delegates include game masters and auction houses
  mapping (address => bool) public delegates;

  // Default to off. User needs to allow
  mapping (address => bool) private allowDelegates;

  constructor(string memory tUri, address _nftAddress) ERC721("Ethemerals - Equipables", "EQUIP") {
    _uri = tUri;
    nftContract = IEthemerals(_nftAddress);

    // mint the #0 to fix the maths
    _safeMint(msg.sender, 0);
  }

  /**
  * @dev Redeems pets, anyone can call, owner will receive
  * Calls internal _mintPet
  */
  function redeemPet(uint _id) external {
    _redeemPet(_id, nftContract.ownerOf(_id));
  }

  /**
  * @dev Mints a pet
  */
  function _redeemPet(uint _id, address recipient) internal {
    _safeMint(recipient, _id);
    petSupply ++;
  }

  /**
  * @dev mints items admin
  * Calls internal _mintPet
  */
  function mintItemsDelegate(uint _amount, address _recipient) external {
    require(delegates[msg.sender] == true, "delegates only");
    _mintItems(_amount, _recipient);
  }


  /**
  * @dev Mints items
  */
  function _mintItems(uint amount, address recipient) internal {
    for (uint i = 0; i < amount; i++) {
      _safeMint(recipient, itemSupply + 10001);
      itemSupply ++;
    }
  }



  /**
  * @dev Set or unset delegates
  */
  function setAllowDelegates(bool allow) external {
    allowDelegates[msg.sender] = allow;
    emit AllowDelegatesChange(msg.sender, allow);
  }

  // ADMIN ONLY FUNCTIONS
  /**
  * @dev mints items admin
  * Calls internal _mintPet
  */
  function mintItemsAdmin(uint _amount, address _recipient) external onlyOwner() { //admin
    _mintItems(_amount, _recipient);
  }

  function addDelegate(address _delegate, bool add) external onlyOwner() { //admin
    delegates[_delegate] = add;
    emit DelegateChange(_delegate, add);
  }

  function setBaseURI(string memory newuri) external onlyOwner() {// ADMIN
    _uri = newuri;
  }

  // VIEW ONLY
  function _baseURI() internal view override returns (string memory) {
    return _uri;
  }


  /**
  * @dev See {IERC721-isApprovedForAll}.
  * White list for game masters and auction house
  */
  function isApprovedForAll(address _owner, address _operator) public view override returns (bool) {
    if (allowDelegates[_owner] && (delegates[_operator] == true)) {
      return true;
    }

    return super.isApprovedForAll(_owner, _operator);
  }

}