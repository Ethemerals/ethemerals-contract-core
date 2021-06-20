const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const GM = artifacts.require('EternalBattle');
const UniswapMock = artifacts.require('UniV3Oracle');
const PriceFeed = artifacts.require('PriceFeed');

const prices = [];
let ethusd = 191022979575;
let add = 6022979575;
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
		await priceFeed.addFeed(pool, 60, '1000', token0, token1, _id);
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

	it('should NOT mint if not admin', async () => {
		await expectRevert(game.mint(player1, 0, { from: player1 }), 'delegates only');
	});

	it('should get and set contractURI', async () => {
		let value = await game.contractURI();

		await game.mint(player1, 10, { from: admin }), console.log(value.toString());
		await game.setContractURI('https://www.whatsupdoc.com');

		value = await game.contractURI();
		console.log(value.toString());
		assert(value.toString() == 'https://www.whatsupdoc.com');

		value = await game.tokenURI(10);
		console.log(value.toString());

		await game.setBaseURI('heelowWorld/');
		value = await game.tokenURI(10);
		console.log(value.toString());

		await expectRevert(game.setContractURI('heelowWorld/', { from: player1 }), 'admin only');

		await expectRevert(game.setBaseURI('heelowWorld/', { from: player1 }), 'admin only');
	});

	it('it Should mint a token', async () => {
		const amount = 10;
		await game.mint(admin, 1);

		const owner = await game.ownerOf(1);
		assert(owner === admin);
	});

	it('it Should mint a token to player1', async () => {
		const amount = 10;
		await game.mint(player1, 1);

		const owner = await game.ownerOf(1);
		assert(owner === player1);
	});

	it('should set MintPrice and buy', async () => {
		await game.setAvailableCoins([1, 2]);
		await game.setPrice(web3.utils.toWei('1'), true);
		let balance = await web3.eth.getBalance(player2);

		for (let i = 0; i < 20; i++) {
			await game.buy({ from: player2, value: web3.utils.toWei('1') });
			await time.increase(1);
		}

		// check balance of p2

		balance = await web3.eth.getBalance(player2);

		await expectRevert(game.buy({ from: player2, value: web3.utils.toWei('1') }), 'no more');

		balance = await web3.eth.getBalance(player2);

		// get more editions
		await game.setAvailableCoins([3, 4]);
		await game.setPrice(web3.utils.toWei('10'), true);

		for (let i = 0; i < 4; i++) {
			await game.buy({ from: player1, value: web3.utils.toWei('10') });
			await time.increase(1);
		}

		const newBalance = await web3.eth.getBalance(player1);
		assert(newBalance < balance);
	});

	it('should set MintPrice and buy at discount', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player2, value: web3.utils.toWei('1') });

		owner = await game.ownerOf(10);
		assert(owner === player2);

		await game.buy({ from: admin, value: web3.utils.toWei('0.75') });

		owner = await game.ownerOf(11);
		assert(owner === admin);
	});

	it('should grant Minter role to player1 and mint token', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);

		const amount = 10;
		await game.addDelegate(player1, true);
		await game.mint(player2, 1, { from: player1 });

		// TODO
		owner = await game.ownerOf(1);
		assert(owner === player2);

		await game.addDelegate(admin, false);
		await expectRevert(game.mint(player1, 1, { from: admin }), 'delegates only');
	});

	it('should Mint 20 tokens', async () => {
		await expectRevert(game.buy({ from: player1, value: web3.utils.toWei('100') }), 'no more');

		await game.setAvailableCoins([1, 2]);
		await game.setPrice(web3.utils.toWei('1'), true);
		let availableCoins = await game.getAvailableCoins();
		console.log('availableCoins', availableCoins.toString());

		for (let i = 0; i < 20; i++) {
			await game.buy({ from: player1, value: web3.utils.toWei('1') });
			await time.increase(10);
		}

		availableCoins = await game.getAvailableCoins();
		console.log('availableCoins', availableCoins.toString());

		for (let i = 10; i < 30; i++) {
			owner = await game.ownerOf(i);
			assert(owner === player1);
		}

		await expectRevert(game.buy({ from: player1, value: web3.utils.toWei('1') }), 'no more');
	});

	it('should Mint odd numbers', async () => {
		await game.setAvailableCoins([1, 2]);
		await game.setAvailableCoin(5);
		await game.setPrice(web3.utils.toWei('0.001'), true);

		for (let i = 0; i < 30; i++) {
			await game.buy({ from: player1, value: web3.utils.toWei('0.001') }), await time.increase(1);
		}

		await expectRevert(game.buy({ from: player1, value: web3.utils.toWei('0.001') }), 'no more');

		await game.setAvailableCoins([5, 6]);

		for (let i = 0; i < 10; i++) {
			await game.buy({ from: player1, value: web3.utils.toWei('0.001') }), await time.increase(1);
		}

		await expectRevert(game.buy({ from: player1, value: web3.utils.toWei('0.001') }), 'no more');

		for (let i = 60; i < 70; i++) {
			owner = await game.ownerOf(i);
			assert(owner === player1);
		}
	});

	it('should Mint then return coin with 300 score', async () => {
		await game.setAvailableCoins([5, 6]);
		await game.setPrice(web3.utils.toWei('0.001'), true);

		for (let i = 0; i < 20; i++) {
			await game.buy({ from: player1, value: web3.utils.toWei('0.001') }), await time.increase(1);
		}

		const coin = await game.getCoinById(58);
		const coin2 = await game.getCoinById(55);
		assert(coin.id == 58);
		assert(coin.score == 300);
		assert(coin.rewards == web3.utils.toWei('1000'));
		assert(coin2.id == 55);
		assert(coin2.score == 300);
		assert(coin2.rewards == web3.utils.toWei('1000'));
	});

	it('should NOT buy without enough ETH', async () => {
		await game.setAvailableCoins([1, 2]);
		await game.setPrice(web3.utils.toWei('1'), true);

		await expectRevert(game.buy({ from: player1, value: web3.utils.toWei('0.5') }), 'not enough');

		await expectRevert(game.buy({ from: admin, value: web3.utils.toWei('0.7') }), 'not enough');

		await game.buy({ from: admin, value: web3.utils.toWei('0.75') });
	});

	// TODO
	it('should Update token score', async () => {
		await game.addDelegate(admin, true);
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		let token = await game.getCoinById(10);
		console.log(token.score);
		await game.changeScore(10, 250, true, '0');

		token = await game.getCoinById(10);
		assert(token.score == 550);
		console.log(token.score);

		await game.changeScore(10, 500, true, '0');
		token = await game.getCoinById(10);
		assert(token.score == 1000);
		await game.changeScore(10, 600, false, '0');
		token = await game.getCoinById(10);
		assert(token.score == 400);
		await game.changeScore(10, 600, false, '0');
		token = await game.getCoinById(10);
		assert(token.score == 0);

		await game.addDelegate(admin, false);
		await expectRevert(game.changeScore(10, 600, false, '0'), 'delegates only');
	});

	it('should redeem tokens', async () => {
		// Transfer CCT
		await cct.transfer(game.address, web3.utils.toWei('100000000'));
		let value = await cct.balanceOf(game.address);
		assert(value.toString() === web3.utils.toWei('100000000'));
		console.log(value.toString());

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		let token = await game.getCoinById(10);
		let rewards = token.rewards;

		await game.redeemTokens(10, { from: player1 });
		value = await cct.balanceOf(player1);
		assert(rewards.toString() === value.toString());

		token = await game.getCoinById(10);
		rewards = token.rewards;
		assert(rewards.toString() === '0');

		value = await cct.balanceOf(game.address);
		console.log(value.toString());
	});

	it('should NOT redeem tokens', async () => {
		// Transfer CCT
		await cct.transfer(game.address, web3.utils.toWei('100000000'));
		value = await cct.balanceOf(game.address);
		assert(value.toString() === web3.utils.toWei('100000000'));

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		await expectRevert(game.redeemTokens(10, { from: player2 }), 'owner only');

		value = await cct.balanceOf(player1);
		assert(value.toString() === '0');
	});

	it('should add rewards tokens to NFT token', async () => {
		// Transfer CCT
		await game.addDelegate(admin, true);
		await cct.transfer(game.address, web3.utils.toWei('100000000'));
		let value = await cct.balanceOf(game.address);
		assert(value.toString() === web3.utils.toWei('100000000'));

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		await game.changeScore(10, 0, false, web3.utils.toWei('100'));

		let token = await game.getCoinById(10);
		let rewards = token.rewards;
		assert(rewards.toString() === web3.utils.toWei('1100'));

		await game.redeemTokens(10, { from: player1 });
		value = await cct.balanceOf(player1);
		assert(rewards.toString() === value.toString());
	});

	it('should NOT add score and rewards to non existent', async () => {
		// Transfer CCT
		await cct.transfer(game.address, web3.utils.toWei('100000000'));
		let value = await cct.balanceOf(game.address);
		assert(value.toString() === web3.utils.toWei('100000000'));

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		await expectRevert(game.changeScore(10, 100, true, '0', { from: player1 }), 'delegates only');
	});

	it('should grant GM role to player1 and change score', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.addDelegate(player1, true);
		await game.buy({ from: player2, value: web3.utils.toWei('1') });

		let count = 0;
		while (count < 20) {
			await game.changeScore(10, 0, false, web3.utils.toWei('200'), { from: player1 });
			await time.increase(1);
			count++;
		}

		await expectRevert(game.changeScore(10, 0, false, web3.utils.toWei('200'), { from: player2 }), 'delegates only');

		let value = await game.winnerFunds();
		console.log(value.toString());
	});

	it('should increase winnerFund and redeem', async () => {
		await game.addDelegate(admin, true);
		await cct.transfer(game.address, web3.utils.toWei('100000000'));
		let balance = await cct.balanceOf(game.address);

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		let count = 0;
		while (count < 20) {
			await game.changeScore(10, 0, false, web3.utils.toWei('200'));
			await time.increase(1);
			count++;
		}

		let value = await game.winningCoin();
		console.log(value.toString());

		await game.redeemWinnerFunds(10, { from: player1 });
		balance = await cct.balanceOf(player1);
		console.log(balance.toString());

		assert(web3.utils.fromWei(balance.toString()) == '128');
	});

	it('should update winning coin and redeem', async () => {
		await game.addDelegate(admin, true);
		await cct.transfer(game.address, web3.utils.toWei('100000000'));

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });

		await game.changeScore(10, 0, false, web3.utils.toWei('200'));
		let value = await game.winningCoin();
		assert(value.toString() == '10');
		await game.changeScore(11, 0, false, web3.utils.toWei('300'));
		value = await game.winningCoin();
		assert(value.toString() == '11');

		await game.redeemWinnerFunds(11, { from: player2 });
		balance = await cct.balanceOf(player2);
		console.log(balance.toString());

		await game.changeScore(10, 0, false, web3.utils.toWei('200'));
		value = await game.winningCoin();
		assert(value.toString() == '10');
	});

	it('should keep scoring even without funds', async () => {
		await game.addDelegate(admin, true);
		await cct.transfer(game.address, web3.utils.toWei('20'));
		let balance = await cct.balanceOf(game.address);
		let value = await game.winnerFunds();

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });

		let count = 0;
		while (count < 20) {
			await game.changeScore(10, 0, false, web3.utils.toWei('200'));
			await time.increase(1);
			count++;
		}

		value = await game.winnerFunds();
		console.log('winner funds', value.toString());
		assert(value.toString() == web3.utils.toWei('128'));
		balance = await cct.balanceOf(game.address);

		await expectRevert(game.redeemWinnerFunds(10, { from: player1 }), 'no funds');
	});

	it('should update multiplier', async () => {
		await game.addDelegate(admin, true);
		await cct.transfer(game.address, web3.utils.toWei('420000000'));

		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.buy({ from: player2, value: web3.utils.toWei('1') });

		let count = 0;
		let value;
		while (count < 220) {
			await game.changeScore(10, 0, false, web3.utils.toWei('10'));
			await time.increase(1);
			count++;
		}

		value = await game.winnerMult();
		assert(value.toString() == '10');

		value = await game.winnerFunds();
		await game.redeemWinnerFunds(10, { from: player1 });

		// reset mult
		await game.changeScore(11, 0, true, web3.utils.toWei('10'));
		value = await game.winnerMult();
		assert(value.toString() == '1');

		count = 0;
		while (count < 100) {
			await game.changeScore(11, 0, false, web3.utils.toWei('10'));
			await time.increase(1);
			count++;
		}
		value = await game.winnerMult();
		assert(value.toString() == '10');
	});

	it('should not allow transfer', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.addDelegate(admin, false);
		await expectRevert(game.transferFrom(player1, player2, 10), 'ERC721: transfer caller is not owner nor approved');

		await expectRevert(game.transferFrom(player1, player2, 10, { from: player2 }), 'ERC721: transfer caller is not owner nor approved');

		await game.setApprovalForAll(player2, true, { from: player1 });
		await game.transferFrom(player1, player2, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === player2);
	});

	it('should allow auction house transfers and dissallow', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.addDelegate(player2, true);
		await game.transferFrom(player1, admin, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === admin);

		await game.transferFrom(admin, player1, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === player1);

		await game.addDelegate(player2, false);

		await expectRevert(game.transferFrom(player1, player2, 10, { from: player2 }), 'ERC721: transfer caller is not owner nor approved');
	});

	it('should NOT allow auction house transfers', async () => {
		await game.setAvailableCoin(1);
		await game.setPrice(web3.utils.toWei('1'), true);
		await game.buy({ from: player1, value: web3.utils.toWei('1') });
		await game.addDelegate(player2, true);
		await game.transferFrom(player1, admin, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === admin);

		await game.setDisallowDelegates(true, { from: admin });

		await expectRevert(game.transferFrom(admin, player1, 10, { from: player2 }), 'ERC721: transfer caller is not owner nor approved');

		await game.setDisallowDelegates(false, { from: admin });

		await game.transferFrom(admin, player1, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === player1);

		await game.transferFrom(player1, admin, 10, { from: player2 }), await game.transferFrom(admin, player1, 10, { from: player2 }), await game.setDisallowDelegates(true, { from: player1 });

		await expectRevert(game.transferFrom(player1, admin, 10, { from: player2 }), 'ERC721: transfer caller is not owner nor approved');

		await game.transferFrom(player1, admin, 10, { from: player1 }), (owner = await game.ownerOf(10));
		assert(owner === admin);

		await game.approve(player1, 10, { from: admin });
		await game.transferFrom(admin, player2, 10, { from: player1 }), (owner = await game.ownerOf(10));
		assert(owner === player2);

		await game.transferFrom(player2, admin, 10, { from: player2 }), (owner = await game.ownerOf(10));
		assert(owner === admin);

		await game.approve(player3, 10, { from: admin }); // third party

		await game.setDisallowDelegates(true, { from: admin });

		await expectRevert(game.transferFrom(admin, player1, 10, { from: player2 }), 'ERC721: transfer caller is not owner nor approved');

		await game.transferFrom(admin, player1, 10, { from: player3 }), (owner = await game.ownerOf(10));
		assert(owner === player1);
	});

	// it('get accurate numbers', async () => {
	//   await cct.transfer(game.address, web3.utils.toWei('420000000'));
	//   await game.addDelegate(gm.address, true);
	//   await addFeed(1);

	//   await game.setAvailableCoin(1);
	// await game.setPrice(web3.utils.toWei('1'), true);
	//   await game.buy({from: player1, value: web3.utils.toWei('1')});
	//   await game.buy({from: player2, value: web3.utils.toWei('1')});

	//   token = await game.getCoinById(11);
	//   console.log(token.score.toString(), web3.utils.fromWei(token.rewards));

	//   // 20000 position
	//   await updatePriceCustom(1000);
	//   await gm.createStake(10, 1, 20000, true, {from: player1});
	//   await updatePriceCustom(500);
	//   // await gm.cancelStake(10, {from: player1});

	//   await gm.reviveToken(10, 11, true, {from: player2});
	//   token = await game.getCoinById(11);
	//   console.log(token.score.toString(), web3.utils.fromWei(token.rewards));

	//   token = await game.getCoinById(10);
	//   console.log(token.score.toString(), web3.utils.fromWei(token.rewards));

	// })

	// it('should Mint 1000 tokens', async () => {

	//   let coinClass = [];
	//   for(let i = 1; i < 101; i ++) {
	//     coinClass.push(i);
	//   }
	//   await game.setAvailableCoins(coinClass);
	//    await game.setPrice(web3.utils.toWei('0.001'), true);
	//   let availableCoins = await game.getAvailableCoins();
	//   console.log('availableCoins', availableCoins.toString())

	//   let testValue;

	//   for (let i = 0; i < 1000; i ++) {
	//     await game.buy({from: player2, value: web3.utils.toWei('0.01')});
	//     await time.increase(10);
	//     // testValue = await game.testValue();
	//     // console.log(testValue.toNumber());
	//   }

	//   availableCoins = await game.getAvailableCoins();
	//   console.log('availableCoins', availableCoins.toString())

	//   for (let i = 10; i < 1010; i ++) {
	//     const owner = await game.ownerOf(i);
	//     assert(owner === player2);
	//   }
	// })
});
