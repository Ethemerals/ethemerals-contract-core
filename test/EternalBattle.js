const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const Battle = artifacts.require('EternalBattle');
const PriceFeed = artifacts.require('PriceFeedMock');

const nftAddress = '0xcDB47e685819638668FF736d1a2aE32b68E76BA5'; // RINKEBY

module.exports = async function (deployer) {
	await deployer.deploy(PriceFeedMock);
	await deployer.deploy(EternalBattle, nftAddress, PriceFeedMock.address);
};

contract('ERC721', (accounts) => {
	let game;
	const [admin, player1, player2, player3] = [accounts[0], accounts[1], accounts[2], accounts[3]];

	beforeEach(async () => {
		cct = await CCT.new('CryptoCoinsTokens', 'CCT');
		game = await Game.new('https://api.hello.com/', cct.address);
		priceFeed = await PriceFeed.new();
		battle = await Battle.new(game.address, priceFeed.address);

		await game.setPrice(web3.utils.toWei('0.0001'), { from: admin });
		await game.mintReserve();
		await game.setMaxMeralIndex(1000, { from: admin });

		let mintAmount = 20;

		let value = await game.totalSupply();

		while (value.toNumber() < mintAmount) {
			await game.mintMeral(player1, { from: player1, value: web3.utils.toWei('0.0001') });
			value = await game.meralSupply();
			await time.increase(120);
		}

		await game.addDelegate(battle.address, true);
		await game.setAllowDelegates(true, { from: player1 });
	});

	it('should create and cancel stake', async () => {
		let mockPrice = 32 * 1000000;
		await priceFeed.updatePrice(1, mockPrice);

		let token = 11;
		await battle.createStake(token, 1, 1000, true, { from: player1 });

		let stake = await battle.getStake(token);
		value = await game.ownerOf(token);
		assert(value == battle.address);
		console.log(stake.toString());
		await priceFeed.updatePrice(1, mockPrice * 1.1);

		value = await priceFeed.getPrice(1);
		console.log(value.toString());

		await battle.cancelStake(token, { from: player1 });
		value = await game.ownerOf(token);
		assert(value == player1);

		value = await battle.value1();
		console.log(value.toString());
		value = await battle.value2();
		console.log(value.toString());

		meral = await game.getEthemeral(token);
		console.log('token', meral.toString());
	});
});
