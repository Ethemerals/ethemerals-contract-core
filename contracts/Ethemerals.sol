// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../openzep/token/ERC721/ERC721.sol";
import "../openzep/token/ERC20/IERC20.sol";
import "../openzep/access/Ownable.sol";

contract Ethemerals is ERC721, Ownable {

  event PriceChange(uint price, bool inEth);
  event Mint(uint id, uint16 elf, uint8 atk, uint8 def, uint8 spd);
  event DelegateChange(address indexed delegate, bool add);
  event AllowDelegatesChange(address indexed user, bool allow);

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
  uint public maxEthemeralSupply = 10001; // #10000 last index, probably in 10 years
  // uint public maxEthemeralSupply = 11; // #test

  // CURRENT SUPPLY
  uint public ethemeralSupply = 1; // #0 skipped

  // AVAILABLE
  uint public maxAvailableIndex;


  // Mint price in ETH
  uint public mintPrice = 1*10**18; // change once deployed
  // Min tokens needed for discount
  uint public discountMinTokens = 2000*10**18; // 2000 tokens
  // ELF at birth
  uint16 public startingELF = 2000; // need to * 10 ** 18


  // ELF ERC20 address
  address private tokenAddress;

  // iterable array of available cmIds
  uint[] private availableCmIds;

  // Arrays of Ethemerals
  Meral[] private allEthemerals;

  // Delegates include game masters and auction houses
  mapping (address => bool) private delegates;

    // Default to allows for better UX. User needs to allow
  mapping (address => bool) private allowDelegates;

  constructor(string memory tUri, string memory cUri, address _tokenAddress) ERC721("Ethemerals", "MERALS") {
    _uri = tUri;
    contractUri = cUri;
    tokenAddress = _tokenAddress;

    // mint the #0 to fix the maths
    _safeMint(msg.sender, 0);
    allEthemerals.push(Meral(300, startingELF, 40, 30, 30));
    emit OwnershipTransferred(address(0), msg.sender);
  }


  /**
  * @dev Mints an Ethemeral
  * Calls internal _mintEthemerals
  */
  function mintEthemeral(address recipient) payable external {
    require(maxAvailableIndex >= ethemeralSupply, "sale not active");
    require(
      msg.value >= mintPrice ||
      IERC20(tokenAddress).balanceOf(msg.sender) >= discountMinTokens &&
      msg.value >= ((mintPrice) - (mintPrice / 10)), "not enough" ); // 10% discount
    _mintEthemerals(1, recipient);
  }

  /**
  * @dev Mints an Ethemeral
  * Calls internal _mintEthemerals
  */
  function mintEthemerals(address recipient) payable external {
    require(maxAvailableIndex - 2 >= ethemeralSupply, "sale not active");
    uint tier3MintPrice = (mintPrice * 3 - ((mintPrice * 3) / 10)); // 10% discount
    require(
      msg.value >= tier3MintPrice ||
      IERC20(tokenAddress).balanceOf(msg.sender) >= discountMinTokens &&
      msg.value >= ((tier3MintPrice) - (tier3MintPrice / 10)), "not enough" ); // 10% discount
    _mintEthemerals(3, recipient);
  }

  /**
  * @dev Mints an Ethemeral
  * sets score and startingELF
  * sets random [atk, def, spd]
  */
  function _mintEthemerals(uint amountMerals, address recipient) internal {
    for (uint i = 0; i < amountMerals; i++) {
      _safeMint(recipient, ethemeralSupply);

      uint8 atk = uint8(_random(10, 60, nonce + 123)); // max 70
      nonce ++;

      uint8 def = uint8(_random(10, 80 - atk, nonce)); // max 80

      uint8 spd = 100 - atk - def;


      allEthemerals.push(Meral(
        300,
        startingELF,
        atk,
        def,
        spd
      ));

      emit Mint(
        ethemeralSupply,
        startingELF,
        atk,
        def,
        spd
      );

      ethemeralSupply ++;
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

  // reserve 5 for founders
  function mintReserve() external onlyOwner() { //admin
    maxAvailableIndex = 5;
    _mintEthemerals(5, msg.sender);
  }

  function withdraw(address payable to) external onlyOwner() { //admin
    to.transfer(address(this).balance);
  }

  function setPrice(uint _price, bool inEth) external onlyOwner() { //admin
    if(inEth) {
      mintPrice = _price;
    } else {
      discountMinTokens = _price;
    }
    emit PriceChange(_price, inEth);
  }

  function setMaxAvailableIndex(uint _id) external onlyOwner() { //admin
    require(_id < maxEthemeralSupply, "max supply");
    maxAvailableIndex = _id;
  }

  function addDelegate(address _delegate, bool add) external onlyOwner() { //admin
    delegates[_delegate] = add;
    emit DelegateChange(_delegate, add);
  }

  function setBaseURI(string memory newuri) external onlyOwner() {// ADMIN
    _uri = newuri;
  }

  function setContractURI(string memory _cUri) external onlyOwner() {// ADMIN
    contractUri = _cUri;
  }


  // VIEW ONLY
  function _random(uint min, uint max, uint _nonce) private view returns(uint) {
    return (uint(keccak256(abi.encodePacked(_nonce, block.number, block.difficulty, msg.sender))) % max) + min;
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

  function totalSupply() public view returns (uint256) {
      return ethemeralSupply;
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