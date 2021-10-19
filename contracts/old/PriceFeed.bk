// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// 0x4D0C7e0A2267eBa101A99F6CE39A226E8Ef54bB1
// import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface IUniV3Oracle {
    function getSpotPrice(address pool, uint32 period, uint128 baseAmount, address baseToken, address quoteToken) external view returns(uint256 quoteAmount);
}

contract PriceFeed {

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    IUniV3Oracle uniswap;

    struct PricePair {
        address pool;
        uint32 period;
        uint128 baseAmount;
        address baseToken;
        address quoteToken;
    }

    address admin;

    mapping (uint => PricePair) private priceFeeds;

    constructor(address UniV3SpotPriceAddress) {
        admin = msg.sender;
        uniswap = IUniV3Oracle(UniV3SpotPriceAddress); // use MOCK for kovan
    }

    function getPrice(uint _id) external view returns (uint) {
        return uniswap.getSpotPrice(
          priceFeeds[_id].pool,
          priceFeeds[_id].period,
          priceFeeds[_id].baseAmount,
          priceFeeds[_id].baseToken,
          priceFeeds[_id].quoteToken
        );
    }

    function addFeed(address _pool, uint32 _period, uint128 _baseAmount, address _baseToken, address _quoteToken, uint32 _id) external {
        require(msg.sender == admin, 'admin only');
        priceFeeds[_id] = PricePair(_pool, _period, _baseAmount, _baseToken, _quoteToken);
    }

    function transferOwnership(address newAdmin) external {
        require(msg.sender == admin, 'admin only');
        emit OwnershipTransferred(admin, newAdmin);
        admin = newAdmin;
    }

}