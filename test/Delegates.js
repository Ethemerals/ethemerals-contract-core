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

	it('should allow / disaalow delegates to transfer', async () => {
		await game.setMaxAvailableIndex(16);
		await game.setPrice(web3.utils.toWei('0.1'), true);
		await game.mintEthemerals(player1, { from: player1, value: web3.utils.toWei('0.3') });
		await game.mintEthemerals(player1, { from: player1, value: web3.utils.toWei('0.3') });

		await game.addDelegate(gamemaster, true); // GM
		await expectRevert(game.transferFrom(player1, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');

		await game.setAllowDelegates(true, { from: player1 });

		await game.transferFrom(player1, gamemaster, 16, { from: gamemaster });
		owner = await game.ownerOf(16);
		assert(owner === gamemaster);

		// cant take it back
		await expectRevert(game.transferFrom(gamemaster, player1, 16, { from: player1 }), 'ERC721: transfer caller is not owner nor approved');

		await game.transferFrom(gamemaster, player1, 16, { from: gamemaster });
		await game.setAllowDelegates(false, { from: player1 });
		await expectRevert(game.transferFrom(player1, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');

		await game.approve(gamemaster, 16, { from: player1 });
		await game.transferFrom(player1, gamemaster, 16, { from: gamemaster });
		owner = await game.ownerOf(16);
		assert(owner === gamemaster);

		await game.transferFrom(gamemaster, player3, 16, { from: gamemaster });
		owner = await game.ownerOf(16);
		assert(owner === player3);

		await game.setAllowDelegates(true, { from: player3 });
		await game.transferFrom(player3, gamemaster, 16, { from: gamemaster });
		owner = await game.ownerOf(16);
		assert(owner === gamemaster);

		await game.transferFrom(gamemaster, player3, 16, { from: gamemaster });
		await game.addDelegate(gamemaster, false); // GM

		await expectRevert(game.transferFrom(player3, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');
	});
});
