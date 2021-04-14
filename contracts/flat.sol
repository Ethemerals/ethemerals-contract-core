// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 *
 * Alternatively, {ERC165Storage} provides an easier to use but more expensive implementation.
 */
abstract contract ERC165 is IERC165 {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}


/**
 * _Available since v3.1._
 */
interface IERC1155Receiver is IERC165 {

    /**
        @dev Handles the receipt of a single ERC1155 token type. This function is
        called at the end of a `safeTransferFrom` after the balance has been updated.
        To accept the transfer, this must return
        `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))`
        (i.e. 0xf23a6e61, or its own function selector).
        @param operator The address which initiated the transfer (i.e. msg.sender)
        @param from The address which previously owned the token
        @param id The ID of the token being transferred
        @param value The amount of tokens being transferred
        @param data Additional data with no specified format
        @return `bytes4(keccak256("onERC1155Received(address,address,uint256,uint256,bytes)"))` if transfer is allowed
    */
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    )
        external
        returns(bytes4);

    /**
        @dev Handles the receipt of a multiple ERC1155 token types. This function
        is called at the end of a `safeBatchTransferFrom` after the balances have
        been updated. To accept the transfer(s), this must return
        `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))`
        (i.e. 0xbc197c81, or its own function selector).
        @param operator The address which initiated the batch transfer (i.e. msg.sender)
        @param from The address which previously owned the token
        @param ids An array containing ids of each token being transferred (order and length must match values array)
        @param values An array containing amounts of each token being transferred (order and length must match ids array)
        @param data Additional data with no specified format
        @return `bytes4(keccak256("onERC1155BatchReceived(address,address,uint256[],uint256[],bytes)"))` if transfer is allowed
    */
    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    )
        external
        returns(bytes4);
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/utils/ERC1155Receiver.sol

//



/**
 * @dev _Available since v3.1._
 */
abstract contract ERC1155Receiver is ERC165, IERC1155Receiver {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return interfaceId == type(IERC1155Receiver).interfaceId
            || super.supportsInterface(interfaceId);
    }
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC1155/utils/ERC1155Holder.sol

//


/**
 * @dev _Available since v3.1._
 */
contract ERC1155Holder is ERC1155Receiver {
    function onERC1155Received(address, address, uint256, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(address, address, uint256[] memory, uint256[] memory, bytes memory) public virtual override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}

// File: contracts/CCGameMaster.sol

//


// import "../openzep/token/ERC1155/utils/ERC1155Holder.sol";
// '0x11e04D0d8212dDE055b46BC74ceF8A87B68e1b40', '0x18510E5Ed3512582ae8e2840243B0f23f034b882'

interface IERC1155 {
  function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
  function balanceOf(address account, uint256 id) external view returns (uint256);
  function changeScore(uint _tokenId, uint offset, bool add, uint amount) external;
  function getCoinScore(uint _tokenId) external view returns (uint256);
}

interface IPriceFeed {
  function getPrice(uint _id) external view returns (uint);
}

contract CCGameMaster is ERC1155Holder {

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

  IERC1155 nftContract;
  IPriceFeed priceFeed;

  uint public reviverScorePenalty = 25;
  uint public reviverTokenReward = 10;
  address private admin;

  // mapping tokenId to stake;
  mapping (uint => Stake) private stakes;

  constructor(address _nftAddress, address _priceFeedAddress) {
    admin = msg.sender;
    nftContract = IERC1155(_nftAddress);
    priceFeed = IPriceFeed(_priceFeedAddress);
  }

  function createStake(uint _tokenId, uint _priceFeedId, uint _position, bool long) external {
    nftContract.safeTransferFrom(msg.sender, address(this), _tokenId, 1, '');
    stakes[_tokenId] = Stake(msg.sender, _priceFeedId, priceFeed.getPrice(_priceFeedId), _position, long);
    emit StakeCreated(_tokenId, msg.sender, _priceFeedId);
  }

  function cancelStake(uint _id) external {
    require(stakes[_id].owner == msg.sender, 'only owner');
    require(nftContract.balanceOf(address(this), _id) > 0, 'only staked');
    (uint change, bool win) = getChange(_id);
    nftContract.safeTransferFrom(address(this), stakes[_id].owner, _id, 1, '');
    nftContract.changeScore(_id, change, win, win ? change * 10**18 : 10**18);
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