// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import "../openzep/token/ERC721/ERC721.sol";
import "../openzep/token/ERC20/IERC20.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/ERC721.sol";


contract Ethemerals is ERC721 {

    event ChangeScore(uint indexed tokenId, uint score, bool add, uint rewards);
    event OwnershipTransferred(address previousOwner, address newOwner);
    event DelegateChange(address indexed delegate, bool add);
    event PriceChange(uint price, bool inEth);
    event Resurrection(uint tokenId, bool inEth);
    event Redemption(uint tokenId, bool fromToken);
    event DisallowDelegatesChange(address indexed user, bool disallow);

    // NFT ID range 1-4209
    // Bosses: 1, 2, 3, 4, 5, 6, 7,W 8, 9
    // Bitcoin: starts at 10-19
    // Last Coin ranked ends at 420 IDs 4209
    // NFT Art at 5000
    // Total Characters
    // items start at 7000

    struct Coin {
      uint id;
      uint score;
      uint rewards;
    }

    // rewards token address
    address private tokenAddress;
    address private admin;

    string private contractUri;

    // ranking rewards
    uint private nonce;
    uint public winnerMult = 1;
    uint public winnerFunds;
    uint public winningCoin;
    uint public mintPrice = 100*10**18;
    uint public revivePrice = 1000*10**18; //1000 tokens

    // iterable array of available classes
    uint[] private availableCoins;

    // mapping of classes to edition (holds all the classes and editions)
    mapping (uint => Coin[]) private coinEditions;

    // access control
    mapping (address => bool) private delegates;
    mapping (address => bool) private disallowDelegates; // default allows, user needs to disallow

    string private _uri;



    constructor(string memory tUri, string memory cUri, address _tokenAddress, string memory name, string memory symbol) ERC721(name, symbol) {
      admin = msg.sender;
      _uri = tUri;
      contractUri = cUri;
      tokenAddress = _tokenAddress;
      emit OwnershipTransferred(address(0), msg.sender);
    }


    function mint(address to, uint256 id) public virtual {
      require(delegates[msg.sender] == true, "delegates only");
      _mint(to, id);
    }

    // buys a random token from available class
    function buy() payable external {
      require(msg.value >= mintPrice || (IERC20(tokenAddress).balanceOf(msg.sender) >= 2000*10**18 && msg.value >= (mintPrice - mintPrice/4)), "not enough"); // discount 2000 rewards
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
          _mint(to, _tokenId);
          coinEditions[availableCoins[randCoinClass]].push(Coin(_tokenId, 300, 1000*10**18)); // 1000 rewards
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


    //Require GAMEMASTER
    function changeScore(uint _tokenId, uint offset, bool add, uint amount) external {
      require(delegates[msg.sender] == true, "delegates only");
      _changeScore(_tokenId, offset,  add, amount);
    }

    function _changeScore(uint _tokenId, uint offset, bool add, uint amount) internal {
      require(_exists(_tokenId), "not exist");
      Coin storage tokenCurrent = coinEditions[_tokenId / 10][_tokenId % 10];

      uint _score = tokenCurrent.score;
      uint newScore;
      if (add) {
        uint sum = _score + offset;
        newScore = sum > 1000 ? 1000 : sum;
      } else {
        if (_score <= offset) {
          newScore = 0;
        } else {
          newScore = _score - offset;
        }
      }
      tokenCurrent.score = newScore;
      uint amountClamped = amount > 10000*10**18 ? 10000*10**18 : amount; //clamp 10000 tokens
      tokenCurrent.rewards += amountClamped;

      if(winningCoin == 0) {
        winningCoin = tokenCurrent.id;
      } else if (tokenCurrent.id != winningCoin && tokenCurrent.score >= coinEditions[winningCoin / 10][winningCoin % 10].score) {
        winningCoin = tokenCurrent.id;
      }

      //2%-10% pct sent to winner fund, 200 basis points = 2%
      winnerMult = winnerMult < 10 ? nonce / 10 + 1 : 10;
      uint fundAmount = amountClamped * 200 * winnerMult / 10000;
      winnerFunds += fundAmount;


      nonce++;
      emit ChangeScore(_tokenId, newScore, add, amountClamped);
    }


    //redeem erc20 tokens
    function redeemTokens(uint _tokenId) external {
      require(ownerOf(_tokenId) == msg.sender,  'owner only');
      uint amount = coinEditions[_tokenId / 10][_tokenId % 10].rewards;
      coinEditions[_tokenId / 10][_tokenId % 10].rewards = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit Redemption(_tokenId, true);
    }


    function redeemWinnerFunds(uint _tokenId) external {
      require(ownerOf(_tokenId) == msg.sender,  'owner only');
      require(coinEditions[winningCoin / 10][winningCoin % 10].id == _tokenId, 'winner only');
      require(IERC20(tokenAddress).balanceOf(address(this)) >= winnerFunds, 'no funds');
      uint amount = winnerFunds;
      winnerFunds = 0;
      winnerMult = 1;
      nonce = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit Redemption(_tokenId, false);
    }


    function resurrectWithEth(uint _id) external payable {
      require(coinEditions[_id / 10][_id % 10].score <= 25, 'not dead');
      require(msg.value >= mintPrice, 'not enough');
      _changeScore(_id, 100, true, 100*10**18); // revive with 100 & 100 rewards
      emit Resurrection(_id, true);
    }

    function resurrectWithToken(uint _id) external {
      require(coinEditions[_id / 10][_id % 10].score <= 25, 'not dead');
      require(IERC20(tokenAddress).balanceOf(msg.sender) >= revivePrice , 'not enough');
      if(IERC20(tokenAddress).transferFrom(msg.sender, address(this), revivePrice)){
        _changeScore(_id, 100, true, 100*10**18); // revive with 100 & 100 rewards
        emit Resurrection(_id, false);
      }
    }


    function setDisallowDelegates(bool disallow) external { // setting true will disallow delegates
      disallowDelegates[msg.sender] = disallow;
      emit DisallowDelegatesChange(msg.sender, disallow);
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


    function addDelegate(address _delegate, bool add) external onlyAdmin() { //admin
      delegates[_delegate] = add;
      emit DelegateChange(_delegate, add);
    }


    function withdraw(address payable to) external onlyAdmin() { //admin
      to.transfer(address(this).balance);
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
    function _baseURI() internal view override returns (string memory) {
      return _uri;
    }

    function contractURI() public view returns (string memory) {
      return contractUri;
    }

    function getAvailableCoins() external view returns (uint[] memory) {
      return availableCoins;
    }

    function getCoinById(uint _tokenId) external view returns(Coin memory) {
      return coinEditions[_tokenId / 10][_tokenId % 10];
    }

    function getCoinScore(uint _tokenId) external view returns(uint) {
      return coinEditions[_tokenId / 10][_tokenId % 10].score;
    }

    function _random(uint max) private view returns(uint) {
      return uint(keccak256(abi.encodePacked(nonce, block.number, block.difficulty, msg.sender))) % max;
    }

    /**
     * @dev See {IERC721-isApprovedForAll}.
     * white list for game masters and auction house
     */
    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
      if (!disallowDelegates[owner] && (delegates[operator] == true)) {
        return true;
      }

      return super.isApprovedForAll(owner, operator);
    }



    modifier onlyAdmin() {
      require(msg.sender == admin, 'admin only');
      _;
    }

}

