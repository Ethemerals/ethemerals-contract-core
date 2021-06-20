const EthemeralLifeForce = artifacts.require('EthemeralLifeForce');
const Ethemerals = artifacts.require('Ethemerals');
const EternalBattle = artifacts.require('EternalBattle');
const UniV3OracleMock = artifacts.require('UniV3Oracle.sol'); // MOCK
const PriceFeed = artifacts.require('PriceFeed');

module.exports = async function (deployer) {
	await deployer.deploy(Ethemerals, 'https://api.ethemerals.com/api/', 'https://api.ethemerals.com/api/contract', EthemeralLifeForce.address, 'Ethemerals', 'ETHEM');
	await deployer.deploy(UniV3OracleMock);
	await deployer.deploy(PriceFeed, UniV3OracleMock.address); // CHANGE TO MAINNET ADDRESS
	await deployer.deploy(EternalBattle, Ethemerals.address, PriceFeed.address);
};
