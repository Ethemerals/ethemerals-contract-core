// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../openzep/token/ERC1155/ERC1155.sol";
import "../openzep/access/AccessControlEnumerable.sol";
import "../openzep/token/ERC20/IERC20.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/ERC1155.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/AccessControlEnumerable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";


//5000000 gas limit
//"https://cloudfront.net/api/meta/{id}", "0xDc1EC809D4b2b06c4CF369C63615eAeE347D45Ac"


/**
 * @dev {ERC1155} token, including:
 *
 *  - a minter role that allows for token minting (creation)
 *
 * This contract uses {AccessControl} to lock permissioned functions using the
 * different roles - head to its documentation for details.
 *
 * The account that deploys the contract will be granted the minter and pauser
 * roles, as well as the default admin role, which will let it grant both minter
 * and pauser roles to other accounts.
 */
contract CryptoCoins is AccessControlEnumerable, ERC1155 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant GM_ROLE = keccak256("GM_ROLE");

    event AvailableCoins (uint indexed classIdMin, uint indexed classIdMax);
    event AvailableCoin (uint indexed classId);
    event MintPrice (uint indexed amount);
    event ChangeScore (uint indexed id, uint indexed score, bool indexed add, uint rewards);
    event RedeemWinnerFunds (address indexed to, uint amount);

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

    // Rewards token address
    address public tokenAddress;

    // ranking rewards
    uint private nonce;
    uint public winnerFunds;
    uint public winningCoin;
    uint public winnerMult = 1;
    uint public mintPrice = 100000000000000000;

    // iterable array of available classes
    uint[] private availableCoins;

    // mapping of classes to edition (holds all the classes and editions)
    mapping (uint => Coin[]) public coinEditions;


    constructor(string memory uri, address _tokenAddress) ERC1155(uri) {
      _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
      _setupRole(MINTER_ROLE, msg.sender);
      tokenAddress = _tokenAddress;
    }


    function mint(address to, uint256 id, uint256 amount, bytes memory data) public virtual {
      require(hasRole(MINTER_ROLE, msg.sender), "minter only");
      _mint(to, id, amount, data);
    }


    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual {
      require(hasRole(MINTER_ROLE, msg.sender), "minter only");
      _mintBatch(to, ids, amounts, data);
    }


    // buys a random token from available class
    function buy() payable external {
      require(msg.value >= mintPrice || (IERC20(tokenAddress).balanceOf(msg.sender) >= 2000000000000000000000 && msg.value >= (mintPrice - mintPrice/4)), "not enough"); // discount
      _mintAvailableToken(msg.sender);
    }


    function _mintAvailableToken(address to) internal {
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


    function _reduceAvailableCoins(uint coinToRemove) internal {
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

    function _random(uint max) internal view returns(uint) {
      return uint(keccak256(abi.encodePacked(nonce, block.number, block.difficulty, msg.sender))) % max;
    }

    //Require GAMEMASTER
    function changeScore(uint _tokenId, uint offset, bool add, uint amount) external {
      require(hasRole(GM_ROLE, msg.sender), "gm only");
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
      emit AvailableCoin(_id);
    }


    function setAvailableCoins(uint[] memory _ids ) external onlyAdmin() { //admin
      availableCoins = _ids;
      emit AvailableCoins(_ids[0], _ids[_ids.length-1]);
    }


    function setMintPrice(uint _price) external onlyAdmin() { //admin
      mintPrice = _price;
      emit MintPrice(_price);
    }


    function withdraw(address payable to, uint amount) external onlyAdmin() { //admin
      require(amount <= address(this).balance, "wrong amount" );
      to.transfer(amount);
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


    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, ERC1155) returns (bool) {
      return super.supportsInterface(interfaceId);
    }


    modifier onlyAdmin() {
      require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "admin only");
      _;
    }

}

