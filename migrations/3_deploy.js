const EthemeralLifeForce = artifacts.require('EthemeralLifeForce');
const Ethemerals = artifacts.require('Ethemerals');
const EthemeralEquipables = artifacts.require('EthemeralEquipables');
// const EternalBattle = artifacts.require('EternalBattle');
const UniV3Oracle = artifacts.require('UniV3Oracle'); // MOCK
const PriceFeed = artifacts.require('PriceFeed');

const nftAddress = '0xcD9AdEEf8b68C61984348B2F379bA38b8Bd9BbF9'; // KOVAN

module.exports = async function (deployer) {
	await deployer.deploy(Ethemerals, 'https://api.ethemerals.com/api/', EthemeralLifeForce.address);
	await deployer.deploy(EthemeralEquipables, 'https://api.ethemerals.com/api/equipment/', Ethemerals.address);
	// await deployer.deploy(UniV3Oracle);
	// await deployer.deploy(PriceFeed, UniV3Oracle.address); // CHANGE TO MAINNET ADDRESS
	// await deployer.deploy(EternalBattle, Ethemerals.address, PriceFeed.address);
};

// module.exports = async function (deployer) {
// 	await deployer.deploy(EternalBattle, '0xcD9AdEEf8b68C61984348B2F379bA38b8Bd9BbF9', '0x1e704437f1323FDA08358cedf5a3f9619fA11fc1');
// };
