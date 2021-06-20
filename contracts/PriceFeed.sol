// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// 0x4D0C7e0A2267eBa101A99F6CE39A226E8Ef54bB1

interface IUniV3Oracle {
    function getSpotPrice(address pool, uint32 period, uint128 baseAmount, address baseToken, address quoteToken) external view returns(uint256 quoteAmount);
}

contract PriceFeed {

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeedAdded(address pool, address baseToken, address quoteToken, uint32 id);

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
        emit FeedAdded(_pool, _baseToken, _quoteToken, _id);
    }

    function updateUniswap(address UniV3SpotPriceAddress) external {
        require(msg.sender == admin, 'admin only');
        uniswap = IUniV3Oracle(UniV3SpotPriceAddress);
    }

    function transferOwnership(address newAdmin) external {
        require(msg.sender == admin, 'admin only');
        emit OwnershipTransferred(admin, newAdmin);
        admin = newAdmin;
    }

}