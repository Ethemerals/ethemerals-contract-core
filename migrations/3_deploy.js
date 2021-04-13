const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");
const CryptoCoins = artifacts.require("CryptoCoins");
const CCGameMaster = artifacts.require("CCGameMaster");
const UniswapMock = artifacts.require('UniswapMockRouter');
const PriceFeed = artifacts.require('PriceFeed');

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoins, "https://cloudfront.net/api/meta/{id}", CryptoCoinsTokens.address);
  await deployer.deploy(UniswapMock);
  await deployer.deploy(PriceFeed, UniswapMock.address);
  await deployer.deploy(CCGameMaster, CryptoCoins.address, PriceFeed.address);
};
