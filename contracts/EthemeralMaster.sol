// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;


interface IERC20 {
  function balanceOf(address account) external view returns (uint256);
}

interface IEthemerals {
  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function ownerOf(uint256 _tokenId) external view returns (address);
  function changeScore(uint _tokenId, uint offset, bool add, uint amount) external;
  function getCoinScore(uint _tokenId) external view returns (uint256);
  function mint(address to, uint256 id) external;
}

contract EthemeralMaster {

  event OwnershipTransferred(address previousOwner, address newOwner);
  event ChangeScore(uint indexed tokenId, uint score, bool add, uint rewards);
  event DelegateChange(address indexed delegate, bool add);
  event PriceChange(uint price, bool inEth);
  event Resurrection(uint tokenId, bool inEth);
  event Redemption(uint tokenId, bool fromToken);
  event DisallowDelegatesChange(address indexed user, bool disallow);

  IEthemerals nftContract;
  IERC20 tokenContract;
  address private admin;

  struct Coin {
    uint id;
    uint score;
    uint rewards;
  }

  uint private nonce;
  uint public mintPrice = 100*10**18;
  uint public revivePrice = 1000*10**18; //1000 tokens
  uint public discountAmount = 2000*10**18; //2000 tokens
  uint public initRewards = 1000*10**18; //1000 tokens

  // iterable array of available classes
  uint[] private availableCoins;

  // mapping of classes to edition (holds all the classes and editions)
  mapping (uint => Coin[]) private coinEditions;

  constructor(address _nftAddress, address _tokenAddress) {
    admin = msg.sender;
    nftContract = IEthemerals(_nftAddress);
    tokenContract = IERC20(_tokenAddress);
  }

  // buys a random token from available class
  function buy() payable external {
    require(msg.value >= mintPrice || (tokenContract.balanceOf(msg.sender) >= discountAmount && msg.value >= (mintPrice - mintPrice/4)), "not enough"); // discount 2000 rewards
    _mintAvailableToken(msg.sender);
  }

  function _mintAvailableToken(address to) private {
    uint randCoinClass;
    uint edition;

    while(availableCoins.length > 0) {
      randCoinClass = _random(availableCoins.length);
      edition = coinEditions[availableCoins[randCoinClass]].length;

      if (edition < 10) {
        uint _tokenId = availableCoins[randCoinClass] * 10 + edition;
        coinEditions[availableCoins[randCoinClass]].push(Coin(_tokenId, 300, initRewards)); // 1000 rewards
        nftContract.mint(to, _tokenId);
        nonce++;
        return;
      } else {
        // no more editions
        _reduceAvailableCoins(randCoinClass);
      }
    }

    revert("no more");
  }

  function _reduceAvailableCoins(uint coinToRemove) private {
    uint[] memory newAvailableCoins = new uint[](availableCoins.length - 1);
    uint j;
    for(uint i = 0; i < availableCoins.length; i ++) {
      if(i != coinToRemove) {
        newAvailableCoins[j] = availableCoins[i];
        j++;
      }
    }
    availableCoins = newAvailableCoins;
  }

  function _random(uint max) private view returns(uint) {
    return uint(keccak256(abi.encodePacked(nonce, block.number, block.difficulty, msg.sender))) % max;
  }

  // ADMIN ONLY FUNCTIONS
  function setAvailableCoin(uint _id) external onlyAdmin() { //admin
    availableCoins.push(_id);
  }

  function setAvailableCoins(uint[] memory _ids ) external onlyAdmin() { //admin
    availableCoins = _ids;
  }

  function setPrice(uint _price, bool inEth) external onlyAdmin() { //admin
    if(inEth) {
      mintPrice = _price;
    } else {
      revivePrice = _price;
    }
    emit PriceChange(_price, inEth);
  }

  function setAmounts(uint amount, bool discount) external onlyAdmin() {
    if(discount) {
      discountAmount = amount;
    } else {
      initRewards = amount;
    }
  }

  function withdraw(address payable to) external onlyAdmin() { //admin
    to.transfer(address(this).balance);
  }

  function transferOwnership(address newAdmin) external onlyAdmin() { //admin
    admin = newAdmin;
    emit OwnershipTransferred(admin, newAdmin);
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'admin only');
    _;
  }


}