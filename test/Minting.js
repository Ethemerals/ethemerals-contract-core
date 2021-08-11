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
		// await game.addDelegate(admin, true);
	});

	it('should deploy and mint 5', async () => {
		await game.mintReserve();
		owner = await game.ownerOf(1);
		assert(owner === admin);

		value = await game.ethemeralSupply();
		assert(value.toString() === '6');

		value = await game.ownerOf(5);
		assert(owner === admin);
	});

	it('should not allow admin only functions', async () => {
		await expectRevert(game.mintReserve({ from: player2 }), 'only admin');
		await expectRevert(game.setPrice(10000, true, { from: player2 }), 'only admin');
		await expectRevert(game.setPrice(10000, false, { from: player1 }), 'only admin');
		await expectRevert(game.withdraw(admin, { from: player1 }), 'only admin');
		await expectRevert(game.setMaxAvailableEthemerals(10, { from: player1 }), 'only admin');
		await expectRevert(game.setMaxAvailablePet(10, { from: player1 }), 'only admin');
		await expectRevert(game.setMaxAvailableRefugee(10, { from: player1 }), 'only admin');
		await expectRevert(game.transferOwnership(player2, { from: player1 }), 'only admin');
		await expectRevert(game.setBaseURI('whats up dog', { from: player1 }), 'only admin');
		await expectRevert(game.setContractURI('whats up dog', { from: player1 }), 'only admin');
	});

	it('should transferOwnership', async () => {
		await game.transferOwnership(player1, { from: admin });
		await game.setPrice(web3.utils.toWei('0.1'), true, { from: player1 });
		value = await game.mintPrice();
		assert(value.toString() === web3.utils.toWei('0.1'));
	});

	it('should set base URI and contract URI', async () => {
		await game.mintReserve();
		await game.setContractURI('https://www.whatsupdog.com');
		value = await game.contractURI();
		assert(value.toString() == 'https://www.whatsupdog.com');

		value = await game.tokenURI(5);
		assert(value === 'https://api.hello.com/5');

		await game.setBaseURI('heelowWorld/');
		value = await game.tokenURI(5);
		assert(value === 'heelowWorld/5');
	});

	it('should set mint price', async () => {
		await game.setPrice(web3.utils.toWei('0.1'), true, { from: admin });

		value = await game.mintPrice();
		assert(value.toString() === web3.utils.toWei('0.1'));
	});

	it('should not mint ethemerals due to requirements', async () => {
		value = await game.ethemeralSupply();
		await game.mintReserve();

		await game.setPrice(web3.utils.toWei('0.1'), true, { from: admin });
		await expectRevert(game.mintEthemeral(1, player2, { from: player2 }), 'sale not active');

		await game.setMaxAvailableEthemerals(10, { from: admin });
		await expectRevert(game.mintEthemeral(10, player2, { from: player2 }), 'minting to much');

		await game.setMaxAvailableEthemerals(7, { from: admin });

		await expectRevert(game.mintEthemeral(1, player2, { from: player2, value: web3.utils.toWei('0.01') }), 'not enough');
		await expectRevert(game.mintEthemeral(2, player2, { from: player2, value: web3.utils.toWei('0.2') }), 'sale not active');
		await expectRevert(game.mintEthemeral(3, player2, { from: player2, value: web3.utils.toWei('0.3') }), 'sale not active');
	});

	it('should mint ethemerals up to max available', async () => {
		await game.setPrice(web3.utils.toWei('0.0001'), true, { from: admin });
		await game.mintReserve();
		await game.setMaxAvailableEthemerals(7, { from: admin });
		await game.mintEthemeral(1, player2, { from: player2, value: web3.utils.toWei('0.0001') });

		value = await game.ownerOf(6);
		assert(value === player2);

		await game.setMaxAvailableEthemerals(11, { from: admin });
		await game.mintEthemeral(4, player2, { from: player2, value: web3.utils.toWei('0.0005') });
		value = await game.ownerOf(10);
		assert(value === player2);
	});

	it('should mint 100 ethemerals', async () => {
		await game.setPrice(web3.utils.toWei('0.0001'), true, { from: admin });
		await game.mintReserve();
		await game.setMaxAvailableEthemerals(1000, { from: admin });

		value = await game.ethemeralSupply();
		console.log(value.toNumber());

		while (value.toNumber() < 100) {
			await game.mintEthemeral(1, player2, { from: player2, value: web3.utils.toWei('0.0001') });
			value = await game.ethemeralSupply();
			console.log(value.toNumber());
			await time.increase(60);
		}

		for (let i = 0; i < value.toNumber(); i++) {
			meral = await game.getEthemeral(i);
			console.log(meral.toString());
			console.log('total', parseInt(meral[2]) + parseInt(meral[3]) + parseInt(meral[4]));
		}
	});

	// it.only('should mint 10000 ethemerals', async () => {
	// 	await game.setPrice(web3.utils.toWei('0.00000001'), true, { from: admin });
	// 	await game.setMaxAvailableEthemerals(10001, { from: admin });

	// 	value = await game.ethemeralSupply();
	// 	console.log(value.toNumber());

	// 	while (value.toNumber() < 10000) {
	// 		await game.mintEthemeral(5, player2, { from: player2, value: web3.utils.toWei('0.00000005') });
	// 		value = await game.ethemeralSupply();
	// 		console.log(value.toNumber());
	// 	}

	// 	await expectRevert(game.mintEthemeral(1, player2, { from: player2, value: web3.utils.toWei('0.0000001') }), 'supply will exceed');

	// 	value = await game.ethemeralSupply();
	// 	console.log(value.toNumber());

	// 	value = await game.ownerOf(10000);
	// 	assert(value === player2);
	// });
});
