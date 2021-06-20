const EthemeralLifeForce = artifacts.require('EthemeralLifeForce');
const Ethemerals = artifacts.require('Ethemerals');
const EternalBattle = artifacts.require('EternalBattle');
const UniV3Oracle = artifacts.require('UniV3Oracle'); // MOCK
const PriceFeed = artifacts.require('PriceFeed');

const nftAddress = '0xcD9AdEEf8b68C61984348B2F379bA38b8Bd9BbF9'; // KOVAN

module.exports = async function (deployer) {
	await deployer.deploy(Ethemerals, 'https://api.ethemerals.com/api/', 'https://api.ethemerals.com/api/contract', EthemeralLifeForce.address, 'Ethemerals', 'ETHEM');
	await deployer.deploy(UniV3Oracle);
	await deployer.deploy(PriceFeed, UniV3Oracle.address); // CHANGE TO MAINNET ADDRESS
	await deployer.deploy(EternalBattle, Ethemerals.address, PriceFeed.address);
};
