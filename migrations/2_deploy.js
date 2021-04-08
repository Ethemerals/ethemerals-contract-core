const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoinsTokens, "CryptoCoinsTokens", "CCT");
};