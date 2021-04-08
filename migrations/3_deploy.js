const CryptoCoins = artifacts.require("CryptoCoins");
const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoins, "https://cloudfront.net/api/meta/{id}", CryptoCoinsTokens.address);
};