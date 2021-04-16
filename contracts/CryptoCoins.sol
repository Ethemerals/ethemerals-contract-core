// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "./ERC1155.sol";
import "../openzep/token/ERC20/IERC20.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

//3000000 gas limit
//"https://d1b1rc939omrh2.cloudfront.net/api/meta/", "https://d1b1rc939omrh2.cloudfront.net/api/contract", "0xDc1EC809D4b2b06c4CF369C63615eAeE347D45Ac"



contract CryptoCoins is ERC1155 {

    event ChangeScore (uint indexed id, uint indexed score, bool indexed add, uint rewards);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event GameMasterChange(address indexed gm, bool add);
    event MinterChange(address indexed minter, bool add);

    // NFT ID range 1-6969
    // Bosses: 1, 2, 3, 4, 5, 6, 7, 8, 9
    // Bitcoin: starts at 10-19
    // Last Coin ranked ends at 696 IDs 6969
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
    uint public mintPrice = 100000000000000000;

    // iterable array of available classes
    uint[] private availableCoins;

    // mapping of classes to edition (holds all the classes and editions)
    mapping (uint => Coin[]) private coinEditions;
    mapping (address => bool) private gameMasters;
    mapping (address => bool) private minters;

    // Used as the URI for all token types by relying on ID substitution, e.g. https://token-cdn-domain/{id}.json
    string private _uri;


    constructor(string memory tUri, string memory cUri, address _tokenAddress) ERC1155() {
      admin = msg.sender;
      minters[msg.sender] = true;
      _uri = tUri;
      contractUri = cUri;
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
      require(msg.value >= mintPrice || (IERC20(tokenAddress).balanceOf(msg.sender) >= 2000000000000000000000 && msg.value >= (mintPrice - mintPrice/4)), "not enough"); // discount 2000 rewards
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
          coinEditions[availableCoins[randCoinClass]].push(Coin(_tokenId, 300, 1000000000000000000000)); // 1000 rewards
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
      uint amountClamped = amount > 1000000000000000000000 ? 1000000000000000000000 : amount; //Clamp
      tokenCurrent.rewards += amountClamped;

      if(winningCoin == 0) {
        winningCoin = tokenCurrent.id;
      } else if (tokenCurrent.id != winningCoin && tokenCurrent.score >= coinEditions[winningCoin / 10][winningCoin % 10].score) {
        winningCoin = tokenCurrent.id;
      }

      //2%-10% pct sent to winner fund, 200 basis points = 2%
      if(amountClamped > 1000000000)  { //1 Gwei
        winnerMult = winnerMult < 10 ? nonce / 10 + 1 : 10;
        uint fundAmount = amountClamped * 200 * winnerMult / 10000;
        winnerFunds += fundAmount;
      }

      nonce++;
      emit ChangeScore(_tokenId, newScore, add, amountClamped);
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


    function addGameMaster(address _gm, bool add) external onlyAdmin() { //admin
      gameMasters[_gm] = add;
      emit GameMasterChange(_gm, add);
    }


    function addMinter(address _minter, bool add) external onlyAdmin() { //admin
      minters[_minter] = add;
      emit MinterChange(_minter, add);
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


    function uri(uint _id) public view returns (string memory) {
      return string(abi.encodePacked(_uri, _toString(_id)));
    }

    function setURI(string memory newuri) external onlyAdmin() {// ADMIN
      _uri = newuri;
    }

    function contractURI() public view returns (string memory) {
      return contractUri;
    }

    function setContractURI(string memory _cUri) external onlyAdmin() {// ADMIN
      contractUri = _cUri;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC1155) returns (bool) {
      return super.supportsInterface(interfaceId);
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }

}

