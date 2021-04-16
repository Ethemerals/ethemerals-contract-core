const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");
const CryptoCoins = artifacts.require("CryptoCoins");
const GameMaster = artifacts.require("GameMaster");
const UniswapMock = artifacts.require('UniswapMockRouter');
const PriceFeed = artifacts.require('PriceFeed');

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoins, "https://cloudfront.net/api/meta/{id}", "https://www.hello.com", CryptoCoinsTokens.address);
  await deployer.deploy(UniswapMock);
  await deployer.deploy(PriceFeed, UniswapMock.address);
  await deployer.deploy(GameMaster, CryptoCoins.address, PriceFeed.address);
};
