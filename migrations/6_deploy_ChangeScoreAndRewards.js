const ChangeScoreAndRewards = artifacts.require('ChangeScoreAndRewards');

module.exports = async function (deployer) {
	await deployer.deploy(ChangeScoreAndRewards, '0xcdb47e685819638668ff736d1a2ae32b68e76ba5');
};
