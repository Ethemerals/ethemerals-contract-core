const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const ChangeRewards = artifacts.require('ChangeScoreAndRewards');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		changeRewards = await ChangeRewards.new(game.address);
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
		await game.addDelegate(changeRewards.address, true);

		let eggs = [];
		for (let i = 0; i < 30; i++) {
			eggs.push(i + 1);
		}

		await changeRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100, true, 0);
		await changeRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100, true, 0);
		await expectRevert(changeRewards.changeRewards([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100, true, 0, { from: player1 }), 'no');

		await changeRewards.changeScore([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100, true, 100);
		await expectRevert(changeRewards.changeScore([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 100, true, 100, { from: player1 }), 'no');

		value = await game.getEthemeral(1);
		console.log(value.toString());

		await changeRewards.changeScore([1], 100, true, 100);
		value = await game.getEthemeral(1);
		console.log(value.toString());

		await changeRewards.changeScore([1], 1000, false, 0);
		value = await game.getEthemeral(1);
		console.log(value.toString());

		await changeRewards.changeRewards([1], 5000, false, 0);
		value = await game.getEthemeral(1);
		console.log(value.toString());
	});
});
