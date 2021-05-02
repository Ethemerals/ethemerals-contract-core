// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/utils/ERC721Holder.sol";
import "../openzep/token/ERC721/utils/ERC721Holder.sol";


interface IEthemerals {
  function safeTransferFrom(address from, address to, uint256 tokenId) external;
  function ownerOf(uint256 _tokenId) external view returns (address);
  function changeScore(uint _tokenId, uint offset, bool add, uint amount) external;
  function getCoinScore(uint _tokenId) external view returns (uint256);
  function mintPrice() external view returns (uint256);
}

interface IPriceFeed {
  function getPrice(uint _id) external view returns (uint);
}

contract EternalBattle is ERC721Holder {

  event StakeCreated (uint indexed tokenId, address indexed owner, uint priceFeedId);
  event StakeCanceled (uint indexed tokenId, address indexed owner, uint priceFeedId);
  event TokenRevived (uint indexed tokenId, bool indexed reap, address indexed reviverOwner, uint reviver);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);


  struct Stake {
    address owner;
    uint priceFeedId;
    uint startingPrice;
    uint position;
    bool long;
  }

  IEthemerals nftContract;
  IPriceFeed priceFeed;

  uint public reviverScorePenalty = 25;
  uint public reviverTokenReward = 1000*10**18; //1000 tokens
  uint private participationReward = 100*10**18; //100 tokens
  address private admin;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = IEthemerals(_nftAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
  }

  function createStake(uint _tokenId, uint _priceFeedId, uint _position, bool long) external {
    require(_position > 0 && _position <= 20000); // TURN OFF FOR MOCK TODO
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, priceFeed.getPrice(_priceFeedId), _position, long);
    emit StakeCreated(_tokenId, msg.sender, _priceFeedId);
  }

  function cancelStake(uint _id) external {
    require(stakes[_id].owner == msg.sender, 'only owner');
    require(nftContract.ownerOf(_id) == address(this), 'only staked');
    (uint change, bool win) = getChange(_id);
    nftContract.safeTransferFrom(address(this), stakes[_id].owner, _id);
    nftContract.changeScore(_id, change, win, win ? change * 4 * 10**18 : participationReward); // change in bps
    emit StakeCanceled(_id, msg.sender, stakes[_id].priceFeedId);
  }

  function reviveToken(uint _id0, uint _id1, bool reap) external {
    require(nftContract.ownerOf(_id1) == msg.sender, 'only owner');
    require(nftContract.ownerOf(_id0) == address(this), 'only staked');
    (uint change, bool win) = getChange(_id0);
    uint scoreBefore = nftContract.getCoinScore(_id0);
    require((win != true && scoreBefore <= (change + 20)), 'not dead');
    nftContract.safeTransferFrom(address(this), reap ? msg.sender : stakes[_id0].owner, _id0); // take owne0rship or return ownership
    nftContract.changeScore(_id0, scoreBefore - 50, false, participationReward); // revive with 50 hp
    nftContract.changeScore(_id1, reap ? reviverScorePenalty * 2 : reviverScorePenalty, false, reap ? participationReward : reviverTokenReward); // reaper minus 2x points and add rewards
    emit TokenRevived(_id0, reap, msg.sender, _id1);
  }

  function getChange(uint _tokenId) public view returns (uint, bool) {
    Stake storage _stake = stakes[_tokenId];
    uint priceEnd = priceFeed.getPrice(_stake.priceFeedId);
    uint change = _stake.position * calcBps(_stake.startingPrice, priceEnd) / 10000;
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;
    return (change, win);
  }

  function calcBps(uint x, uint y) public pure returns (uint) {
    uint _x = x > 10**12 ? x / 10**8 : x;
    uint _y = y > 10**12 ? y / 10**8: y;
    return _x > _y ? (_x - _y) * 10000 / _x : (_y - _x) * 10000 / _y ;
  }

  function getStake(uint _id) external view returns (Stake memory) {
    return stakes[_id];
  }

  function cancelStakeAdmin(uint _id) external onlyAdmin() { //admin
    nftContract.safeTransferFrom(address(this), stakes[_id].owner, _id);
    emit StakeCanceled(_id, stakes[_id].owner, stakes[_id].priceFeedId);
  }

  function setReviverRewards(uint _score, uint _token) external onlyAdmin() { //admin
    reviverScorePenalty = _score;
    reviverTokenReward = _token;
  }

  function transferOwnership(address newAdmin) external onlyAdmin() { //admin
    admin = newAdmin;
    emit OwnershipTransferred(admin, newAdmin);
  }

  function setPriceFeed(address _pfAddress) external onlyAdmin() { //admin
    priceFeed = IPriceFeed(_pfAddress);
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'admin only');
    _;
  }

}