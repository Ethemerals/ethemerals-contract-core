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
  event TokenRevived (uint indexed tokenId, uint reviver);
  event OwnershipTransferred(address previousOwner, address newOwner);

  struct Stake {
    address owner;
    uint8 priceFeedId;
    uint8 positionSize;
    uint startingPrice;
    bool long;
  }

  IEthemerals nftContract;
  IPriceFeed priceFeed;

  uint16 private atkDivMod = 3000; // lower number higher multiplier
  uint16 private defDivMod = 2200; // lower number higher multiplier
  uint16 private spdDivMod = 1000; // lower number higher multiplier

  uint32 private reviverReward = 250; //250 tokens

  address private admin;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = IEthemerals(_nftAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
  }

  /**
    * @dev
    * sends token to contract
    * requires price in range
    * creates stakes struct,
    */
  function createStake(uint _tokenId, uint8 _priceFeedId, uint8 _positionSize, bool long) external {
    uint price = priceFeed.getPrice(_priceFeedId);
    require(price > 10000 && price <= 1000000000, 'pbounds');
    require(_positionSize > 0 && _positionSize <= 255, 'bounds');
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, _positionSize, priceFeed.getPrice(_priceFeedId), long);
    emit StakeCreated(_tokenId, _priceFeedId, long);
  }

  /**
    * @dev
    * gets price and score change
    * returns token to owner
    *
    */
  function cancelStake(uint _tokenId) external {
    require(stakes[_tokenId].owner == msg.sender, 'only owner');
    require(nftContract.ownerOf(_tokenId) == address(this), 'only staked');
    (uint change, uint reward, bool win) = getChange(_tokenId);
    nftContract.safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId);
    nftContract.changeScore(_tokenId, uint16(change), win, uint32(reward)); // change in bps
    emit StakeCanceled(_tokenId, win);
  }

  /**
    * @dev
    * allows second token1 to revive token0 and take rewards
    * returns token1 to owner
    *
    */
  function reviveToken(uint _id0, uint _id1) external {
    require(nftContract.ownerOf(_id1) == msg.sender, 'only owner');
    require(nftContract.ownerOf(_id0) == address(this), 'only staked');
    // GET CHANGE
    Stake storage _stake = stakes[_id0];
    uint priceEnd = priceFeed.getPrice(_stake.priceFeedId);
    IEthemerals.Meral memory _meral = nftContract.getEthemeral(_id0);
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;
    uint change = _stake.positionSize * calcBps(_stake.startingPrice, priceEnd);
    change = ((change - (_meral.def * change / defDivMod)) ) / 1000; // BONUS ATK
    uint scoreBefore = _meral.score;

    require((win != true && scoreBefore <= (change + 20)), 'not dead');
    require(_meral.rewards > reviverReward, 'needs ELF');
    nftContract.safeTransferFrom(address(this), stakes[_id0].owner, _id0);
    nftContract.changeScore(_id0, uint16(scoreBefore - 100), win, 0); // reset scores to 100
    nftContract.changeRewards(_id0, reviverReward, false, 1);
    nftContract.changeRewards(_id1, reviverReward, true, 1);
    emit TokenRevived(_id0, _id1);
  }

  /**
    * @dev
    * gets price difference in bps
    * modifies the score change and rewards by atk/def/spd
    * atk increase winning score change, def reduces losing score change, spd increase rewards
    */
  function getChange(uint _tokenId) public view returns (uint, uint, bool) {
    Stake storage _stake = stakes[_tokenId];
    IEthemerals.Meral memory _meral = nftContract.getEthemeral(_tokenId);
    uint priceEnd = priceFeed.getPrice(_stake.priceFeedId);
    uint reward;
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;

    uint change = _stake.positionSize * calcBps(_stake.startingPrice, priceEnd);
    if(win) {
      change = (_meral.atk * change / atkDivMod + change) / 1000; // BONUS ATK
      // reward = (_meral.spd * change) / spdDivMod / 1000; // BONUS SPD
      reward = _meral.spd * change / spdDivMod; // DOESNT MATCH JS WHY????
    } else {
      change = ((change - (_meral.def * change / defDivMod)) ) / 1000; // BONUS ATK
    }
    return (change, reward, win);
  }

  function calcBps(uint _x, uint _y) public pure returns (uint) {
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

  function setReviverRewards(uint32 _reward) external onlyAdmin() { //admin
    reviverReward = _reward;
  }

  function setStatsDivMod(uint16 _atkDivMod, uint16 _defDivMod, uint16 _spdDivMod) external onlyAdmin() { //admin
    atkDivMod = _atkDivMod;
    defDivMod = _defDivMod;
    spdDivMod = _spdDivMod;
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