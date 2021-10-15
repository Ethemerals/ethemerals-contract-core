const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const EggRewards = artifacts.require('EggHolderRewards');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		eggRewards = await EggRewards.new(game.address);
		// await game.addDelegate(admin, true);
	});

	it('should mint 100 ethemerals and get ethemerals', async () => {
		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.mintReserve();
		await game.setMaxMeralIndex(1000, { from: admin });

		value = await game.meralSupply();
		console.log(value.toNumber());
		let mintAmount = 10;
		while (value.toNumber() < mintAmount) {
			await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
			value = await game.meralSupply();
			await time.increase(120);
		}

		for (let i = 0; i < value.toNumber(); i++) {
			meral = await game.getEthemeral(i);
		}

		await game.addDelegate(admin, true);
		await game.addDelegate(eggRewards.address, true);

		let eggs = [];
		for (let i = 0; i < 30; i++) {
			eggs.push(i + 1);
		}

		// value = await eggRewards.admin();
		// console.log(value);

		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);
		await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100);

		value = await game.getEthemeral(1);
		console.log(value.toString());
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 200);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 300);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 400);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 500);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 600);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 700);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 800);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 900);
		// await eggRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 1000);
		// await eggRewards.changeRewards(eggs, 100);
		// await eggRewards.changeRewards(eggs, 100);
	});
});
