const PriceFeedProvider = artifacts.require('PriceFeedProvider');
const AggregatorV3Mock = artifacts.require('AggregatorV3Mock');

module.exports = async function (deployer, network) {
    await deployer.deploy(PriceFeedProvider);
    if (network === "test") {
        await deployer.deploy(AggregatorV3Mock, 8, 1);
    }
};
