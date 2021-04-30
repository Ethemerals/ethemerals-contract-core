// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

contract UniswapMockRouter {

    // mapping of addresses to addresses to uint
    mapping (address => mapping (address => uint)) private priceFeeds;

    function getAmountsOut(uint amountIn, address[] memory path) external view returns (uint[] memory amounts) {
        uint[] memory result = new uint[](2);
        result[0] = amountIn;
        result[1] = priceFeeds[path[0]][path[1]];
        return result;
    }

    function updatePrice(address _token0, address _token1, uint price) external {
        priceFeeds[_token0][_token1] = price;
    }

}