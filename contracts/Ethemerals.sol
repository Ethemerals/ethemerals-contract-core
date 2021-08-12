// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../openzep/token/ERC721/ERC721.sol";
import "../openzep/token/ERC20/IERC20.sol";

contract Ethemerals is ERC721 {

  event OwnershipTransferred(address previousOwner, address newOwner);
  event PriceChange(uint price, bool inEth);
  event Mint(uint id, uint16 elf, uint8 atk, uint8 def, uint8 spd);
  event DelegateChange(address indexed delegate, bool add);
  event DisallowDelegatesChange(address indexed user, bool disallow);

  // NFT TOKENOMICS
  // 1-1000 intial sale of 'Ethemerals'
  // max 10,000 Ethemerals

  // Basic minimal struct for an Ethemeral, addon contracts for inventory and stats
  struct Meral {
    uint16 score;
    uint16 rewards;
    uint8 atk;
    uint8 def;
    uint8 spd;
  }

  string private contractUri;
  string private _uri;

  // Nonce used in random function
  uint private nonce;

  // MAX SUPPLY
  uint public maxEthemeralSupply = 10001; // #10000 last index

  // CURRENT SUPPLY
  uint public ethemeralSupply = 1; // #0 skipped

  // AVAILABLE
  uint public maxPurchase = 5;
  uint public maxAvailableEthemerals;


  // Mint price in ETH
  uint public mintPrice = 100*10**18; // change once deployed
  // Min tokens needed for discount
  uint public discountMinTokens = 2000*10**18; // 2000 tokens
  // ELF at birth
  uint16 public startingELF = 2000; // need to * 10 ** 18

  address public admin;

  // ELF ERC20 address
  address public tokenAddress;

  // iterable array of available cmIds
  uint[] private availableCmIds;

  // Arrays of Ethemerals
  Meral[] public allEthemerals;

  // Delegates include game masters and auction houses
  mapping (address => bool) private delegates;

  // Default to allows for better UX. User needs to disallow
  mapping (address => bool) private disallowDelegates;

  constructor(string memory tUri, string memory cUri, address _tokenAddress) ERC721("Ethemerals", "MERALS") {
    admin = msg.sender;
    _uri = tUri;
    contractUri = cUri;
    tokenAddress = _tokenAddress;

    // mint the #0 to fix the maths
    _safeMint(msg.sender, 0);
    allEthemerals.push(Meral(1000, startingELF, 100, 100, 100));
  }


  /**
  * @dev Mints an Ethemeral
  * Calls internal _mintEthemerals
  */
  function mintEthemeral(uint numOfTokens, address recipient) payable external {
    require(numOfTokens <= maxPurchase && numOfTokens > 0, "minting to much");
    require(maxAvailableEthemerals - numOfTokens >= ethemeralSupply, "sale not active");
    require(ethemeralSupply + numOfTokens <= maxEthemeralSupply, "supply will exceed");
    require(msg.value >= mintPrice * numOfTokens ||
      IERC20(tokenAddress).balanceOf(msg.sender) >= discountMinTokens &&
      msg.value >= ((mintPrice * numOfTokens) - ((mintPrice * numOfTokens) / 4)), "not enough" );
    _mintEthemerals(numOfTokens, recipient);
  }

  /**
  * @dev Mints an Ethemeral
  * sets score and startingELF
  * sets random [atk, def, spd]
  */
  function _mintEthemerals(uint amountMerals, address recipient) internal {
    for (uint i = 0; i < amountMerals; i++) {
      _safeMint(recipient, ethemeralSupply);
      uint8 atk = uint8(_random(78, nonce + 123));
      nonce ++;
      uint8 spd = uint8(_random(100 - atk, nonce * 2));
      uint8 def = 100 - atk - spd;
      allEthemerals.push(Meral(
        300,
        startingELF,
        atk < 8 ? atk*2+1 : atk,
        def < 8 ? def*2+1 : def,
        spd < 8 ? spd*2+1 : spd
      ));
      ethemeralSupply ++;
      emit Mint(
        ethemeralSupply,
        startingELF,
        atk < 8 ? atk*2+1 : atk,
        def < 8 ? def*2+1 : def,
        spd < 8 ? spd*2+1 : spd
      );
    }
  }


  /**
  * @dev Set or unset delegates
  * setting true will disallow delegates
  */
  function setDisallowDelegates(bool disallow) external {
    disallowDelegates[msg.sender] = disallow;
    emit DisallowDelegatesChange(msg.sender, disallow);
  }


  // ADMIN ONLY FUNCTIONS

  // reserve 5 for founders
  function mintReserve() external onlyAdmin() { //admin
    maxAvailableEthemerals = 5;
    _mintEthemerals(5, msg.sender);
  }

  function withdraw(address payable to) external onlyAdmin() { //admin
    to.transfer(address(this).balance);
  }

  function setPrice(uint _price, bool inEth) external onlyAdmin() { //admin
    if(inEth) {
      mintPrice = _price;
    } else {
      discountMinTokens = _price;
    }
    emit PriceChange(_price, inEth);
  }

  function setMaxAvailableEthemerals(uint _id) external onlyAdmin() { //admin
    require(_id <= maxEthemeralSupply, "max supply"); // +1
    maxAvailableEthemerals = _id;
  }

  function addDelegate(address _delegate, bool add) external onlyAdmin() { //admin
    delegates[_delegate] = add;
    emit DelegateChange(_delegate, add);
  }

  function transferOwnership(address newAdmin) external onlyAdmin() { // ADMIN
    emit OwnershipTransferred(admin, newAdmin);
    admin = newAdmin;
  }

  function setBaseURI(string memory newuri) external onlyAdmin() {// ADMIN
    _uri = newuri;
  }

  function setContractURI(string memory _cUri) external onlyAdmin() {// ADMIN
    contractUri = _cUri;
  }


  // VIEW ONLY
  function _random(uint max, uint _nonce) private view returns(uint) {
    return uint(keccak256(abi.encodePacked(_nonce, block.number, block.difficulty, msg.sender))) % max;
  }

  function _baseURI() internal view override returns (string memory) {
    return _uri;
  }

  function contractURI() public view returns (string memory) {
    return contractUri;
  }

  function getEthemeral(uint _tokenId) external view returns(Meral memory) {
    return allEthemerals[_tokenId];
  }

  /**
  * @dev See {IERC721-isApprovedForAll}.
  * White list for game masters and auction house
  */
  function isApprovedForAll(address owner, address operator) public view override returns (bool) {
    if (!disallowDelegates[owner] && (delegates[operator] == true)) {
      return true;
    }

    return super.isApprovedForAll(owner, operator);
  }


  modifier onlyAdmin() {
    require(msg.sender == admin, 'only admin');
    _;
  }

}