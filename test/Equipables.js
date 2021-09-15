const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const Equipables = artifacts.require('EthemeralEquipables');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		equips = await Equipables.new('https://api.hello.com/equip/', game.address);
		await game.mintReserve();
	});

	it('should deploy redeemPet', async () => {
		await equips.redeemPet(5);
		value = await equips.ownerOf(5);
		assert(value == admin);

		await game.setMaxMeralIndex(1000);
		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });

		await equips.redeemPet(11, { from: admin });
		value = await equips.ownerOf(11);
		assert(value == player2);
		await equips.redeemPet(12, { from: player2 });
		value = await equips.ownerOf(12);
		assert(value == player2);
	});

	it('should not redeem the same pet', async () => {
		await equips.redeemPet(6);
		value = await equips.ownerOf(6);
		assert(value == admin);

		value = await equips.petSupply();
		assert(value.toString() === '2');

		await expectRevert(equips.redeemPet(6), 'ERC721: token already minted');
	});

	it('should mint items', async () => {
		await equips.mintItemsAdmin(30, admin);
		value = await equips.ownerOf(10001);
		assert(value == admin);

		value = await equips.ownerOf(10030);
		assert(value == admin);

		await expectRevert(equips.ownerOf(10000), 'ERC721: owner query for nonexistent token');
		await expectRevert(equips.ownerOf(10031), 'ERC721: owner query for nonexistent token');
	});

	it('should mint items from delegates', async () => {
		await equips.addDelegate(player3, true); // GM
		await equips.mintItemsDelegate(30, player1, { from: player3 });
		value = await equips.ownerOf(10001);
		assert(value == player1);

		value = await equips.ownerOf(10030);
		assert(value == player1);

		value = await equips.itemSupply();
		assert(value.toString() === '30');

		await expectRevert(equips.ownerOf(10000), 'ERC721: owner query for nonexistent token');
		await expectRevert(equips.ownerOf(10031), 'ERC721: owner query for nonexistent token');
	});

	it('should allow delegates', async () => {
		await equips.addDelegate(player3, true); // GM
		await equips.mintItemsDelegate(30, player1, { from: player3 });
		await equips.redeemPet(5);

		await equips.setAllowDelegates(true, { from: player1 });
		await equips.setAllowDelegates(true, { from: admin });

		await equips.transferFrom(admin, player1, 5, { from: player3 });
		owner = await equips.ownerOf(5);
		assert(owner === player1);

		await equips.transferFrom(player1, admin, 10001, { from: player3 });
		owner = await equips.ownerOf(10001);
		assert(owner === admin);
	});

	it('should not allow admin only functions', async () => {
		await expectRevert(equips.transferOwnership(player2, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(equips.mintItemsAdmin(10, player2, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(equips.mintItemsDelegate(10, player2, { from: player1 }), 'delegates only');
		await expectRevert(equips.setBaseURI('whats up dog', { from: player1 }), 'Ownable: caller is not the owner');
	});

	it('should transferOwnership', async () => {
		await equips.transferOwnership(player1, { from: admin });
		await equips.setBaseURI('whats up dog', { from: player1 });
	});

	it('should set base URI', async () => {
		await equips.redeemPet(5);

		value = await equips.tokenURI(5);
		assert(value === 'https://api.hello.com/equip/5');

		await equips.setBaseURI('heelowWorld/');
		value = await equips.tokenURI(5);
		assert(value === 'heelowWorld/5');
	});
});
