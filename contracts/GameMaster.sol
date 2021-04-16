// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "../openzep/token/ERC1155/utils/ERC1155Holder.sol";
// 0x19f8b90D0448dad99D0968545e87651a96F699F6

interface ICryptoCoins {
  function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
  function balanceOf(address account, uint256 id) external view returns (uint256);
  function changeScore(uint _tokenId, uint offset, bool add, uint amount) external;
  function getCoinScore(uint _tokenId) external view returns (uint256);
}

interface IPriceFeed {
  function getPrice(uint _id) external view returns (uint);
}

contract GameMaster is ERC1155Holder {

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

  ICryptoCoins nftContract;
  IPriceFeed priceFeed;

  uint public reviverScorePenalty = 25;
  uint public reviverTokenReward = 100000000000000000000;
  address private admin;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = ICryptoCoins(_nftAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
  }

  function createStake(uint _tokenId, uint _priceFeedId, uint _position, bool long) external {
    // require(_position > 0 && _position < 40000); // TURN OFF FOR MOCK
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId, 1, '');
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, priceFeed.getPrice(_priceFeedId), _position, long);
    emit StakeCreated(_tokenId, msg.sender, _priceFeedId);
  }

  function cancelStake(uint _id) external {
    require(stakes[_id].owner == msg.sender, 'only owner');
    require(nftContract.balanceOf(address(this), _id) > 0, 'only staked');
    (uint change, bool win) = getChange(_id);
    nftContract.safeTransferFrom(address(this), stakes[_id].owner, _id, 1, '');
    nftContract.changeScore(_id, change, win, win ? change * 2 * 10**18 : 10**18);
    emit StakeCanceled(_id, msg.sender, stakes[_id].priceFeedId);
  }

  function reviveToken(uint _id0, uint _id1, bool reap) external {
    require(nftContract.balanceOf(msg.sender, _id1) > 0, 'only owner');
    require(nftContract.balanceOf(address(this), _id0) > 0, 'only staked');
    (uint change, bool win) = getChange(_id0);
    uint scoreBefore = nftContract.getCoinScore(_id0);
    require((win != true && scoreBefore <= (change + 20)), 'not dead');
    nftContract.safeTransferFrom(address(this), reap ? msg.sender : stakes[_id0].owner, _id0, 1, ''); // take owne0rship or return ownership
    nftContract.changeScore(_id0, scoreBefore - 50, false, 10**18); // revive with 50
    nftContract.changeScore(_id1, reap ? reviverScorePenalty * 2 : reviverScorePenalty, false, reap ? 10**18 : reviverTokenReward * 10**18); // reaper minus 2x points and add rewards
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

  function cancelStakeAdmin(uint _id) external {
    require(msg.sender == admin, 'admin only');
    nftContract.safeTransferFrom(address(this), stakes[_id].owner, _id, 1, '');
    emit StakeCanceled(_id, stakes[_id].owner, stakes[_id].priceFeedId);
  }

  function setReviverRewards(uint _score, uint _token) external {
    require(msg.sender == admin, 'admin only');
    reviverScorePenalty = _score;
    reviverTokenReward = _token;
  }

  function transferOwnership(address newAdmin) external {
    require(msg.sender == admin, 'admin only');
    emit OwnershipTransferred(admin, newAdmin);
    admin = newAdmin;
  }

  function setPriceFeed(address _pfAddress) external {
    require(msg.sender == admin, 'admin only');
    priceFeed = IPriceFeed(_pfAddress);
  }

}