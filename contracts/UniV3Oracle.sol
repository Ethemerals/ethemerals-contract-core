// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// MOCK
contract UniV3Oracle {

    // mapping of addresses to addresses to uint
    mapping (address => uint) private priceFeeds;

    function getSpotPrice(address pool, uint32 period, uint128 baseAmount, address baseToken, address quoteToken) external view returns(uint256 quoteAmount){
        return priceFeeds[pool];
    }

    function updatePrice(address pool, uint price) external {
        priceFeeds[pool] = price;
    }

}