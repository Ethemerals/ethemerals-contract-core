const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const Battle = artifacts.require('EternalBattle');
const PriceFeed = artifacts.require('PriceFeedMock');

const nftAddress = '0xcDB47e685819638668FF736d1a2aE32b68E76BA5'; // RINKEBY

module.exports = async function (deployer) {
	await deployer.deploy(PriceFeedMock);
	await deployer.deploy(EternalBattle, nftAddress, PriceFeedMock.address);
};

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		priceFeed = await PriceFeed.new();
		battle = await Battle.new(game.address, priceFeed.address);

		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.mintReserve();
		await game.setMaxMeralIndex(1000, { from: admin });

		let mintAmount = 20;

		let value = await game.totalSupply();

		while (value.toNumber() < mintAmount) {
			await game.mintMeral(player1, { from: player1, value: web3.utils.toWei('0.0001') });
			value = await game.meralSupply();
			await time.increase(120);
		}

		await game.addDelegate(battle.address, true);
		await game.setAllowDelegates(true, { from: player1 });
	});

	it('should not allow admin only functions', async () => {
		await expectRevert(battle.transferOwnership(player2, { from: player1 }), 'admin only');
		await expectRevert(battle.setPriceFeedContract(player2, { from: player1 }), 'admin only');
		await expectRevert(battle.setStatsDivMod(1000, 1000, 1000, { from: player1 }), 'admin only');

		let mockPrice = 32 * 1000000;
		let token = 11;
		await expectRevert(battle.createStake(token, 1, 100, true, { from: player1 }), 'bounds');
		await priceFeed.updatePrice(1, mockPrice);
		await battle.createStake(token, 1, 100, true, { from: player1 });
		await expectRevert(battle.createStake(12, 1, 256, true, { from: player1 }), 'bounds');
		await expectRevert(battle.createStake(12, 1, 0, true, { from: player1 }), 'bounds');
		await expectRevert(battle.cancelStake(token, { from: player2 }), 'only owner');
		await expectRevert(battle.cancelStakeAdmin(token, { from: player1 }), 'admin only');

		await battle.cancelStake(token, { from: player1 });
		value = await game.ownerOf(token);
		assert(value === player1);
		await expectRevert(battle.cancelStake(token, { from: player1 }), 'only staked');

		await game.setAllowDelegates(true, { from: player2 });
		await game.transferFrom(player1, player2, token, { from: player1 });

		await priceFeed.updatePrice(1, mockPrice);
		await battle.createStake(token, 1, 100, true, { from: player2 });
		await battle.cancelStake(token, { from: player2 });
		value = await game.ownerOf(token);
		assert(value === player2);
	});

	it('should revert revive function', async () => {
		let mockPrice = 32 * 1000000;
		let token = 11;
		await priceFeed.updatePrice(1, mockPrice);
		await battle.createStake(token, 1, 100, true, { from: player1 });

		await expectRevert(battle.reviveToken(token, 1, { from: player1 }), 'only owner');
		await expectRevert(battle.reviveToken(12, 1, { from: admin }), 'only staked');

		await priceFeed.updatePrice(1, mockPrice * 0.8);
		await expectRevert(battle.reviveToken(token, 1, { from: admin }), 'not dead');

		await priceFeed.updatePrice(1, mockPrice * 0.1);

		await game.addDelegate(admin, true);
		await game.changeRewards(token, 1950, false, 0);
		await expectRevert(battle.reviveToken(token, 1, { from: admin }), 'needs ELF');

		await game.changeRewards(token, 1950, true, 0);

		meral1 = await game.getEthemeral(11);
		meral2 = await game.getEthemeral(1);

		m1v1 = parseInt(meral1[1].toString());
		m2v1 = parseInt(meral2[1].toString());

		await battle.reviveToken(token, 1, { from: admin });
		meral1 = await game.getEthemeral(11);
		meral2 = await game.getEthemeral(1);
		m1v2 = parseInt(meral1[1].toString());
		m2v2 = parseInt(meral2[1].toString());
		assert(m2v2 > m2v1);
		assert(m1v1 > m1v2);

		console.log(m1v1, m1v2);

		value = await game.ownerOf(token);
		assert(value === player1);
	});

	it('should transferOwnership', async () => {
		await battle.transferOwnership(player1, { from: admin });
		await battle.setStatsDivMod(5000, 6000, 7000, { from: player1 });
	});

	it('should revive 10 tokens', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 255, true, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}
		await priceFeed.updatePrice(1, mockPrice * 0.2);
		for (let i = 11; i < totalSupply; i++) {
			await battle.reviveToken(i, 1);
			meral = await game.getEthemeral(1);
			console.log('token', meral.toString());
		}
	});

	it('should create and cancel stake win', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let token = 11;
		await battle.createStake(token, 1, 100, true, { from: player1 });
		value = await game.ownerOf(token);
		assert(value == battle.address);

		await priceFeed.updatePrice(1, parseInt(mockPrice * 1.1));

		meral = await game.getEthemeral(token);
		console.log('token', meral.toString());

		await battle.cancelStake(token, { from: player1 });
		value = await game.ownerOf(token);
		assert(value == player1);

		meral = await game.getEthemeral(token);
		console.log('token', meral.toString());
	});

	it('should create and cancel stake x10 win', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, true, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}

		await priceFeed.updatePrice(1, parseInt(mockPrice * 1.1));

		console.log('UNSTAKE');

		for (let i = 11; i < totalSupply; i++) {
			await battle.cancelStake(i, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}
	});

	it('should create and cancel stake x10 lose', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, true, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}

		await priceFeed.updatePrice(1, parseInt(mockPrice - mockPrice * 0.1));

		console.log('UNSTAKE');

		for (let i = 11; i < totalSupply; i++) {
			await battle.cancelStake(i, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}
	});

	it('should short and lose', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, false, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}

		await priceFeed.updatePrice(1, parseInt(mockPrice * 1.1));

		console.log('UNSTAKE');

		for (let i = 11; i < totalSupply; i++) {
			await battle.cancelStake(i, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}
	});

	it('should short and win', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, false, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}

		await priceFeed.updatePrice(1, parseInt(mockPrice - mockPrice * 0.1));

		console.log('UNSTAKE');

		for (let i = 11; i < totalSupply; i++) {
			await battle.cancelStake(i, { from: player1 });
			meral = await game.getEthemeral(i);
			console.log('token', meral.toString());
		}
	});

	it('should unstake admin', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, true, { from: player1 });
		}

		value = battle.getStake(11);
		console.log(value.toString());

		meral = await game.getEthemeral(11);
		console.log(meral[0].toString());

		await priceFeed.updatePrice(1, parseInt(mockPrice - mockPrice * 0.1));
		value = await battle.getChange(11);
		console.log(value[0].toString());
		console.log(value[1].toString());
		console.log(value[2].toString());

		console.log('UNSTAKE');
		for (let i = 11; i < totalSupply; i++) {
			value = await game.ownerOf(i);
			assert(value == battle.address);
			await battle.cancelStakeAdmin(i);
			value = await game.ownerOf(i);
			assert(value == player1);
			meral = await game.getEthemeral(i);
			console.log(meral[0].toString(), meral[1].toString());
		}
	});

	it('should unstake admin', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		for (let i = 11; i < totalSupply; i++) {
			await battle.createStake(i, 1, 100, true, { from: player1 });
		}

		meral = await game.getEthemeral(11);
		console.log(meral[0].toString());

		await priceFeed.updatePrice(1, parseInt(mockPrice - mockPrice * 0.1));
		value = await battle.getChange(11);
		console.log(value[0].toString());
		console.log(value[1].toString());
		console.log(value[2].toString());

		console.log('UNSTAKE');
		for (let i = 11; i < totalSupply; i++) {
			value = await game.ownerOf(i);
			assert(value == battle.address);
			await battle.cancelStakeAdmin(i);
			value = await game.ownerOf(i);
			assert(value == player1);
			meral = await game.getEthemeral(i);
			console.log(meral[0].toString(), meral[1].toString());
		}
	});

	it('should run for a long time', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let totalSupply = await game.totalSupply();

		let run = 0;

		function getRandomInt(max) {
			return Math.floor(Math.random() * max);
		}

		while (run < 100) {
			// let stake = getRandomInt(255);
			// let price = mockPrice * (Math.random() * 0.5 + 0.75);
			let stake = getRandomInt(130) + 50;
			let price = mockPrice * (Math.random() * 0.2 + 0.9);

			for (let i = 11; i < totalSupply; i++) {
				await battle.createStake(i, 1, stake, true, { from: player1 });
			}

			await priceFeed.updatePrice(1, parseInt(price));

			console.log('UNSTAKE');

			for (let i = 11; i < totalSupply; i++) {
				await battle.cancelStake(i, { from: player1 });
				meral = await game.getEthemeral(i);
				console.log(`token_${i}`, meral.toString());
			}

			console.log('run', run, 'stake', stake, 'price', price);
			mockPrice = 32 * 1000000;
			run += 1;
			await time.increase(30);
		}
	});
});
