// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

// MOCK
contract UniV3SpotPrice {

    // mapping of addresses to addresses to uint
    mapping (address => uint) private priceFeeds;

    /// @param pool Address of Uniswap V3 pool that we want to observe
    /// @param period Number of seconds in the past to start calculating time-weighted average
    /// @param baseAmount Amount of token to be converted
    /// @param baseToken Address of an ERC20 token contract used as the baseAmount denomination
    /// @param quoteToken Address of an ERC20 token contract used as the quoteAmount denomination
    /// @return quoteAmount Amount of quoteToken received for baseAmount of baseToken
    function getSpotPrice(address pool, uint32 period, uint128 baseAmount, address baseToken, address quoteToken) external view returns(uint256 quoteAmount){
        return priceFeeds[pool];
    }

    function updatePrice(address pool, uint price) external {
        priceFeeds[pool] = price;
    }

}