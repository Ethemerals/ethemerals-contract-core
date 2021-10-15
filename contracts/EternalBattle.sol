// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../openzep/token/ERC721/utils/ERC721Holder.sol";


interface IEthemerals {

  struct Meral {
    uint16 score;
    uint32 rewards;
    uint16 atk;
    uint16 def;
    uint16 spd;
  }

  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function ownerOf(uint256 _tokenId) external view returns (address);
  function changeScore(uint _tokenId, uint16 offset, bool add, uint32 amount) external;
  function changeRewards(uint _tokenId, uint32 offset, bool add, uint8 action) external;
  function getEthemeral(uint _tokenId) external view returns(Meral memory);
}

interface IPriceFeed {
  function getPrice(uint8 _id) external view returns (uint);
}

contract EternalBattle is ERC721Holder {

  event StakeCreated (uint indexed tokenId, uint priceFeedId, bool long);
  event StakeCanceled (uint indexed tokenId, bool win);
  event TokenRevived (uint indexed tokenId, bool reap, uint reviver, address reviverOwner);
  event OwnershipTransferred(address previousOwner, address newOwner);


  struct Stake {
    address owner;
    uint8 priceFeedId;
    uint16 positionSize;
    uint startingPrice;
    bool long;
  }

  IEthemerals nftContract;
  IPriceFeed priceFeed;

  uint public reviverScorePenalty = 25;
  uint public reviverTokenReward = 1000*10**18; //1000 tokens
  uint private participationReward = 100*10**18; //100 tokens
  address private admin;

  uint8 public value0;
  uint public value1;
  bool public value2;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;
  mapping (uint => address) private stakesTemp;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = IEthemerals(_nftAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
  }

  function createStake(uint _tokenId, uint8 _priceFeedId, uint16 _positionSize, bool long) external {
    require(_positionSize > 99 && _positionSize <= 20000, 'bounds'); // TURN OFF FOR MOCK TODO
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, _positionSize, priceFeed.getPrice(_priceFeedId), long);
    emit StakeCreated(_tokenId, _priceFeedId, long);
  }

  function cancelStake(uint _tokenId) external {
    require(stakes[_tokenId].owner == msg.sender, 'only owner');
    require(nftContract.ownerOf(_tokenId) == address(this), 'only staked');
    (uint change, bool win) = getChange(_tokenId);
    value1 = change;
    value2 = win;
    nftContract.safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId);
    // nftContract.changeScore(_id, change, win, win ? change * 4 * 10**18 : participationReward); // change in bps
    emit StakeCanceled(_tokenId, win);
  }

  // function reviveToken(uint _id0, uint _id1, bool reap) external {
  //   require(nftContract.ownerOf(_id1) == msg.sender, 'only owner');
  //   require(nftContract.ownerOf(_id0) == address(this), 'only staked');
  //   (uint change, bool win) = getChange(_id0);
  //   uint scoreBefore = nftContract.getCoinScore(_id0);
  //   require((win != true && scoreBefore <= (change + 20)), 'not dead');
  //   nftContract.safeTransferFrom(address(this), reap ? msg.sender : stakes[_id0].owner, _id0); // take owne0rship or return ownership
  //   nftContract.changeScore(_id0, scoreBefore - 50, false, participationReward); // revive with 50 hp
  //   nftContract.changeScore(_id1, reap ? reviverScorePenalty * 2 : reviverScorePenalty, false, reap ? participationReward : reviverTokenReward); // reaper minus 2x points and add rewards
  //   emit TokenRevived(_id0, reap, _id1, msg.sender);
  // }

  function getChange(uint _tokenId) public view returns (uint, bool) {
    Stake storage _stake = stakes[_tokenId];
    uint priceEnd = priceFeed.getPrice(_stake.priceFeedId);
    uint change = _stake.positionSize * calcBps(_stake.startingPrice, priceEnd) / 10;
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;
    return (change, win);
  }

  function calcBps(uint _x, uint _y) public pure returns (uint) {
    // uint _x = x > 10**12 ? x / 10**8 : x;
    // uint _y = y > 10**12 ? y / 10**8: y;
    // 1000 = 10% 100 = 1% 10 = 0.1% 1 = 0.01%
    return _x < _y ? (_y - _x) * 10000 / _x : (_x - _y) * 10000 / _y;
  }

  function getStake(uint _tokenId) external view returns (Stake memory) {
    return stakes[_tokenId];
  }

  function cancelStakeAdmin(uint _tokenId) external onlyAdmin() { //admin
    nftContract.safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId);
    emit StakeCanceled(_tokenId, false);
  }

  function setReviverRewards(uint _score, uint _token) external onlyAdmin() { //admin
    reviverScorePenalty = _score;
    reviverTokenReward = _token;
  }

  function transferOwnership(address newAdmin) external onlyAdmin() { //admin
    admin = newAdmin;
    emit OwnershipTransferred(admin, newAdmin);
  }

  function setPriceFeedContract(address _pfAddress) external onlyAdmin() { //admin
    priceFeed = IPriceFeed(_pfAddress);
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'admin only');
    _;
  }

}