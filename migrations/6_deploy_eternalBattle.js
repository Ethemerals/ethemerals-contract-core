const EternalBattle = artifacts.require('EternalBattle');
const PriceFeedProvider = artifacts.require('PriceFeedProvider');
const AggregatorV3Mock = artifacts.require('AggregatorV3Mock');

const nftAddress = '0xcDB47e685819638668FF736d1a2aE32b68E76BA5'; // RINKEBY

module.exports = async function (deployer) {
	await deployer.deploy(PriceFeedProvider);
	await deployer.deploy(AggregatorV3Mock, 8, 1);
	await deployer.deploy(AggregatorV3Mock, 18, 1);
	await deployer.deploy(EternalBattle, nftAddress, PriceFeedProvider.address);
};
