const PriceFeedProvider = artifacts.require('PriceFeedProvider');
const AggregatorV3Mock = artifacts.require('AggregatorV3Mock');
const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const Battle = artifacts.require('EternalBattle');

contract('EternalBattle', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];
	let priceFeedProvider;
	let decimals = 8;
	let intialAnswer = 1;
	let aggregatorV3Mock;

	beforeEach(async () => {
		priceFeedProvider = await PriceFeedProvider.new();
		aggregatorV3Mock = await AggregatorV3Mock.new(decimals, intialAnswer);
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		battle = await Battle.new(game.address, priceFeedProvider.address);

		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.mintReserve();
		await game.setMaxMeralIndex(1000, { from: admin });

		let mintAmount = 40;

		let value = await game.totalSupply();

		while (value.toNumber() < mintAmount) {
			await game.mintMeral(player1, { from: player1, value: web3.utils.toWei('0.0001') });
			value = await game.meralSupply();
			await time.increase(120);
		}

		await game.addDelegate(battle.address, true);
		await game.setAllowDelegates(true, { from: player1 });

		await battle.resetGamePair(1, true);
		await battle.resetGamePair(2, true);
	});

	it('should update price mock', async () => {
		let feedId = 1;
		await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);

		let mockPriceAnswer1 = 828935030000000;

		await aggregatorV3Mock.updateAnswer(mockPriceAnswer1);
		latestPrice = await priceFeedProvider.getLatestPrice(feedId);
		assert(latestPrice.toNumber() === mockPriceAnswer1);

		let mockPriceAnswer2 = 911735030000000;
		await aggregatorV3Mock.updateAnswer(mockPriceAnswer2);
		latestPrice = await priceFeedProvider.getLatestPrice(feedId);
		assert(latestPrice.toNumber() === mockPriceAnswer2);
	});

	it('should work with 8 or 18 decimal price with provider', async () => {
		let feedId = 1;
		await priceFeedProvider.upsertFeed(feedId, aggregatorV3Mock.address);

		mockPrice = web3.utils.toBN('828935030000000');
		await aggregatorV3Mock.updateAnswer(mockPrice);

		let token = 11;
		await battle.createStake(token, 1, 100, true, { from: player1 });
		meral = await game.getEthemeral(token);
		console.log('token', meral.toString());

		mockPrice = web3.utils.toBN('911735030000000');
		await aggregatorV3Mock.updateAnswer(mockPrice);

		await battle.cancelStake(token, { from: player1 });

		meral = await game.getEthemeral(token);
		console.log('token', meral.toString());
	});

	it('should run for a long time on two price feeds', async () => {
		await priceFeedProvider.upsertFeed(1, aggregatorV3Mock.address);

		let aggregatorV3Mock2 = await AggregatorV3Mock.new(decimals, 2);
		await priceFeedProvider.upsertFeed(2, aggregatorV3Mock2.address);

		////
		let mockPrice1 = 32 * 1000000;
		let mockPrice2 = 64 * 1000000;

		await aggregatorV3Mock.updateAnswer(mockPrice1);
		await aggregatorV3Mock2.updateAnswer(mockPrice2);

		let totalSupply = await game.totalSupply();

		let run = 0;

		function getRandomInt(max) {
			return Math.floor(Math.random() * max);
		}

		while (run < 25) {
			let stake = getRandomInt(130) + 50;
			let price1 = parseInt(mockPrice1 * (Math.random() * 0.1 + 0.95));
			let price2 = parseInt(mockPrice2 * (Math.random() * 0.1 + 0.95));

			for (let i = 11; i < totalSupply; i++) {
				let long = true;
				if (getRandomInt(2) === 0) {
					long = true;
				} else {
					long = false;
				}
				await battle.createStake(i, getRandomInt(2) + 1, 255, long, { from: player1 });
			}

			await aggregatorV3Mock.updateAnswer(price1);
			await aggregatorV3Mock2.updateAnswer(price2);

			gamePair = await battle.getGamePair(1);
			console.log('game1', gamePair.toString());
			gamePair = await battle.getGamePair(2);
			console.log('game2', gamePair.toString());
			console.log('UNSTAKE');

			for (let i = 11; i < totalSupply; i++) {
				await battle.cancelStake(i, { from: player1 });
				meral = await game.getEthemeral(i);
				console.log(`token_${i}`, meral.toString());
			}

			console.log('run', run, 'stake', stake);

			// RESET
			mockPrice1 = 32 * 1000000;
			mockPrice2 = 64 * 1000000;
			await aggregatorV3Mock.updateAnswer(mockPrice1);
			await aggregatorV3Mock2.updateAnswer(mockPrice2);
			run += 1;
			// await time.increase(30);
		}
	});
});
