const EthemeralLifeForce = artifacts.require("EthemeralLifeForce");

module.exports = async function(deployer) {
  await deployer.deploy(EthemeralLifeForce, "Ethemeral Life Force", "ELF");
};