const EthemeralArt = artifacts.require('EthemeralArt');

module.exports = async function (deployer) {
	await deployer.deploy(EthemeralArt);
};
