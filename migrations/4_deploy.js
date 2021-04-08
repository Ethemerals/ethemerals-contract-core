const CCGameMaster = artifacts.require("CCGameMaster");
const CryptoCoins = artifacts.require("CryptoCoins");

module.exports = async function(deployer) {
  await deployer.deploy(CCGameMaster, CryptoCoins.address);
};