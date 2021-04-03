// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

import "../openzep/token/ERC1155/ERC1155.sol";
import "../openzep/access/AccessControlEnumerable.sol";
import "../openzep/utils/Context.sol";
import "../openzep/token/ERC20/IERC20.sol";

// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/ERC1155.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/AccessControlEnumerable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

//5000000 gas limit
//"https://cloudfront.net/api/meta/{id}", "0x320d8AE8984E40949126E95e493871f8C99baAC1"

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
contract CryptoCoins is Context, AccessControlEnumerable, ERC1155 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    event AvailableCoins (uint[] indexed classIds);
    event AvailableCoin (uint indexed classId);
    event MintPrice (uint indexed amount);
    event MaxedClass (uint indexed classId);
    event ChangeScore (uint indexed id, uint indexed score, bool indexed add, uint rewards);
    event Withdraw (address indexed to, uint  amount);
    event Redeem (uint indexed id, uint amount);
    event RedeemWinnerFunds (address indexed to, uint amount);
    event Staked (uint indexed id, bool indexed staked);
    event WinningCoin (uint indexed id);

    // Gold 0
    // NFT ID range 1-6969
    // Bosses: 1, 2, 3, 4, 5, 6, 7, 8, 9
    // Bitcoin: starts at 10-19
    // 696 ranked coin ends at 696-6969
    // items start at 7000

    struct Coin {
      uint id;
      uint score;
      bool staked;
      uint rewards;
    }

    // ranking rewards
    uint public winnerFunds;
    uint public winnerMult = 1;
    uint public winningCoin;

    uint private iniReward = 100000000000000000000;
    uint private iniScore = 300;
    uint private nonce;
    uint public testValue;

    // Rewards token address
    address public tokenAddress;

    // iterable array of available classes
    uint[] private availableCoins;
    uint public mintPrice = 100000000000000000;

    // mapping of classes to edition (holds all the classes and editions)
    mapping (uint => Coin[]) public coinEditions;


    constructor(string memory uri, address _tokenAddress) ERC1155(uri) {
      _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
      _setupRole(MINTER_ROLE, _msgSender());
      tokenAddress = _tokenAddress;
    }

    function mint(address to, uint256 id, uint256 amount, bytes memory data) public virtual {
      require(hasRole(MINTER_ROLE, _msgSender()), "CCC: must have minter role to mint");
      _mint(to, id, amount, data);
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual {
      require(hasRole(MINTER_ROLE, _msgSender()), "CCC: must have minter role to mint");
      _mintBatch(to, ids, amounts, data);
    }

    function setAvailableCoin(uint _id) external onlyAdmin() { //admin
      availableCoins.push(_id);
      emit AvailableCoin(_id);
    }

    function setAvailableCoins(uint[] memory _ids ) external onlyAdmin() { //admin
      availableCoins = _ids;
      emit AvailableCoins(_ids);
    }

    function setMintPrice(uint _price) external onlyAdmin() { //admin
      mintPrice = _price;
      emit MintPrice(_price);
    }

    function setWinningCoin(uint _id) external onlyAdmin() { //admin
      winningCoin = _id;
      emit WinningCoin(_id);
    }

    function withdraw(address payable to, uint amount) external onlyAdmin() { //admin
      require(amount <= address(this).balance, "CCC: amount is more then balance" );
      to.transfer(amount);
      emit Withdraw(to, amount);
    }

    // buys a random token from available class
    function buy() payable external {
      require(msg.value >= mintPrice, "CCC: Not enough ETH");
      _mintAvailableToken(msg.sender);
    }

    function _mintAvailableToken(address to) internal {
      uint max;
      uint randCoinClass;
      uint coinClass;
      uint edition;

      while(availableCoins.length > 0) {
        max = availableCoins.length;
        randCoinClass = _random(max);
        coinClass = availableCoins[randCoinClass];
        edition = coinEditions[coinClass].length;

        if (edition < 10) {
          nonce++;
          uint _tokenId = coinClass * 10 + edition;
          coinEditions[coinClass].push(Coin(_tokenId, iniScore, false, iniReward));
          _mint(to, _tokenId, 1, "");
          return;
        } else {
          // no more editions
          _reduceAvailableCoins(randCoinClass);
        }
      }

      revert("CCC: No more to mint");
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

      emit MaxedClass(coinToRemove);
    }


    // REDO WITH CORRECT TOKEN need admin require GAMEMASTER
    function changeScore(uint _tokenId, uint offset, bool add, uint amount) external {
      uint tokenClass = _tokenId / 10;
      uint tokenEdition = _tokenId % 10;
      Coin storage tokenCurrent = coinEditions[tokenClass][tokenEdition];
      require(tokenCurrent.id == _tokenId, 'CCC: token doesnt exist');
      require(amount >= 0 && amount <= 1000000000000000000000, 'CCC: amount needs to be clamped');

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
      tokenCurrent.rewards += amount;

      if(winningCoin == 0) {
        winningCoin = tokenCurrent.id;
        emit WinningCoin(tokenCurrent.id);
      } else if (tokenCurrent.id != winningCoin && tokenCurrent.score >= coinEditions[winningCoin / 10][winningCoin % 10].score) {
        winningCoin = tokenCurrent.id;
        emit WinningCoin(tokenCurrent.id);
      }

      // NOPE
      // if(tokenCurrent.id != coin1st.id && add) {
      //   if(tokenCurrent.score >= coin1st.score) {
      //     coin1st = tokenCurrent;
      //   } else if (tokenCurrent.score >= coin2nd.score) {
      //     coin2nd = tokenCurrent;
      //   }
      // } else {
      //   if(tokenCurrent.score < coin2nd.score) {
      //     coin1st = coin2nd;
      //     coin2nd = tokenCurrent;
      //   }
      // }

      //2%-10% pct sent to winner fund, 200 basis points = 2%
      if(amount > 1000000000)  { //1 Gwei
        winnerMult = winnerMult < 8 ? nonce/20 + 1 : 8;
        uint fundAmount = amount * 200 * winnerMult / 10000;
        winnerFunds += fundAmount;
      }

      nonce++;

      emit ChangeScore(_tokenId, newScore, add, amount);
    }


    // TODO set staking true or false requires GAMEMASTER
    function setStaked(uint _tokenId, bool _staked) external {
      uint tokenClass = _tokenId / 10;
      uint tokenEdition = _tokenId % 10;
      require(coinEditions[tokenClass][tokenEdition].id == _tokenId, 'CCC: token doesnt exist');
      coinEditions[tokenClass][tokenEdition].staked = _staked;
      emit Staked(_tokenId, _staked);
    }


    //redeem erc20 tokens
    function redeemTokens(uint _tokenId) external {
      uint amount = coinEditions[_tokenId / 10][_tokenId % 10].rewards;
      require(amount > 1000000000, 'CCC: amount to small');
      require(IERC20(tokenAddress).balanceOf(address(this)) >= amount, 'CCC: amount to big');
      require(balanceOf(msg.sender, _tokenId) > 0, "CCC: must have token");
      coinEditions[_tokenId / 10][_tokenId % 10].rewards = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit Redeem(_tokenId, amount);
    }


    function redeemWinnerFunds(uint _tokenId) external {
      require(balanceOf(msg.sender, _tokenId) > 0, "CCC: must have token");
      require(coinEditions[winningCoin / 10][winningCoin % 10].id == _tokenId, 'CCC: must be the winner');
      require(IERC20(tokenAddress).balanceOf(address(this)) >= winnerFunds, 'CCC: not enough funds');
      uint amount = winnerFunds;
      winnerFunds = 0;
      winnerMult = 1;
      nonce = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit RedeemWinnerFunds(msg.sender, amount);
    }


    function _random(uint max) internal view returns(uint) {
      return uint(keccak256(abi.encodePacked(nonce, block.number, block.timestamp, block.difficulty, msg.sender))) % max;
    }


    function getAvailableCoins() external view returns (uint[] memory) {
      return availableCoins;
    }


    function getCoinById(uint _tokenId) external view returns(Coin memory) {
      return coinEditions[_tokenId / 10][_tokenId % 10];
    }


    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, ERC1155) returns (bool) {
      return super.supportsInterface(interfaceId);
    }


    modifier onlyAdmin() {
      require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CCC: must have admin role");
      _;
    }
    // TODO before hook

}

