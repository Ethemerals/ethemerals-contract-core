const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const ELFx = artifacts.require('EthemeralLifeForceX');

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		let startEmit = Math.floor(Date.now() / 1000);
		elfX = await ELFx.new('elfx', 'elfx', game.address, startEmit);
	});

	it('should deploy and mint 10', async () => {
		await game.mintReserve();
		owner = await game.ownerOf(1);
		assert(owner === admin);

		value = await game.meralSupply();
		assert(value.toString() === '11');

		value = await game.ownerOf(5);
		assert(owner === admin);
	});

	it.only('should revert', async () => {
		await game.mintReserve();
		await time.increase(86400);

		await expectRevert(elfX.claim([10, 11, 12]), 'not minted');
		await expectRevert(elfX.claim([5, 6], { from: player1 }), 'owner only');
		await expectRevert(elfX.claim([5, 5]), 'duplicate');
		await expectRevert(elfX.claim([1001]), 'not started');

		await elfX.setEmmisionBySeason(1, 1633117329);
		await expectRevert(elfX.claim([1001]), 'not minted');
		await expectRevert(elfX.setEmmisionBySeason(2, 1633117329, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(elfX.setBonusByIndexes([3], 4, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(elfX.setBonusByIndexes([3], 5), 'to high');
		await expectRevert(elfX.setBlackListByIndexes([3], true, { from: player1 }), 'Ownable: caller is not the owner');

		// await game.addDelegate(admin, true);
		// await time.increase(86400 * 365);
		// await game.changeScore(5, 1000, false, 0);
		// await expectRevert(elfX.claim([5]), 'none accumulated');
	});

	it.only('should not allow blacklisted tokens to claim', async () => {
		await game.mintReserve();
		await time.increase(86400 * 365 * 5);
		await game.setMaxMeralIndex(1000);
		await game.setPrice(web3.utils.toWei('0'));

		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });

		value1 = await elfX.accumulated(13);
		value2 = await elfX.accumulated(14);

		await elfX.setBonusByIndexes([13, 14], 4);

		value1b = await elfX.accumulated(13);
		a = web3.utils.fromWei(value1.toString());
		b = web3.utils.fromWei(value1b.toString());
		// assert(a === b * 4);
		console.log(a, b);
		value2b = await elfX.accumulated(14);
		a = web3.utils.fromWei(value2.toString());
		b = web3.utils.fromWei(value2b.toString());
		// assert(a === b * 4);
		console.log(a, b);

		await elfX.setBlackListByIndexes([13, 14], true);

		value = await elfX.accumulated(13);
		assert(value.toNumber() === 0);
		value = await elfX.accumulated(14);
		assert(value.toNumber() === 0);

		await elfX.setBlackListByIndexes([15], true);

		value = await elfX.accumulated(15);
		assert(value.toNumber() === 0);

		await elfX.setBlackListByIndexes([15], false);
		value = await elfX.accumulated(15);
		b = web3.utils.fromWei(value.toString());
		// assert(value.toNumber() > 1000);
		console.log(a, b);

		await elfX.claim([11, 12, 13, 14], { from: player1 });

		balance = await elfX.balanceOf(player1);
		console.log(web3.utils.fromWei(balance.toString()));

		// await expectRevert(elfX.claim([5, 6], { from: player1 }), 'owner only');
		// await expectRevert(elfX.claim([5, 5]), 'duplicate');
	});

	it('should mint 10 and claim 100 ELFx after 1 day', async () => {
		await game.mintReserve();
		await time.increase(86400);

		balance = await elfX.balanceOf(admin);
		console.log(web3.utils.fromWei(balance.toString()));

		value = await elfX.accumulated(1);
		console.log(web3.utils.fromWei(value.toString()));

		await elfX.claim([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

		balance = await elfX.balanceOf(admin);
		console.log(web3.utils.fromWei(balance.toString()));

		await game.setMaxMeralIndex(1000);
		await game.setPrice(web3.utils.toWei('0'));
		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });
		await game.mintMerals(player1, { from: admin });

		balance = await elfX.balanceOf(player1);
		console.log(web3.utils.fromWei(balance.toString()));

		value = await elfX.accumulated(11);
		console.log(web3.utils.fromWei(value.toString()));

		await elfX.claim([11], { from: player1 });

		balance = await elfX.balanceOf(player1);
		console.log(web3.utils.fromWei(balance.toString()));

		balance = await elfX.balanceOf(admin);
		console.log(web3.utils.fromWei(balance.toString()));
	});

	it('should get score', async () => {
		await game.mintReserve();
		await game.setMaxMeralIndex(1000);
		await game.setPrice(web3.utils.toWei('0'));
		await time.increase(86400);

		await game.mintMeral(player1, { from: admin });
		await game.mintMeral(player2, { from: admin });
		meral = await game.getEthemeral(11);
		console.log(meral.toString());
		meral = await game.getEthemeral(12);
		console.log(meral.toString());

		await game.addDelegate(admin, true);

		await time.increase(86400 * 365);

		await game.changeScore(11, 1000, false, 0);
		await game.changeScore(12, 1000, false, 0);

		for (let i = 0; i < 50; i++) {
			await game.changeScore(11, 20, true, 0);
			meral = await game.getEthemeral(11);
			value = await elfX.accumulated(11);
			console.log(web3.utils.fromWei(value.toString()));

			await game.changeScore(12, 20, true, 0);
			meral = await game.getEthemeral(12);
			value = await elfX.accumulated(12);
			console.log(web3.utils.fromWei(value.toString()));
		}

		await time.increase(86400 * 365 * 10);
		value = await elfX.accumulated(12);
		console.log(web3.utils.fromWei(value.toString()));

		await elfX.claim([11], { from: player1 });

		balance = await elfX.balanceOf(player1);
		console.log(web3.utils.fromWei(balance.toString()));
	});
});
