// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../openzep/token/ERC721/ERC721.sol";
import "../openzep/token/ERC20/IERC20.sol";
import "../openzep/access/Ownable.sol";

contract EthemeralsPets is ERC721, Ownable {

  event ChangeScore(uint tokenId, uint16 score, bool add, uint32 rewards);
  event ChangeRewards(uint tokenId, uint32 rewards, bool add, uint8 action);
  event PriceChange(uint price, bool inEth);
  event Mint(uint id, uint16 elf, uint8 atk, uint8 def, uint8 spd);
  event DelegateChange(address indexed delegate, bool add);
  event AllowDelegatesChange(address indexed user, bool allow);

  // NFT TOKENOMICS
  // Bonus Drops for Ethemeral Holders
  // max 10,000 Ethemerals Pets

  // Basic minimal struct for an Pet, addon contracts for inventory and stats
  struct Pet {
    uint16 score;
    uint32 rewards;
    uint8 atk;
    uint8 def;
    uint8 spd;
  }

  string private _uri;

  // Nonce used in random function
  uint private nonce;

  // MAX SUPPLY
  uint public maxEthemeralSupply = 10001; // #10000 last index, probably in 10 years :)
  // uint public maxEthemeralSupply = 11; // #test

  // CURRENT SUPPLY
  uint public ethemeralSupply = 1; // #0 skipped

  // AVAILABLE
  uint public maxAvailableIndex;

  // Mint price in ETH / ELF
  uint public mintPrice = 1*10**18; // change once deployed
  uint public mintPriceELF = 1000*10**18; // change once deployed

  // ELF at birth
  uint16 public startingELF = 1000; // need to * 10 ** 18

  // ELF ERC20 address
  address private tokenAddress;

  // Arrays of Ethemerals
  Pet[] private allPets;

  // Delegates include game masters and auction houses
  mapping (address => bool) private delegates;

    // Default to allows for better UX. User needs to allow
  mapping (address => bool) private allowDelegates;

  constructor(string memory tUri, address _tokenAddress) ERC721("Ethemerals Pets", "PETS") {
    _uri = tUri;
    tokenAddress = _tokenAddress;

    // mint the #0 to fix the maths
    _safeMint(msg.sender, 0);
    allPets.push(Pet(300, startingELF, 40, 30, 30));
    emit OwnershipTransferred(address(0), msg.sender);
  }


  /**
  * @dev Mints a Pet
  * Calls internal _mintEthemerals
  */
  function mintPet(address recipient, uint amountPets) payable external {
    require(maxAvailableIndex >= ethemeralSupply, "sale not active");
    require(amountPets < 25, "to much");
    require(msg.value >= mintPrice * amountPets, "not enough" );
    _mintPets(amountPets, recipient);
  }

  /**
  * @dev Mints a Pet
  * Calls internal _mintEthemerals
  */
  function mintPetWithELF(address recipient, uint amountPets) payable external {
    require(maxAvailableIndex >= ethemeralSupply, "sale not active");
    require(amountPets < 25, "to much");
    require(msg.value >= mintPrice * amountPets, "not enough" );
    _mintPets(amountPets, recipient);
  }


  /**
  * @dev Mints a Pet
  * sets score and startingELF
  * sets random [atk, def, spd]
  */
  function _mintPets(uint amountPets, address recipient) internal {
    for (uint i = 0; i < amountPets; i++) {
      _safeMint(recipient, ethemeralSupply);

      uint8 atk = uint8(_random(10, 61, nonce + 123)); // max 71
      nonce ++;

      uint8 def = uint8(_random(10, 80 - atk, nonce)); // max 90

      uint8 spd = 100 - atk - def;


      allPets.push(Pet(
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

  // GM FUNCTIONS

  /**
  * @dev Changes '_tokenId' score by 'offset' amount either 'add' or reduce.
  * clamps score > 0 and <= 1000
  * clamps ELF rewards amounts to something reasonable
  * delegates only
  */
  function changeScore(uint _tokenId, uint16 offset, bool add, uint32 amount) external {
    require(delegates[msg.sender] == true, "delegates only");
    require(_exists(_tokenId), "not exist");

    Pet storage tokenCurrent = allPets[_tokenId];

    uint16 _score = tokenCurrent.score;
    uint16 newScore;

    // safemaths
    if (add) {
      uint16 sum = _score + offset;
      newScore = sum > 1000 ? 1000 : sum;
    } else {
      if (_score <= offset) {
        newScore = 0;
      } else {
        newScore = _score - offset;
      }
    }

    tokenCurrent.score = newScore;
    uint32 amountClamped = amount > 10000 ? 10000 : amount; //clamp 10000 tokens
    tokenCurrent.rewards += amountClamped;

    nonce++;
    emit ChangeScore(_tokenId, newScore, add, amountClamped);
  }

  /**
    * @dev Changes '_tokenId' rewards by 'offset' amount either 'add' or reduce.
    * delegates only
  */
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external {
    require(delegates[msg.sender] == true, "delegates only");
    require(_exists(_tokenId), "not exist");

    Pet storage tokenCurrent = allPets[_tokenId];

    uint32 _rewards = tokenCurrent.rewards;
    uint32 newRewards;
    uint32 offsetClamped;

    // safemaths
    if (add) {
      offsetClamped = offset > 10000 ? 10000 : offset; //clamp 10000 tokens
      newRewards = _rewards + offsetClamped;
    } else {
      if (_rewards <= offset) {
        newRewards = 0;
      } else {
        newRewards = _rewards - offset;
      }
    }

    tokenCurrent.rewards = newRewards;

    nonce++;
    emit ChangeRewards(_tokenId, newRewards, add, action);
  }


  // ADMIN ONLY FUNCTIONS

  // reserve 5 for founders + 5 for give aways
  function mintReserve() external onlyOwner() { //admin
    maxAvailableIndex = 10;
    _mintPets(10, msg.sender);
  }

  function withdraw(address payable to) external onlyOwner() { //admin
    to.transfer(address(this).balance);
  }

  function withdrawELF(address payable to) external onlyOwner() { //admin
    IERC20(tokenAddress).transferFrom(address(this), to, IERC20(tokenAddress).balanceOf(address(this)));
  }

  function setPrice(uint _price, bool inEth) external onlyOwner() { //admin
    if(inEth) {
      mintPrice = _price;
    } else {
      mintPriceELF = _price;
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


  // VIEW ONLY
  function _random(uint min, uint max, uint _nonce) private view returns(uint) {
    return (uint(keccak256(abi.encodePacked(_nonce, block.number, block.difficulty, msg.sender))) % max) + min;
  }

  function _baseURI() internal view override returns (string memory) {
    return _uri;
  }

  function getEthemeral(uint _tokenId) external view returns(Pet memory) {
    return allPets[_tokenId];
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