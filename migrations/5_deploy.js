const EggHolderRewards = artifacts.require('EggHolderRewards');

const nftAddress = '0xcDB47e685819638668FF736d1a2aE32b68E76BA5'; // RINKEBY

module.exports = async function (deployer) {
	await deployer.deploy(EggHolderRewards, nftAddress);
};
