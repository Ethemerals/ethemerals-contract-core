const CryptoCoins = artifacts.require("CryptoCoins");
const CryptoCoinsTokens = artifacts.require("CryptoCoinsTokens");

module.exports = async function(deployer) {
  await deployer.deploy(CryptoCoins, "https://d1b1rc939omrh2.cloudfront.net/api/meta/{id}", CryptoCoinsTokens.address);
};

// module.exports = async function(deployer) {
//   await deployer.deploy(CryptoCoins, "Crypto Coins","CCC", "https://d1b1rc939omrh2.cloudfront.net/");
// };