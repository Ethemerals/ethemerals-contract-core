const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, gamemaster, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		await game.mintReserve();
	});

	it('should set MeralBase', async () => {
		await game.setMaxMeralIndex(16);
		await game.setPrice(web3.utils.toWei('0.1'));
		await game.mintMerals(player1, { from: player1, value: web3.utils.toWei('0.3') });
		await game.mintMerals(player1, { from: player1, value: web3.utils.toWei('0.3') });

		// await expectRevert(game.transferFrom(player1, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');

		value = await game.getMeralBase(16);
		await game.setMeralBase(16, 1, 5, { from: admin });
		value = await game.getMeralBase(16);
		console.log(value.toString());
		// assert(value === '1,5');
	});
});
