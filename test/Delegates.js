const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', 'https://www.hello.com/contract', cct.address);
		await game.mintReserve();
	});

	it('should allow / disaalow delegates to transfer', async () => {
		await game.setMaxAvailableEthemerals(11);
		await game.setPrice(web3.utils.toWei('0.1'), true);
		await game.mintEthemeral(5, player1, { from: player1, value: web3.utils.toWei('0.5') });

		await game.addDelegate(admin, true);
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
});
