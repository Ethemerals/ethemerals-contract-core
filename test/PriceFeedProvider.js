const { expectRevert } = require('@openzeppelin/test-helpers');
const PriceFeedProvider = artifacts.require('PriceFeedProvider');
const AggregatorV3Mock = artifacts.require('AggregatorV3Mock');

contract('PriceFeedProvider', () => {
	let priceFeedProvider;
	let decimals = 8;
	let intialAnswer = 1;
	let aggregatorV3Mock;

	beforeEach(async () => {
		priceFeedProvider = await PriceFeedProvider.new();
		aggregatorV3Mock = await AggregatorV3Mock.new(decimals, intialAnswer);
	});

	it('should return the initial answer from the Aggregator mock', async () => {
		let feedId = 1;
		await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);
		let latestPrice = await priceFeedProvider.getLatestPrice(feedId);
		assert(latestPrice.toNumber() === intialAnswer);
	});

	it('should return the updated answer from the Aggregator mock', async () => {
		let feedId = 1;
		await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);
		let updatedAnswer = 2;
		await aggregatorV3Mock.updateAnswer(updatedAnswer);
		let latestPrice = await priceFeedProvider.getLatestPrice(feedId);
		assert(latestPrice.toNumber() === updatedAnswer);
	});

	it('should handle two price feeds', async () => {
		let feedId1 = 1;
		await priceFeedProvider.upsertFeed(feedId1, aggregatorV3Mock.address);

		let feedId2 = 2;
		let initalAnswerFromFeedId2 = 2;
		let aggregatorV3Mock2 = await AggregatorV3Mock.new(decimals, initalAnswerFromFeedId2);
		await priceFeedProvider.upsertFeed(feedId2, aggregatorV3Mock2.address);

		let latestPriceFromFeed1 = await priceFeedProvider.getLatestPrice(feedId1);
		assert(latestPriceFromFeed1.toNumber() === intialAnswer);
		let latestPriceFromFeed2 = await priceFeedProvider.getLatestPrice(feedId2);
		assert(latestPriceFromFeed2.toNumber() === initalAnswerFromFeedId2);
	});

	it('should handle two price feeds after updates', async () => {
		let feedId1 = 1;
		await priceFeedProvider.upsertFeed(feedId1, aggregatorV3Mock.address);

		let feedId2 = 2;
		let initalAnswerFromFeedId2 = 2;
		let aggregatorV3Mock2 = await AggregatorV3Mock.new(decimals, initalAnswerFromFeedId2);
		await priceFeedProvider.upsertFeed(feedId2, aggregatorV3Mock2.address);

		let updatedAnswerFromFeed1 = 2;
		await aggregatorV3Mock.updateAnswer(updatedAnswerFromFeed1);
		let updatedAnswerFromFeed2 = 3;
		await aggregatorV3Mock2.updateAnswer(updatedAnswerFromFeed2);

		let latestPriceFromFeed1 = await priceFeedProvider.getLatestPrice(feedId1);
		assert(latestPriceFromFeed1.toNumber() === updatedAnswerFromFeed1);
		let latestPriceFromFeed2 = await priceFeedProvider.getLatestPrice(feedId2);
		assert(latestPriceFromFeed2.toNumber() === updatedAnswerFromFeed2);
	});

	it('should revert on invalid feed id', async () => {
		let feedId = 1;
		await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);
		let invalidFeedId = 2;
		await expectRevert(priceFeedProvider.getLatestPrice(invalidFeedId), 'invalid price feed id');
	});
});
