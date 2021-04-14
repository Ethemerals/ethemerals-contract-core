// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../openzep/token/ERC1155/ERC1155.sol";
import "../openzep/token/ERC20/IERC20.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/ERC1155.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

//5000000 gas limit
//"https://cloudfront.net/api/meta/{id}", "0xDc1EC809D4b2b06c4CF369C63615eAeE347D45Ac"


contract CryptoCoins is ERC1155 {

    event ChangeScore (uint indexed id, uint indexed score, bool indexed add, uint rewards);
    event RedeemWinnerFunds (address indexed to, uint amount);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event GameMasterAdded(address indexed gm);
    event GameMasterRemoved(address indexed gm);
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);

    // NFT ID range 1-6969
    // Bosses: 1, 2, 3, 4, 5, 6, 7, 8, 9
    // Bitcoin: starts at 10-19
    // 696 ranked coin ends at 696-6969
    // items start at 7000

    struct Coin {
      uint id;
      uint score;
      uint rewards;
    }

    // rewards token address
    address private tokenAddress;
    address private admin;

    // ranking rewards
    uint private nonce;
    uint public winnerMult = 1; // TEST PUBLIC
    uint public winnerFunds;
    uint public winningCoin;
    uint public mintPrice = 100000000000000000;

    // iterable array of available classes
    uint[] private availableCoins;

    // mapping of classes to edition (holds all the classes and editions)
    mapping (uint => Coin[]) private coinEditions;
    mapping (address => bool) private gameMasters;
    mapping (address => bool) private minters;



    constructor(string memory uri, address _tokenAddress) ERC1155(uri) {
      admin = msg.sender;
      minters[msg.sender] = true;
      tokenAddress = _tokenAddress;
    }


    function mint(address to, uint256 id, uint256 amount, bytes memory data) public virtual {
      require(minters[msg.sender] == true, "minter only");
      _mint(to, id, amount, data);
    }


    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual {
      require(minters[msg.sender] == true, "minter only");
      _mintBatch(to, ids, amounts, data);
    }


    // buys a random token from available class
    function buy() payable external {
      require(msg.value >= mintPrice || (IERC20(tokenAddress).balanceOf(msg.sender) >= 2000000000000000000000 && msg.value >= (mintPrice - mintPrice/4)), "not enough"); // discount
      _mintAvailableToken(msg.sender);
    }


    function _mintAvailableToken(address to) private {
      require(availableCoins.length > 0, "no more");
      uint randCoinClass;
      uint edition;

      while(availableCoins.length > 0) {
        randCoinClass = _random(availableCoins.length);
        edition = coinEditions[availableCoins[randCoinClass]].length;

        if (edition < 10) {
          uint _tokenId = availableCoins[randCoinClass] * 10 + edition;
          _mint(to, _tokenId, 1, "");
          coinEditions[availableCoins[randCoinClass]].push(Coin(_tokenId, 300, 1000000000000000000000));
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


    //Require GAMEMASTER
    function changeScore(uint _tokenId, uint offset, bool add, uint amount) external {
      require(gameMasters[msg.sender] == true, "gm only");
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
      tokenCurrent.rewards += amount > 1000000000000000000000 ? 1000000000000000000000 : amount; //Clamp

      if(winningCoin == 0) {
        winningCoin = tokenCurrent.id;
      } else if (tokenCurrent.id != winningCoin && tokenCurrent.score >= coinEditions[winningCoin / 10][winningCoin % 10].score) {
        winningCoin = tokenCurrent.id;
      }

      //2%-10% pct sent to winner fund, 200 basis points = 2%
      if(amount > 1000000000)  { //1 Gwei
        winnerMult = winnerMult < 10 ? nonce / 10 + 1 : 10;
        uint fundAmount = amount * 200 * winnerMult / 10000;
        winnerFunds += fundAmount;
      }

      nonce++;
      emit ChangeScore(_tokenId, newScore, add, amount);
    }


    //redeem erc20 tokens
    function redeemTokens(uint _tokenId) external {
      require(balanceOf(msg.sender, _tokenId) > 0,  'owner only');
      uint amount = coinEditions[_tokenId / 10][_tokenId % 10].rewards;
      coinEditions[_tokenId / 10][_tokenId % 10].rewards = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
    }


    function redeemWinnerFunds(uint _tokenId) external {
      require(balanceOf(msg.sender, _tokenId) > 0, "owner only");
      require(coinEditions[winningCoin / 10][winningCoin % 10].id == _tokenId, 'winner only');
      require(IERC20(tokenAddress).balanceOf(address(this)) >= winnerFunds, 'no funds');
      uint amount = winnerFunds;
      winnerFunds = 0;
      winnerMult = 1;
      nonce = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit RedeemWinnerFunds(msg.sender, amount);
    }


    function setAvailableCoin(uint _id) external onlyAdmin() { //admin
      availableCoins.push(_id);
    }


    function setAvailableCoins(uint[] memory _ids ) external onlyAdmin() { //admin
      availableCoins = _ids;
    }


    function setMintPrice(uint _price) external onlyAdmin() { //admin
      mintPrice = _price;
    }


    function addGameMaster(address _gm) external onlyAdmin() { //admin
      gameMasters[_gm] = true;
      emit GameMasterAdded(_gm);
    }


    function removeGameMaster(address _gm) external onlyAdmin() { //admin
      gameMasters[_gm] = false;
      emit GameMasterRemoved(_gm);
    }

    function addMinter(address _minter) external onlyAdmin() { //admin
      minters[_minter] = true;
      emit MinterAdded(_minter);
    }

    function removeMinter(address _minter) external onlyAdmin() { //admin
      minters[_minter] = false;
      emit MinterRemoved(_minter);
    }


    function withdraw(address payable to) external onlyAdmin() { //admin
      to.transfer(address(this).balance);
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


    function transferOwnership(address newAdmin) external onlyAdmin() { // ADMIN
      emit OwnershipTransferred(admin, newAdmin);
      admin = newAdmin;
    }


    modifier onlyAdmin() {
      require(msg.sender == admin, 'admin only');
      _;
    }


    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
      return super.supportsInterface(interfaceId);
    }

}

