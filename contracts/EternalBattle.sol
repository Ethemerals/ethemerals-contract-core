// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// import "@openzeppelin/contracts@4.3.2/token/ERC721/utils/ERC721Holder.sol";
import "../openzep/token/ERC721/utils/ERC721Holder.sol";
import "./IPriceFeedProvider.sol";
import "./IEthemerals.sol";


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

  struct GamePair {
    bool active;
    uint16 longs;
    uint16 shorts;
  }

  IEthemerals nftContract;
  IPriceFeedProvider priceFeed;

  uint16 public atkDivMod = 1800; // lower number higher multiplier
  uint16 public defDivMod = 1400; // lower number higher multiplier
  uint16 public spdDivMod = 400; // lower number higher multiplier
  uint32 public reviverReward = 500; //500 tokens

  address private admin;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;

  // mapping of active longs/shorts to priceIds
  mapping (uint8 => GamePair) private gamePairs;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = IEthemerals(_nftAddress);
    priceFeed = IPriceFeedProvider(_priceFeedAddress);
  }

  /**
    * @dev
    * sends token to contract
    * requires price in range
    * creates stakes struct,
    */
  function createStake(uint _tokenId, uint8 _priceFeedId, uint8 _positionSize, bool long) external {
    require(gamePairs[_priceFeedId].active, 'not active');
    uint price = uint(priceFeed.getLatestPrice(_priceFeedId));
    require(price > 10000, 'pbounds');
    require(_positionSize > 25 && _positionSize <= 255, 'bounds');
    IEthemerals.Meral memory _meral = nftContract.getEthemeral(_tokenId);
    require(_meral.rewards > reviverReward, 'needs ELF');
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId);
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, _positionSize, price, long);

    _changeGamePair(_priceFeedId, long, true);
    emit StakeCreated(_tokenId, _priceFeedId, long);
  }


  /**
    * @dev
    * adds / removes long shorts
    * does not check underflow should be fine
    */
  function _changeGamePair(uint8 _priceFeedId, bool _long, bool _stake) internal {
    GamePair memory _gamePair  = gamePairs[_priceFeedId];
    if(_long) {
      gamePairs[_priceFeedId].longs = _stake ? _gamePair.longs + 1 : _gamePair.longs -1;
    } else {
      gamePairs[_priceFeedId].shorts = _stake ? _gamePair.shorts + 1 : _gamePair.shorts -1;
    }
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

    _changeGamePair(stakes[_tokenId].priceFeedId, stakes[_tokenId].long, false);
    emit StakeCanceled(_tokenId, win);
  }

  /**
    * @dev
    * allows second token1 to revive token0 and take rewards
    * returns token1 to owner
    *
    */
  function reviveToken(uint _id0, uint _id1) external {
  require(nftContract.ownerOf(_id0) == address(this), 'only staked');
    require(nftContract.ownerOf(_id1) == msg.sender, 'only owner');
    // GET CHANGE
    Stake storage _stake = stakes[_id0];
    uint priceEnd = uint(priceFeed.getLatestPrice(_stake.priceFeedId));
    IEthemerals.Meral memory _meral = nftContract.getEthemeral(_id0);
    uint change = _stake.positionSize * calcBps(_stake.startingPrice, priceEnd);
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;
    change = ((change - (_meral.def * change / defDivMod)) ) / 1000; // BONUS DEF
    uint scoreBefore = _meral.score;

    require((win != true && scoreBefore <= (change + 35)), 'not dead');
    nftContract.safeTransferFrom(address(this), stakes[_id0].owner, _id0);

    if(scoreBefore < 100) {
      nftContract.changeScore(_id0, uint16(100 - scoreBefore), true, 0); // reset scores to 100 // ###BUG can be NEGATIVE FIXED
    } else {
      nftContract.changeScore(_id0, uint16(scoreBefore - 100), false, 0); // reset scores to 100 // ###BUG can be NEGATIVE FIXED
    }

    nftContract.changeRewards(_id0, reviverReward, false, 1);
    nftContract.changeRewards(_id1, reviverReward, true, 1);

    _changeGamePair(_stake.priceFeedId, _stake.long, false);
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
    uint priceEnd = uint(priceFeed.getLatestPrice(_stake.priceFeedId));
    uint reward;
    bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;

    uint change = _stake.positionSize * calcBps(_stake.startingPrice, priceEnd);
    if(win) {
      change = (_meral.atk * change / atkDivMod + change) / 1000; // BONUS ATK
      // reward = (_meral.spd * change) / spdDivMod / 1000; // BONUS SPD
      uint16 longs = gamePairs[stakes[_tokenId].priceFeedId].longs;
      uint16 shorts = gamePairs[stakes[_tokenId].priceFeedId].shorts;
      uint counterTradeBonus = 1;
      if(!_stake.long && longs > shorts) {
        counterTradeBonus = longs / shorts;
      }
      if(_stake.long && shorts > longs) {
        counterTradeBonus = shorts / longs;
      }
      counterTradeBonus = counterTradeBonus > 5 ? 5 : counterTradeBonus;
      reward = (_meral.spd * change / spdDivMod) * counterTradeBonus;

    } else {
      change = ((change - (_meral.def * change / defDivMod)) ) / 1000; // BONUS DEF
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

  function getGamePair(uint8 _gameIndex) external view returns (GamePair memory) {
    return gamePairs[_gameIndex];
  }

  function resetGamePair(uint8 _gameIndex, bool _active) external onlyAdmin() { //admin
    gamePairs[_gameIndex].active = _active;
    gamePairs[_gameIndex].longs = 0;
    gamePairs[_gameIndex].shorts = 0;
  }

  function cancelStakeAdmin(uint _tokenId) external onlyAdmin() { //admin
    nftContract.safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId);

    _changeGamePair(stakes[_tokenId].priceFeedId, stakes[_tokenId].long, false);
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
    priceFeed = IPriceFeedProvider(_pfAddress);
  }

  modifier onlyAdmin() {
    require(msg.sender == admin, 'admin only');
    _;
  }

}