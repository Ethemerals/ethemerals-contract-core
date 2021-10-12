const EthemeralLifeForceX = artifacts.require('EthemeralLifeForceX');

const nftAddress = '0xcDB47e685819638668FF736d1a2aE32b68E76BA5'; // RINKEBY

module.exports = async function (deployer) {
	let timestamp = Math.floor(Date.now() / 1000);
	timestamp = 1633117329;
	await deployer.deploy(EthemeralLifeForceX, 'EthemeralLifeForce', 'ELFX', nftAddress, timestamp);
};

// module.exports = async function (deployer) {
// 	await deployer.deploy(EternalBattle, '0xcD9AdEEf8b68C61984348B2F379bA38b8Bd9BbF9', '0x1e704437f1323FDA08358cedf5a3f9619fA11fc1');
// };
