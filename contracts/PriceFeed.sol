// SPDX-License-Identifier: MIT

pragma solidity 0.8.3;

// 0x4D0C7e0A2267eBa101A99F6CE39A226E8Ef54bB1

interface IUniswapV2Router01 {
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
}

contract PriceFeed {

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    IUniswapV2Router01 uniswap;

    struct PricePair {
        address token0;
        address token1;
        uint amount;
    }

    address admin;

    mapping (uint => PricePair) private priceFeeds;

    constructor(address uniswapAddress) {
        admin = msg.sender;
        uniswap = IUniswapV2Router01(uniswapAddress); // use MOCK for kovan
    }

    function getPrice(uint _id) external view returns (uint) {
        address[] memory path = new address[](2);
        path[0] = priceFeeds[_id].token0;
        path[1] = priceFeeds[_id].token1;
        uint[] memory outs = uniswap.getAmountsOut(priceFeeds[_id].amount, path);
        return outs[1];
    }

    function addFeed(address _token0, address _token1, uint _amount, uint _id) external {
        require(msg.sender == admin, 'admin only');
        priceFeeds[_id] = PricePair(_token0, _token1, _amount);
    }

    function updatedUniswap(address uniswapAddress) external {
        require(msg.sender == admin, 'admin only');
        uniswap = IUniswapV2Router01(uniswapAddress);
    }

    function transferOwnership(address newAdmin) external {
        require(msg.sender == admin, 'admin only');
        emit OwnershipTransferred(admin, newAdmin);
        admin = newAdmin;
    }

}