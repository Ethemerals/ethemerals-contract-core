const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

const Art = artifacts.require('EthemeralArt');

contract('ERC721 - ART', (accounts) => {
	let art;
	const [admin, player1, gamemaster, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		art = await Art.new();
	});

	it('should mint a token to player1/3 from new minter address', async () => {
		await art.changeMinter(gamemaster, { from: admin });
		await art.mint(player1, 1, { from: gamemaster });
		owner = await art.ownerOf(1);
		assert(owner === player1);
		await art.mint(player3, 2, { from: gamemaster });
		owner = await art.ownerOf(2);
		assert(owner === player3);
	});

	it('should mint a token to player1/3 from admin', async () => {
		await art.mint(player1, 1);
		owner = await art.ownerOf(1);
		assert(owner === player1);
		await art.mint(player3, 2);
		owner = await art.ownerOf(2);
		assert(owner === player3);
	});

	it('should mint 10 tokens to player1/3 from admin', async () => {
		await art.mintAmounts(player1, 1, 10);
		owner = await art.ownerOf(10);
		assert(owner === player1);
		await art.mintAmounts(player3, 11, 5);
		owner = await art.ownerOf(15);
		assert(owner === player3);
	});

	it('should transferOwnership', async () => {
		await art.transferOwnership(player1, { from: admin });
		await art.addDelegate(player3, true, { from: player1 });
	});

	it('should set base URI', async () => {
		await art.mint(admin, 5);

		value = await art.tokenURI(5);
		assert(value === 'https://api.ethemerals.com/api/art/5');

		await art.setBaseURI('heelowWorld/');
		value = await art.tokenURI(5);
		assert(value === 'heelowWorld/5');
	});

	it('should revert', async () => {
		await expectRevert(art.transferOwnership(player3, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(art.addDelegate(player3, true, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(art.mint(player3, 10, { from: player1 }), 'minter only');
		await expectRevert(art.setBaseURI('whats up dog', { from: player1 }), 'Ownable: caller is not the owner');
		await art.mint(player3, 0);
		await expectRevert(art.mint(player3, 0), 'ERC721: token already minted');
		await expectRevert(art.mintAmounts(player3, 0, 10), 'ERC721: token already minted');
		await expectRevert(art.mintAmounts(player3, 1, 10, { from: player1 }), 'minter only');
	});

	it('should allow / disaalow delegates to transfer', async () => {
		await art.mint(player1, 16, { from: admin });

		await art.addDelegate(gamemaster, true); // GM
		await expectRevert(art.transferFrom(player1, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');

		await art.setAllowDelegates(true, { from: player1 });

		await art.transferFrom(player1, gamemaster, 16, { from: gamemaster });
		owner = await art.ownerOf(16);
		assert(owner === gamemaster);

		// cant take it back
		await expectRevert(art.transferFrom(gamemaster, player1, 16, { from: player1 }), 'ERC721: transfer caller is not owner nor approved');

		await art.transferFrom(gamemaster, player1, 16, { from: gamemaster });
		await art.setAllowDelegates(false, { from: player1 });
		await expectRevert(art.transferFrom(player1, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');

		await art.approve(gamemaster, 16, { from: player1 });
		await art.transferFrom(player1, gamemaster, 16, { from: gamemaster });
		owner = await art.ownerOf(16);
		assert(owner === gamemaster);

		await art.transferFrom(gamemaster, player3, 16, { from: gamemaster });
		owner = await art.ownerOf(16);
		assert(owner === player3);

		await art.setAllowDelegates(true, { from: player3 });
		await art.transferFrom(player3, gamemaster, 16, { from: gamemaster });
		owner = await art.ownerOf(16);
		assert(owner === gamemaster);

		await art.transferFrom(gamemaster, player3, 16, { from: gamemaster });
		await art.addDelegate(gamemaster, false); // GM

		await expectRevert(art.transferFrom(player3, gamemaster, 16, { from: gamemaster }), 'ERC721: transfer caller is not owner nor approved');
	});
});
