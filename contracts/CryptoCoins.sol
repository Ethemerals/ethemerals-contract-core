// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../openzep/token/ERC1155/ERC1155.sol";
import "../openzep/access/AccessControlEnumerable.sol";
import "../openzep/utils/Context.sol";
import "../openzep/token/ERC20/IERC20.sol";


// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/ERC1155.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/AccessControlEnumerable.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/Context.sol";
// import "https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol";

//5000000 gas limit
//"https://d1b1rc939omrh2.cloudfront.net/api/meta/{id}", "0x320d8AE8984E40949126E95e493871f8C99baAC1"

interface IERC20Burnable {
    function burn(uint256 amount) external;
}

/**
 * @dev {ERC1155} token, including:
 *
 *  - ability for holders to burn (destroy) their tokens
 *  - a minter role that allows for token minting (creation)
 *  - a pauser role that allows to stop all token transfers
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

    event AvailableCoinsEvent (uint indexed min, uint indexed max, uint indexed editions);
    event MaxEditionsEvent (uint indexed editions);
    event MintPriceEvent (uint indexed amount);
    event MaxedClassEvent (uint indexed classId);
    event ChangeScoreEvent (uint indexed id, uint indexed score, bool indexed add, uint rewards);
    event WithdrawEvent (address indexed to, uint  amount);
    event RedeemEvent (uint indexed id, uint amount);
    event RedeemWinnerFundsEvent (address indexed to, uint amount);
    event StakedEvent (uint indexed id, bool indexed staked);

    uint public winnerFunds;
    uint private iniReward = 100000000000000000000;
    uint private iniScore = 300;
    uint private nonce;
    uint public testValue;

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

    // Rewards token
    address public tokenAddress;

    // iterable array of available classes
    uint[] private availableCoins;
    uint public maxEditions = 10;
    uint public mintPrice = 100000000000000000;


    // mapping of classes to edition (holds all the coins)
    mapping (uint => Coin[]) public coinEditions;


    //deploys the contract.
    constructor(string memory uri, address _tokenAddress) ERC1155(uri) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
        tokenAddress = _tokenAddress;
    }

    //redeem erc20 tokens and burn some more
    function redeemTokens(uint _tokenId) external {
        // require owner and balance
        uint amount = coinEditions[_tokenId / 10][_tokenId % 10].rewards;
        require(IERC20(tokenAddress).balanceOf(address(this)) >= amount, 'amount to much');
        require(balanceOf(_msgSender(), _tokenId) > 0, "CCC: must have token");
        coinEditions[_tokenId / 10][_tokenId % 10].rewards = 0;
        IERC20(tokenAddress).transfer(msg.sender, amount);
        emit RedeemEvent(_tokenId, amount);
    }


    function setAvailableCoins(uint min, uint max, uint _maxEditions) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CCC: must have admin role");
        require(min > 0 && max < 696, "CCC: to many coins");
        require(_maxEditions > 0 &&_maxEditions < 11, "CCC: to many editions");

        uint[] memory coinClasses = new uint[](max - min + 1);

        for(uint i = 0; i < max - min + 1; i ++) {
          coinClasses[i] = i+min;
        }
        availableCoins = coinClasses;
        maxEditions = _maxEditions;

        emit AvailableCoinsEvent(min, max, _maxEditions);
    }

    function setMintPrice(uint _price) external {
      require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CCC: must have admin role");
      mintPrice = _price;
      emit MintPriceEvent(_price);
    }

    function withdraw(address payable to, uint amount) external {
      require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "CCC: must have admin role");
      require(amount <= address(this).balance, "CCC: amount is more then balance" );
      to.transfer(amount);
      emit WithdrawEvent(to, amount);
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

        if (edition < maxEditions) {
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

      emit MaxedClassEvent(coinToRemove);
    }


    /**
     * @dev generates good enough random.
     */
    function _random(uint max) internal view returns(uint) {
      return uint(keccak256(abi.encodePacked(nonce, block.number, block.timestamp, block.difficulty, msg.sender))) % max;
    }




    /**
     * @dev Creates `amount` new tokens for `to`, of token type `id`.
     *
     * See {ERC1155-_mint}.
     *
     * Requirements:
     *
     * - the caller must have the `MINTER_ROLE`.
     */
    function mint(address to, uint256 id, uint256 amount, bytes memory data) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "CCC: must have minter role to mint");

        _mint(to, id, amount, data);
    }

    /**
     * @dev xref:ROOT:erc1155.adoc#batch-operations[Batched] variant of {mint}.
     */
    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data) public virtual {
        require(hasRole(MINTER_ROLE, _msgSender()), "CCC: must have minter role to mint");

        _mintBatch(to, ids, amounts, data);
    }


    // REDO WITH CORRECT TOKEN need admin require GAMEMASTER
    function changeScore(uint _tokenId, uint offset, bool add, uint amount) public {
      uint tokenClass = _tokenId / 10;
      uint tokenEdition = _tokenId % 10;
      require(coinEditions[tokenClass][tokenEdition].id == _tokenId, 'CCC: token doesnt exist');
      require(amount >= 0 && amount <= 1000000000000000000000, 'CCC: amount needs to be clamped');

      uint _score = coinEditions[tokenClass][tokenEdition].score;
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
      coinEditions[tokenClass][tokenEdition].score = newScore;
      coinEditions[tokenClass][tokenEdition].rewards += amount;

      emit ChangeScoreEvent(_tokenId, newScore, add, amount);

      //fee burn and winner fund
      //200 basis points = 2pct
      //2pct burnt, 2pct sent to season fund
      uint tokenBalance = IERC20(tokenAddress).balanceOf(address(this));
      if(amount > 1000000000 && winnerFunds < tokenBalance)  { //1 Gwei
        uint fundAmount = amount * 500 / 10000;
        uint burnAmount = amount * 200 / 10000;
        if( winnerFunds + fundAmount + burnAmount < tokenBalance) {
          winnerFunds += fundAmount;
          IERC20Burnable(tokenAddress).burn(burnAmount);
        }
      }
    }

    // TODO set staking true or false requires GAMEMASTER
    function setStaked(uint _tokenId, bool _staked) public {
      uint tokenClass = _tokenId / 10;
      uint tokenEdition = _tokenId % 10;
      require(coinEditions[tokenClass][tokenEdition].id == _tokenId, 'CCC: token doesnt exist');
      coinEditions[tokenClass][tokenEdition].staked = _staked;
      emit StakedEvent(_tokenId, _staked);
    }


    function redeemWinnerFunds() external {
      // TODO require winner = winner address
      require(IERC20(tokenAddress).balanceOf(address(this)) >= winnerFunds, 'not enough funds');
      uint amount = winnerFunds;
      winnerFunds = 0;
      IERC20(tokenAddress).transfer(msg.sender, amount);
      emit RedeemWinnerFundsEvent(msg.sender, amount);
    }

    function getCoinById(uint _tokenId) external view returns(Coin memory) {
      return coinEditions[_tokenId / 10][_tokenId % 10];
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(AccessControlEnumerable, ERC1155) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // TEST
    function getAvailableCoins() external view returns (uint[] memory) {
      return availableCoins;
    }


    // TODO before hook

}

