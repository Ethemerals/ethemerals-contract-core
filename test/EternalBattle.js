const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const GM = artifacts.require('EternalBattle');
const UniswapMock = artifacts.require('UniV3Oracle');
const PriceFeed = artifacts.require('PriceFeed');

const prices = [];
let ethusd = 2201551910;
let add = 60229795;
for (let i = 0; i < 30; i++) {
	let _add = add * i;
	prices.push(ethusd + _add);
}

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', 'https://www.hello.com/contract', cct.address, 'CryptoCoins', 'CCN');
		uniswap = await UniswapMock.new();
		priceFeed = await PriceFeed.new(uniswap.address);
		gm = await GM.new(game.address, priceFeed.address);
		await game.addDelegate(admin, true);
	});

	const pool = '0xcbcdf9626bc03e24f779434178a73a0b4bad62ed';
	const token0 = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
	const token1 = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';

	const addFeed = async (_id) => {
		await priceFeed.addFeed(pool, 60, '1000000000000000000', token0, token1, _id);
	};

	const updatePrice = async () => {
		await uniswap.updatePrice(pool, prices[getRandomInt(prices.length - 1)]);
	};

	const updatePriceLow = async () => {
		await uniswap.updatePrice(pool, prices[0]);
	};

	const updatePriceHigh = async () => {
		await uniswap.updatePrice(pool, prices[prices.length - 1]);
	};

	const updatePriceCustom = async (price) => {
		await uniswap.updatePrice(pool, price);
	};

	function getRandomInt(max) {
		return Math.floor(Math.random() * max);
	}

	it('should create stake and cancel stake, owner only', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));

		await game.addDelegate(gm.address, true);

		await addFeed(1);
		await updatePrice();
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		owner = await game.ownerOf(10);
		assert(owner === player1);

		// value = await uniswap.getSpotPrice(pool, 60, '1000000000000000000', token0, token1);
		// console.log(value.toString());

		// value = await priceFeed.getPrice(1);
		// console.log(value.toString());

		// value = await gm.calcBps(2201551910, 2301551910);
		// console.log(value.toString());

		// value = await gm.getStake(10);
		// console.log(value.toString());

		// await gm.mockGetPrice(1);
		// value = await gm.testValue();
		// console.log(value.toString());

		await gm.createStake(10, 1, 100, true, { from: player1 });
		value = await gm.getStake(10);
		console.log(value.toString());

		owner = await game.ownerOf(10);
		assert(owner === gm.address);

		await expectRevert(gm.createStake(10, 1, 100, true, { from: player2 }), 'ERC721: transfer of token that is not own');
		await gm.createStake(12, 1, 100, true, { from: player1 });

		owner = await game.ownerOf(12);
		assert(owner === gm.address);

		await expectRevert(gm.cancelStake(12, { from: player2 }), 'only owner');

		await gm.cancelStake(12, { from: player1 }), (owner = await game.ownerOf(12));
		assert(owner === player1);
	});

	it('should stake and unstake and get bps', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await updatePrice();

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });

		owner = await game.ownerOf(10);
		assert(owner === player1);

		// await game.setApprovalForAll(gm.address, true, {from: player1});

		let token;
		let stake;
		let winnerMult;
		let winMultCRate;
		let winnerFunds;
		let leverage = 1;

		for (let i = 0; i < 40; i++) {
			if (i > 10) {
				leverage = 10;
			}
			if (i > 20) {
				leverage = 20;
			}
			if (i > 30) {
				leverage = 50;
			}

			await gm.createStake(10, 1, 100 * leverage, Math.random() > 0.5, { from: player1 });
			await time.increase(20);
			token = await game.getCoinById(10);
			stake = await gm.getStake(10);

			await updatePrice();
			await time.increase(20);

			await gm.cancelStake(10, { from: player1 });

			token = await game.getCoinById(10);
			console.log('STAKING TOKEN', token.score.toString(), web3.utils.fromWei(token.rewards));

			winnerMult = await game.winnerMult();
			winnerFunds = await game.winnerFunds();
			console.log('winning mult', winnerMult.toString());
			console.log('winning funds', web3.utils.fromWei(winnerFunds));
		}
	});

	it('should stake and get revived', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await updatePriceHigh();

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });
		await game.buy({ from: admin, value: web3.utils.toWei('1') });

		// await game.setApprovalForAll(gm.address, true, {from: player1});

		leverage = 50;
		await gm.createStake(10, 1, 100, true, { from: player1 });

		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('STAKING TOKEN', token.score.toString(), token.rewards.toString());

		await updatePriceCustom(10000);
		await gm.createStake(10, 1, 20000, true, { from: player1 });

		await updatePriceCustom(5000);
		console.log('REVIVING');
		await gm.reviveToken(10, 11, false, { from: player2 });
		token = await game.getCoinById(11);
		console.log('ANGEL', token.score.toString(), token.rewards.toString());

		token = await game.getCoinById(10);
		console.log('STAKING TOKEN', token.score.toString(), token.rewards.toString());
	});

	it('should stake and get reaped', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));

		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await updatePrice();

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });
		await game.buy({ from: admin, value: web3.utils.toWei('1') });

		owner = await game.ownerOf(10);
		assert(owner === player1);

		// await game.setApprovalForAll(gm.address, true, {from: player1});

		leverage = 50;
		await gm.createStake(10, 1, 100, true, { from: player1 });
		await expectRevert(gm.reviveToken(10, 11, true, { from: player2 }), 'not dead');

		await expectRevert(gm.reviveToken(10, 12, true, { from: player2 }), 'only owner');

		await expectRevert(gm.reviveToken(11, 12, true, { from: admin }), 'only staked');

		await updatePrice();
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('STAKING TOKEN', token.score.toString(), token.rewards.toString());

		await updatePriceHigh();
		await gm.createStake(10, 1, 10000, true, { from: player1 });

		await updatePriceLow();
		console.log('REAPING');
		await gm.reviveToken(10, 11, true, { from: player2 });
		token = await game.getCoinById(11);
		console.log('REAPER', token.score.toString(), token.rewards.toString());

		owner = await game.ownerOf(10);
		assert(owner === player2);

		token = await game.getCoinById(10);
		console.log('STAKING TOKEN', token.score.toString(), token.rewards.toString());
	});

	it('should stake and get ressurected with eth', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		// await game.setApprovalForAll(gm.address, true, {from: player1});
		await updatePriceCustom('1545941301857663049');
		// 100 position
		await gm.createStake(10, 1, 20000, true, { from: player1 });
		await updatePriceCustom('1415941301857663049');
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log(token.score.toString(), token.rewards.toString());
		await expectRevert(game.resurrectWithEth(10, { from: player1, value: web3.utils.toWei('0.005') }), 'not enough');

		await game.resurrectWithEth(10, { from: player1, value: web3.utils.toWei('1') });
		token = await game.getCoinById(10);
		console.log(token.score.toString(), token.rewards.toString());
		await expectRevert(game.resurrectWithEth(10, { from: player1, value: web3.utils.toWei('1') }), 'not dead');
		// balance = await web3.eth.getBalance(admin);
		// console.log('admin', balance.toString());
		// await gm.withdraw(admin, {from: admin});
		// balance = await web3.eth.getBalance(gm.address);
		// console.log('gm', balance.toString());
		// balance = await web3.eth.getBalance(admin);
		// console.log('admin', balance.toString());
	});

	it('should stake and get ressurected with token', async () => {
		await cct.transfer(game.address, web3.utils.toWei('42000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		await updatePriceCustom('1545941301857663049');
		// 100 position
		await gm.createStake(10, 1, 20000, true, { from: player1 });
		await updatePriceCustom('1415941301857663049');
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log(token.score.toString(), token.rewards.toString());
		await expectRevert(game.resurrectWithToken(10, { from: player1 }), 'not enough');

		await cct.transfer(player1, web3.utils.toWei('100000'));
		await cct.approve(game.address, web3.utils.toWei('10000000000'), { from: player1 });

		tokenBalance = await cct.balanceOf(player1);
		console.log(tokenBalance.toString());

		await game.resurrectWithToken(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log(token.score.toString(), token.rewards.toString());
		await expectRevert(game.resurrectWithToken(10, { from: player1 }), 'not dead');

		tokenBalance = await cct.balanceOf(player1);
		console.log(tokenBalance.toString());
	});

	it('should set revive by token price', async () => {
		revivePrice = await game.revivePrice();

		await game.setPrice(web3.utils.toWei('21'), false);
		revivePrice = await game.revivePrice();
		assert(revivePrice.toString() === '21000000000000000000');
	});

	it('should stake and unstake by admin', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));

		await game.addDelegate(gm.address, true);

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		owner = await game.ownerOf(10);
		assert(owner === player1);

		// await game.setApprovalForAll(gm.address, true, {from: player1});

		await gm.createStake(10, 1, 100, true, { from: player1 });

		await expectRevert(gm.cancelStakeAdmin(10, { from: player2 }), 'admin only');

		await gm.cancelStakeAdmin(10, { from: admin });

		owner = await game.ownerOf(10);
		assert(owner === player1);
	});

	it('should stake and cancel stake with different prices', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await updatePriceCustom('1530541301857663049');

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });
		await game.buy({ from: admin, value: web3.utils.toWei('1') });

		// await game.setApprovalForAll(gm.address, true, {from: player2});
		// await game.setApprovalForAll(gm.address, true, {from: player1});
		// await game.setApprovalForAll(gm.address, true, {from: admin});

		// 100 position
		await gm.createStake(10, 1, 1000, true, { from: player1 });
		await updatePriceCustom('1545941301857663049');
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('position size 1000', token.score.toString(), token.rewards.toString());

		// 1000 position
		await updatePriceCustom('1530541301857663049');
		await gm.createStake(11, 1, 5000, true, { from: player2 });
		await updatePriceCustom('1545941301857663049');
		await gm.cancelStake(11, { from: player2 });
		token = await game.getCoinById(11);
		console.log('position size 5000', token.score.toString(), token.rewards.toString());

		// 5000 position
		await updatePriceCustom('1530541301857663049');
		await gm.createStake(12, 1, 10000, true, { from: admin });
		await updatePriceCustom('1545941301857663049');
		await gm.cancelStake(12, { from: admin });
		token = await game.getCoinById(12);
		console.log('position size 10000', token.score.toString(), token.rewards.toString());

		// 20000 position
		await updatePriceCustom('1530541301857663049');
		await gm.createStake(10, 1, 20000, true, { from: player1 });
		await updatePriceCustom('1545941301857663049');
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('position size 20000', token.score.toString(), token.rewards.toString());
	});

	it('should stake and cancel stake with different positions', async () => {
		await cct.transfer(game.address, web3.utils.toWei('420000000'));
		await game.addDelegate(gm.address, true);
		await addFeed(1);
		await updatePriceCustom(1000);

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });
		await game.buy({ from: admin, value: web3.utils.toWei('1') });

		// await game.setApprovalForAll(gm.address, true, {from: player2});
		// await game.setApprovalForAll(gm.address, true, {from: player1});
		// await game.setApprovalForAll(gm.address, true, {from: admin});

		value = await game.winnerFunds();
		console.log('winner funds', web3.utils.fromWei(value));

		// 100 position
		await gm.createStake(10, 1, 1000, true, { from: player1 });
		await updatePriceCustom(1100);
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('position size 1000', token.score.toString(), web3.utils.fromWei(token.rewards));

		value = await game.winnerFunds();
		console.log('winner funds', web3.utils.fromWei(value));

		// 1000 position
		await updatePriceCustom(1000);
		await gm.createStake(11, 1, 5000, true, { from: player2 });
		await updatePriceCustom(1100);
		await gm.cancelStake(11, { from: player2 });
		token = await game.getCoinById(11);
		console.log('position size 5000', token.score.toString(), web3.utils.fromWei(token.rewards));

		value = await game.winnerFunds();
		console.log('winner funds', web3.utils.fromWei(value));

		// 5000 position
		await updatePriceCustom(1000);
		await gm.createStake(12, 1, 10000, true, { from: admin });
		await updatePriceCustom(1100);
		await gm.cancelStake(12, { from: admin });
		token = await game.getCoinById(12);
		console.log('position size 10000', token.score.toString(), web3.utils.fromWei(token.rewards));

		value = await game.winnerFunds();
		console.log('winner funds', web3.utils.fromWei(value));

		// 20000 position
		await updatePriceCustom(1000);
		await gm.createStake(10, 1, 20000, true, { from: player1 });
		await updatePriceCustom(1100);
		await gm.cancelStake(10, { from: player1 });
		token = await game.getCoinById(10);
		console.log('position size 20000', token.score.toString(), web3.utils.fromWei(token.rewards));

		value = await game.winnerFunds();
		console.log('winner funds', web3.utils.fromWei(value));
	});

	it('should set GM values and ownership', async () => {
		let value;
		await gm.setReviverRewards(50, 50);

		value = await gm.reviverScorePenalty();
		assert(value.toString() === '50');
		value = await gm.reviverTokenReward();
		assert(value.toString() === '50');

		await gm.transferOwnership(player1);
		await gm.setReviverRewards(100, 100, { from: player1 });
		value = await gm.reviverScorePenalty();
		assert(value.toString() === '100');
		value = await gm.reviverTokenReward();
		assert(value.toString() === '100');

		await expectRevert(gm.setReviverRewards(10, 11, { from: player2 }), 'admin only');
	});
});
