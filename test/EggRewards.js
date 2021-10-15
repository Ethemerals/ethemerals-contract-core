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

	it('should deploy and mint 10', async () => {
		await game.mintReserve();
		owner = await game.ownerOf(1);
		assert(owner === admin);

		value = await game.meralSupply();
		assert(value.toString() === '11');

		value = await game.ownerOf(5);
		assert(owner === admin);
	});

	it('should not allow admin only functions', async () => {
		await expectRevert(game.mintReserve({ from: player2 }), 'Ownable: caller is not the owner');
		await expectRevert(game.mintMeralsAdmin(player1, 1, { from: player2 }), 'Ownable: caller is not the owner');
		await expectRevert(game.setPrice(10000, { from: player2 }), 'Ownable: caller is not the owner');
		await expectRevert(game.withdraw(admin, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(game.setMaxMeralIndex(10, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(game.transferOwnership(player2, { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(game.setBaseURI('whats up dog', { from: player1 }), 'Ownable: caller is not the owner');
		await expectRevert(game.setMeralBase(10, 1, 5, { from: player1 }), 'Ownable: caller is not the owner');
	});

	it('should not set max Ethemerals more then supply', async () => {
		await game.mintReserve();
		value = await game.maxMeralIndex();

		await expectRevert(game.setMaxMeralIndex(10001, { from: admin }), 'max supply');
		await game.setMaxMeralIndex(10000, { from: admin });
		value = await game.maxMeralIndex();
		assert(value.toNumber() === 10000);
	});

	it('should transferOwnership', async () => {
		await game.transferOwnership(player1, { from: admin });
		await game.setPrice(web3.utils.toWei('0.1'), { from: player1 });
		value = await game.mintPrice();
		assert(value.toString() === web3.utils.toWei('0.1'));
	});

	it('should set base URI', async () => {
		await game.mintReserve();

		value = await game.tokenURI(5);
		assert(value === 'https://api.hello.com/5');

		await game.setBaseURI('heelowWorld/');
		value = await game.tokenURI(5);
		assert(value === 'heelowWorld/5');
	});

	it('should set mint price', async () => {
		await game.setPrice(web3.utils.toWei('0.1'), { from: admin });

		value = await game.mintPrice();
		assert(value.toString() === web3.utils.toWei('0.1'));
	});

	it('should not mint ethemerals due to requirements', async () => {
		await game.mintReserve();

		await game.setPrice(web3.utils.toWei('0.1'), { from: admin });
		await expectRevert(game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.1') }), 'sale not active');

		await game.setMaxMeralIndex(12, { from: admin });
		await expectRevert(game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.01') }), 'not enough');
		await expectRevert(game.mintMerals(player2, { from: player2, value: web3.utils.toWei('0.3') }), 'sale not active');

		await game.setMaxMeralIndex(15, { from: admin });
		await expectRevert(game.mintMerals(player2, { from: player2, value: web3.utils.toWei('0.25') }), 'not enough');
		await game.mintMerals(player2, { from: player2, value: web3.utils.toWei('0.27') });
		await expectRevert(game.mintMerals(player2, { from: player2, value: web3.utils.toWei('0.27') }), 'sale not active');
	});

	it('it Should mint a token to player1', async () => {
		await game.mintReserve();
		await game.setPrice(web3.utils.toWei('0.1'), { from: admin });
		await game.setMaxMeralIndex(16, { from: admin });
		await game.mintMeral(player1, { from: admin, value: web3.utils.toWei('0.1') });

		const owner = await game.ownerOf(11);
		assert(owner === player1);
	});

	it('it Should mint a token to player1 from admin', async () => {
		await game.mintReserve();
		await game.setPrice(web3.utils.toWei('0.1'), { from: admin });
		await game.setMaxMeralIndex(30, { from: admin });
		await game.mintMeralsAdmin(player1, 20, { from: admin });

		owner = await game.ownerOf(11);
		assert(owner === player1);
		owner = await game.ownerOf(21);
		assert(owner === player1);
	});

	it('should withdraw eth', async () => {
		await game.setPrice(web3.utils.toWei('1'), { from: admin });
		await game.mintReserve();
		await game.setMaxMeralIndex(1000, { from: admin });

		await game.mintMerals(admin, { from: admin, value: web3.utils.toWei('3') });

		value = await web3.eth.getBalance(game.address);
		assert(web3.utils.fromWei(value) == '3');

		oldBalance = await web3.eth.getBalance(admin);
		await game.withdraw(admin);

		value = await web3.eth.getBalance(game.address);
		assert(web3.utils.fromWei(value) == '0');

		newBalance = await web3.eth.getBalance(admin);
		assert(parseFloat(web3.utils.fromWei(newBalance)) > web3.utils.fromWei(oldBalance));
	});

	it('should mint ethemerals up to max available', async () => {
		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.setMaxMeralIndex(1, { from: admin });
		await game.mintMeral(player2, { from: player2, value: web3.utils.toWei('0.0001') });
		await expectRevert(game.mintMeral(player1, { from: player1, value: web3.utils.toWei('0.1') }), 'sale not active');

		value = await game.ownerOf(1);
		assert(value === player2);

		await game.setMaxMeralIndex(4, { from: admin });
		await game.mintMerals(player2, { from: player2, value: web3.utils.toWei('0.0003') });
		await expectRevert(game.mintMerals(player1, { from: player1, value: web3.utils.toWei('0.1') }), 'sale not active');
		value = await game.ownerOf(4);
		assert(value === player2);
	});

	it.only('should mint 100 ethemerals and get ethemerals', async () => {
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
