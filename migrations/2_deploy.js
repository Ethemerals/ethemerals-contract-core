const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoinsTokens, "CryptoCoinsTokens", "CCT");
};

// module.exports = async function(deployer) {
//   await deployer.deploy(CryptoCoins, "Crypto Coins","CCC", "https://d1b1rc939omrh2.cloudfront.net/");
// };