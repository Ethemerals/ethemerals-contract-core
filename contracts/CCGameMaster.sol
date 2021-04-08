// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/utils/ERC1155Holder.sol";

// import "../openzep/token/ERC1155/IERC1155.sol";
import "../openzep/token/ERC1155/utils/ERC1155Holder.sol";

interface IERC1155 {
  function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
  function balanceOf(address account, uint256 id) external view returns (uint256);
  function changeScore(uint _tokenId, uint offset, bool add, uint amount) external;
  function getCoinScore(uint _tokenId) external view returns (uint256);
}

interface AggregatorV3Interface {

  function decimals()
    external
    view
    returns (
      uint8
    );

  function latestRoundData() external view returns (
      uint80 roundId,
      int256 answer,
      uint256 startedAt,
      uint256 updatedAt,
      uint80 answeredInRound
    );
}

contract CCGameMaster is ERC1155Holder {

    event StakeCreated (uint indexed tokenId, address indexed owner, uint indexed priceFeedId);
    event TokenRevived (uint indexed tokenId, address indexed angelOwner, uint indexed angel);
    event TokenExecuted (uint indexed tokenId, address indexed reaperOwner, uint indexed reaper);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    struct Stake {
        address owner;
        uint priceFeedId;
        uint startingPrice;
        uint position;
        bool long;
    }

    address admin;
    address nftAddress;

    uint public angelScoreReward = 25;
    uint public angelTokenReward = 10;
    uint public reaperScorePenalty = 50;

    // mapping tokenId to stake;
    mapping (uint => Stake) private stakes;
    // mapping (address => mapping (uint => uint[])) private stakes;

    // mapping uint price to Aggregator
    mapping (uint => AggregatorV3Interface) private priceFeeds;

    // MOCK
    uint[] prices;
    struct Test {
      uint priceStart;
      uint priceEnd;
      uint position;
      uint bps;
      uint scoreChange;
      bool win;
      bool long;
    }
    Test public testValue;

    /**
     * Network: Kovan
     */
    constructor(address _nftAddress) {
      admin = msg.sender;
      nftAddress = _nftAddress;
      priceFeeds[0] = AggregatorV3Interface(0x6135b13325bfC4B00278B4abC5e20bbce2D6580e); // BTCUSD 8
      priceFeeds[1] = AggregatorV3Interface(0x9326BFA02ADD2366b30bacB125260Af641031331); // ETHUSD 8
      priceFeeds[2] = AggregatorV3Interface(0xF7904a295A029a3aBDFFB6F12755974a958C7C25); // BTCETH 18
      priceFeeds[3] = AggregatorV3Interface(0x8993ED705cdf5e84D0a3B754b5Ee0e1783fcdF16); // BNBUSD 8
      // priceFeeds[4] = AggregatorV3Interface(0x3eA2b7e3ed9EA9120c3d6699240d1ff2184AC8b3); // XRPUSD 8
      // priceFeeds[5] = AggregatorV3Interface(0x17756515f112429471F86f98D5052aCB6C47f6ee); // UNIETH 18

      emit OwnershipTransferred(address(0), admin);

      // MOCK
      uint ethusd = 191022979575;
      uint add = 6022979575;
      for(uint i = 0; i < 30; i ++) {
        uint _add = add * i;
        prices.push(ethusd + _add);
      }
    }


    // function getPrice(uint _id) public view returns (uint) {
    //     (uint80 roundID, int price, uint startedAt, uint timeStamp, uint80 answeredInRound) = priceFeeds[_id].latestRoundData();
    //     return uint(price);
    // }

    // function getDecimals(uint _id) public view returns (uint8) {
    //     return priceFeeds[_id].decimals();
    // }

    // MOCK
    function getPrice(uint _id) public view returns (uint) {
      uint rand = _random(30);
      return prices[rand];
    }

    function getDecimals(uint _id) public pure returns (uint8) {
      return 8;
    }

    function createStake(uint _tokenId, uint _priceFeedId, uint _position, bool long) external {
      IERC1155(nftAddress).safeTransferFrom(msg.sender, address(this), _tokenId, 1, '');
      stakes[_tokenId] = Stake(msg.sender, _priceFeedId, getPrice(_priceFeedId), _position, long);
      emit StakeCreated(_tokenId, msg.sender, _priceFeedId);
    }

    function cancelStake(uint _tokenId) external {
      require(stakes[_tokenId].owner == msg.sender, 'only owner');
      require(IERC1155(nftAddress).balanceOf(address(this), _tokenId) > 0, 'only staked');
      Stake storage _stake = stakes[_tokenId];
      uint priceEnd = getPrice(_stake.priceFeedId);
      uint change = _stake.position * calcBps(_stake.startingPrice, priceEnd) / 10000;
      bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;

      IERC1155(nftAddress).changeScore(_tokenId, change, win, win ? change * 10**18 : 10**18);
      IERC1155(nftAddress).safeTransferFrom(address(this), _stake.owner, _tokenId, 1, '');
    }

    function reviveToken(uint _tokenId, uint angelId) external {
      require(IERC1155(nftAddress).balanceOf(msg.sender, angelId) > 0, 'only owner');
      require(IERC1155(nftAddress).balanceOf(address(this), _tokenId) > 0, 'only staked');
      (bool dead, uint scoreBefore) = _isDead(_tokenId, 50);
      require(dead, 'not dead');
      IERC1155(nftAddress).changeScore(_tokenId, scoreBefore - 50, false, 10**18); // revive with 50
      IERC1155(nftAddress).changeScore(angelId, angelScoreReward, true, angelTokenReward * 10**18); // get 50 points + rewards tokens
      IERC1155(nftAddress).safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId, 1, '');
    }

    function reapToken(uint _tokenId, uint reaperId) external {
      require(IERC1155(nftAddress).balanceOf(msg.sender, reaperId) > 0, 'only owner');
      require(IERC1155(nftAddress).balanceOf(address(this), _tokenId) > 0, 'only staked');
      (bool dead, uint scoreBefore) = _isDead(_tokenId, 5);
      require(dead, 'not dead');
      IERC1155(nftAddress).changeScore(_tokenId, scoreBefore - 50, false, 10**18); // revive with 50
      IERC1155(nftAddress).changeScore(reaperId, reaperScorePenalty, false, 10**18); // -50 points
      IERC1155(nftAddress).safeTransferFrom(address(this), msg.sender, _tokenId, 1, ''); // take ownership
    }

    function _isDead(uint _tokenId, uint threshold) internal view returns (bool, uint) {
      Stake storage _stake = stakes[_tokenId];
      // uint priceEnd = getPrice(_stake.priceFeedId);
      uint priceEnd = 191022979575; // MOCK
      uint change = _stake.position * calcBps(_stake.startingPrice, priceEnd) / 10000;
      bool win = _stake.long ? _stake.startingPrice < priceEnd : _stake.startingPrice > priceEnd;
      uint scoreBefore = IERC1155(nftAddress).getCoinScore(_tokenId);
      return ((win != true && scoreBefore <= (change + threshold)), scoreBefore);
    }

    function calcBps(uint x, uint y) public pure returns (uint) {
        uint _x = x > 10**12 ? x / 10**8 : x;
        uint _y = y > 10**12 ? y / 10**8: y;
        return _x > _y ? (_x - _y) * 10000 / _x : (_y - _x) * 10000 / _y ;
    }

    function _random(uint max) internal view returns(uint) {
      return uint(keccak256(abi.encodePacked(block.number, block.timestamp, block.difficulty, msg.sender))) % max;
    }

    function cancelStakeAdmin(uint _tokenId) external {
      require(msg.sender == admin, 'admin only');
      IERC1155(nftAddress).safeTransferFrom(address(this), stakes[_tokenId].owner, _tokenId, 1, '');
    }

    // MOCK
    function cancelStakeMOCK(uint _tokenId) external {
      require(stakes[_tokenId].owner == msg.sender, 'only owner');
      require(IERC1155(nftAddress).balanceOf(address(this), _tokenId) > 0, 'only staked');
      Stake storage _stake = stakes[_tokenId];
      uint priceStart = _stake.startingPrice;
      uint priceEnd = getPrice(_stake.priceFeedId);
      uint bps = calcBps(priceStart, priceEnd);
      uint change = _stake.position * bps / 10000;
      bool win = _stake.long ? priceStart < priceEnd : priceStart > priceEnd;

      testValue.bps = bps;
      testValue.priceStart = priceStart;
      testValue.priceEnd = priceEnd;
      testValue.position = _stake.position;
      testValue.win = win;
      testValue.scoreChange = change;
      testValue.long = _stake.long;

      IERC1155(nftAddress).changeScore(_tokenId, change, win, win ? change * 10**18 : 10**18);
      IERC1155(nftAddress).safeTransferFrom(address(this), _stake.owner, _tokenId, 1, '');
    }

    function getStake(uint _id) external view returns (Stake memory) {
      return stakes[_id];
    }

    function addFeed(uint _id, address _proxy) external {
        require(msg.sender == admin, 'admin only');
        priceFeeds[_id] = AggregatorV3Interface(_proxy);
    }

    function setAngelReaperRewards(uint revive, uint _token, uint reap) external {
      require(msg.sender == admin, 'admin only');
      angelScoreReward = revive;
      angelTokenReward = _token;
      reaperScorePenalty = reap;
    }

    function transferOwnership(address newAdmin) external {
      require(msg.sender == admin, 'admin only');
      emit OwnershipTransferred(admin, newAdmin);
      admin = newAdmin;
    }



}