const EthemeralLifeForce = artifacts.require("EthemeralLifeForce");
const Ethemerals = artifacts.require("Ethemerals");
const EternalBattle = artifacts.require("EternalBattle");
const UniswapMock = artifacts.require('UniswapMockRouter');
const PriceFeed = artifacts.require('PriceFeed');

module.exports = async function(deployer) {
  await deployer.deploy(Ethemerals, "https://d1b1rc939omrh2.cloudfront.net/api/meta/", "https://d1b1rc939omrh2.cloudfront.net/api/contract", EthemeralLifeForce.address, "Ethemerals", "MERAL");
  await deployer.deploy(UniswapMock);
  await deployer.deploy(PriceFeed, UniswapMock.address);
  await deployer.deploy(EternalBattle, Ethemerals.address, PriceFeed.address);

};
