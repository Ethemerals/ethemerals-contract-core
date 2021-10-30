// !!! This migration is only used for deployment to the Arbitrum Testnet for the migration tests

const EthemeralLifeForce = artifacts.require('EthemeralLifeForce');
const Ethemerals = artifacts.require('Ethemerals');

module.exports = async function (deployer) {
    await deployer.deploy(EthemeralLifeForce, 'Ethemeral Life Force', 'ELF');
    let ethemeralLifeForce = await EthemeralLifeForce.deployed();
    await deployer.deploy(Ethemerals, 'https://api.ethemerals.com/api/beta/', ethemeralLifeForce.address);
};

