const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('CryptoCoinsTokens');
const Game = artifacts.require('CryptoCoins');

const datax = "0x0";

contract('ERC1155', accounts => {
  let game;
  const [admin, player1, player2] = [accounts[0], accounts[1], accounts[2]];

  beforeEach(async () => {
    cct = await CCT.new("CryptoCoinsTokens", "CCT");
    game = await Game.new('https://d5ianf82isuvq.cloudfront.net/api/meta/', cct.address);
  });

  it('should NOT mint if not admin', async () => {
    await expectRevert(
      game.mint(player1, 0, 1, datax, {from: player1}),
      "CCC: must have minter role to mint"
    );
  })

  it('it Should mint a token', async () => {
    const amount = 10;
    await game.mint(admin, 1, amount, datax);

    const balance = await game.balanceOf(admin, 1);
    assert(balance.toNumber() === amount);
  })

  it('it Should mint a token to player1', async () => {
    const amount = 10;
    await game.mint(player1, 1, amount, datax);

    const balance = await game.balanceOf(player1, 1);
    assert(balance.toNumber() === amount);
  })

  it('should set MintPrice and buy', async () => {

    await game.setAvailableCoins([1,2]);
    let testValue;
    let balance = await web3.eth.getBalance(player2);

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player2, value: web3.utils.toWei('1')});
      await time.increase(1);
    }

    // check balance of p2

    balance = await web3.eth.getBalance(player2);

    await expectRevert(
      game.buy({from: player2, value: web3.utils.toWei('1')}),
      "CCC: No more to mint"
    );

    balance = await web3.eth.getBalance(player2);

    // get more editions
    await game.setAvailableCoins([3,4]);
    await game.setMintPrice(web3.utils.toWei('10'));

    for (let i = 0; i < 4; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('10')});
      await time.increase(1);
    }

    const newBalance = await web3.eth.getBalance(player1);
    assert(newBalance < balance);
  })

  it('should grant Minter role to player1 and mint token', async () => {

    await game.setAvailableCoin(1);

    const minterRole = web3.utils.soliditySha3("MINTER_ROLE");
    const amount = 10;
    await game.grantRole(minterRole, player1);
    await game.mint(player2, 1, amount, datax, {from: player1});

    // TODO
    const balance = await game.balanceOf(player2, 1);
    assert(balance.toNumber() === amount);

    await game.revokeRole(minterRole, admin, {from: admin});
    await expectRevert(
      game.mint(player1, 1, amount, datax, {from: admin}),
      "CCC: must have minter role to mint"
    );
  })

  it('should Mint 20 tokens', async () => {

    await game.setAvailableCoins([1,2]);
    let availableCoins = await game.getAvailableCoins();
    console.log('availableCoins', availableCoins.toString())

    let testValue;

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('1')});
      await time.increase(10);
      testValue = await game.testValue();
      // console.log(testValue.toNumber());
    }

    availableCoins = await game.getAvailableCoins();
    console.log('availableCoins', availableCoins.toString())

    for (let i = 10; i < 30; i ++) {
      let balance = await game.balanceOf(player1, i);
      assert(balance.toNumber() === 1);
    }

  })



  it('should Mint 20 tokens then revert', async () => {

    await game.setAvailableCoins([1,2]);
    await game.setMintPrice(web3.utils.toWei('0.001'));

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('1')});
      await time.increase(10);
    }

    console.log('here');

    await expectRevert(
      game.buy({from: player1, value: web3.utils.toWei('1')}),
      "CCC: No more to mint"
    );

    for (let i = 10; i < 30; i ++) {
      let balance = await game.balanceOf(player1, i);
      assert(balance.toNumber() === 1);
    }

  })

  it('should NOT mint any tokens', async () => {

    await expectRevert(
      game.buy({from: player1, value: web3.utils.toWei('1')}),
      "CCC: No more to mint"
    );

  })

  it('should Mint then revert then Mint again', async () => {

    await game.setAvailableCoins([1,2]);
    await game.setMintPrice(web3.utils.toWei('0.001'));

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('0.001')}),
      await time.increase(1);
    }

    await expectRevert(
      game.buy({from: player1, value: web3.utils.toWei('0.001')}),
      "CCC: No more to mint"
    );

    await game.setAvailableCoins([5,6]);

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('0.001')}),
      await time.increase(1);
    }

    for (let i = 50; i < 70; i ++) {
      let balance = await game.balanceOf(player1, i);
      assert(balance.toNumber() === 1);
    }

  })

  it('should Mint then return coin with 300 score', async () => {

    await game.setAvailableCoins([5,6]);
    await game.setMintPrice(web3.utils.toWei('0.001'));

    for (let i = 0; i < 20; i ++) {
      await game.buy({from: player1, value: web3.utils.toWei('0.001')}),
      await time.increase(1);
    }

    const coin = await game.getCoinById(58);
    const coin2 = await game.getCoinById(55);
    assert(coin.id == 58);
    assert(coin.score == 300);
    assert(coin.staked == false);
    assert(coin.rewards == web3.utils.toWei('100'));
    assert(coin2.id == 55);
    assert(coin2.score == 300);
    assert(coin2.staked == false);
    assert(coin2.rewards == web3.utils.toWei('100'));
  })

  it('should NOT buy without enough ETH', async () => {

    await game.setAvailableCoins([1,2]);
    await game.setMintPrice(web3.utils.toWei('1'));

    await expectRevert(
      game.buy({from: player1, value: web3.utils.toWei('0.5')}),
      "CCC: Not enough ETH"
    );
  })

  // TODO
  it('should Update token score', async () => {

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});
    let token = await game.getCoinById(10);
    console.log(token.score);
    await game.changeScore(10, 250, true, '0');

    token = await game.getCoinById(10);
    assert(token.score == 550);
    console.log(token.score);

    await game.changeScore(10, 500, true, '0');
    token = await game.getCoinById(10);
    assert(token.score == 1000);
    await game.changeScore(10, 600, false, '0');
    token = await game.getCoinById(10);
    assert(token.score == 400);
    await game.changeScore(10, 600, false, '0');
    token = await game.getCoinById(10);
    assert(token.score == 0);
  })

  it('should redeem tokens', async () => {
    // Transfer CCT
    await cct.transfer(game.address, web3.utils.toWei('100000000'))
    let value = await cct.balanceOf(game.address);
    assert(value.toString() === web3.utils.toWei('100000000'))
    console.log(value.toString());

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});
    let token = await game.getCoinById(10);
    let rewards = token.rewards;

    await game.redeemTokens(10, {from: player1});
    value = await cct.balanceOf(player1);
    assert(rewards.toString() === value.toString());

    token = await game.getCoinById(10);
    rewards = token.rewards;
    assert(rewards.toString() === '0');

    value = await cct.balanceOf(game.address);
    console.log(value.toString());
  })

  it('should NOT redeem tokens', async () => {
    // Transfer CCT
    await cct.transfer(game.address, web3.utils.toWei('100000000'))
    value = await cct.balanceOf(game.address);
    assert(value.toString() === web3.utils.toWei('100000000'))

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    await expectRevert(
      game.redeemTokens(10, {from: player2}),
      "CCC: must have token"
    );

    value = await cct.balanceOf(player1);
    assert(value.toString() === '0');


  })

  it('should add rewards tokens to NFT token', async () => {
    // Transfer CCT
    await cct.transfer(game.address, web3.utils.toWei('100000000'))
    let value = await cct.balanceOf(game.address);
    assert(value.toString() === web3.utils.toWei('100000000'))

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    await game.changeScore(10, 0, false, web3.utils.toWei('100'))

    let token = await game.getCoinById(10);
    let rewards = token.rewards;
    assert(rewards.toString() === web3.utils.toWei('200'));

    await game.redeemTokens(10, {from: player1});
    value = await cct.balanceOf(player1);
    assert(rewards.toString() === value.toString());

  })


  it('should NOT add score and rewards to non existent', async () => {
    // Transfer CCT
    await cct.transfer(game.address, web3.utils.toWei('100000000'))
    let value = await cct.balanceOf(game.address);
    assert(value.toString() === web3.utils.toWei('100000000'))

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    await expectRevert.unspecified(
      game.changeScore(11, 100, true, '0')
    );

    await expectRevert(
      game.changeScore(10, 100, true, web3.utils.toWei('100000000')),
      "CCC: amount needs to be clamped"
    );
  })

  it('should set Staked', async () => {
    // Transfer CCT
    await cct.transfer(game.address, web3.utils.toWei('100000000'))
    let value = await cct.balanceOf(game.address);
    assert(value.toString() === web3.utils.toWei('100000000'))

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    let token = await game.getCoinById(10);
    assert(token.staked == false);

    await game.setStaked(10, true);
    token = await game.getCoinById(10);
    assert(token.staked == true);

    await game.setStaked(10, false);
    token = await game.getCoinById(10);
    assert(token.staked == false);

    await expectRevert.unspecified(
      game.setStaked(11, true)
    );

  })

  it('should increase winnerFund and redeem', async () => {
    await cct.transfer(game.address, web3.utils.toWei('100000000'));
    let balance = await cct.balanceOf(game.address);

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    let count = 0;
    while(count < 20) {
      await game.changeScore(10, 0, false, web3.utils.toWei('200'));
      await time.increase(1);
      count++;
    }

    let value = await game.winningCoin();
    console.log(value.toString());

    await game.redeemWinnerFunds(10, {from: player1});
    balance = await cct.balanceOf(player1);
    console.log(balance.toString());
    assert(web3.utils.fromWei(balance.toString()) == '84')

  })

  it('should update winning coin and redeem', async () => {
    await cct.transfer(game.address, web3.utils.toWei('100000000'));

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});
    await game.buy({from: player2, value: web3.utils.toWei('1')});


    await game.changeScore(10, 0, false, web3.utils.toWei('200'));
    let value = await game.winningCoin();
    assert(value.toString() == '10');
    await game.changeScore(11, 0, false, web3.utils.toWei('300'));
    value = await game.winningCoin();
    assert(value.toString() == '11');

    await game.redeemWinnerFunds(11, {from: player2});
    balance = await cct.balanceOf(player2);
    console.log(balance.toString());

    await game.changeScore(10, 0, false, web3.utils.toWei('200'));
    value = await game.winningCoin();
    assert(value.toString() == '10');

  })

  it('should keep scoring even without funds', async () => {
    await cct.transfer(game.address, web3.utils.toWei('20'));
    let balance = await cct.balanceOf(game.address);
    // console.log('game balance', balance.toString());
    let value = await game.winnerFunds();
    // console.log('winner funds', value.toString());

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});

    let count = 0;
    while(count < 20) {
      await game.changeScore(10, 0, false, web3.utils.toWei('200'));
      await time.increase(1);
      count++;
    }

    // let token = await game.getCoinById(10);
    // let rewards = token.rewards;
    // console.log('coin rewards', rewards.toString());

    value = await game.winnerFunds();
    console.log('winner funds', value.toString());
    assert(value.toString() == web3.utils.toWei('84'))
    balance = await cct.balanceOf(game.address);
    // console.log('game balance', balance.toString());


    await expectRevert(
      game.redeemWinnerFunds(10, {from: player1}),
      'CCC: not enough funds'
    );

    // value = await cct.balanceOf(player1);
    // console.log('player balance', value.toString())

    // value = await game.winnerFunds();
    // console.log('winner funds', value.toString());

    // balance = await cct.balanceOf(game.address);
    // console.log('game balance', balance.toString());
  })

  it.only('should update multiplier', async () => {
    await cct.transfer(game.address, web3.utils.toWei('420000000'));

    await game.setAvailableCoin(1);
    await game.buy({from: player1, value: web3.utils.toWei('1')});
    await game.buy({from: player2, value: web3.utils.toWei('1')});

    let count = 0;
    let value;
    while(count < 220) {
      await game.changeScore(10, 0, false, web3.utils.toWei('10'));
      await time.increase(1);
      count++;
    }

    value = await game.winnerMult();
    assert(value.toString() == '8');

    value = await game.winnerFunds();
    await game.redeemWinnerFunds(10, {from: player1});

    // reset mult
    await game.changeScore(11, 0, true, web3.utils.toWei('10'));
    value = await game.winnerMult();
    assert(value.toString() == '1');

    count = 0;
    while(count < 100) {
      await game.changeScore(11, 0, false, web3.utils.toWei('10'));
      await time.increase(1);
      count++;
    }
    value = await game.winnerMult();
    assert(value.toString() == '6');

  })

  // it.only('should Mint 1000 tokens', async () => {

  //   let coinClass = [];
  //   for(let i = 1; i < 101; i ++) {
  //     coinClass.push(i);
  //   }
  //   await game.setAvailableCoins(coinClass);
  //   await game.setMintPrice(web3.utils.toWei('0.01'));
  //   let availableCoins = await game.getAvailableCoins();
  //   console.log('availableCoins', availableCoins.toString())

  //   let testValue;

  //   for (let i = 0; i < 1000; i ++) {
  //     await game.buy({from: player1, value: web3.utils.toWei('0.01')});
  //     await time.increase(10);
  //     // testValue = await game.testValue();
  //     // console.log(testValue.toNumber());
  //   }

  //   availableCoins = await game.getAvailableCoins();
  //   console.log('availableCoins', availableCoins.toString())

  //   for (let i = 10; i < 1010; i ++) {
  //     let balance = await game.balanceOf(player1, i);
  //     assert(balance.toNumber() === 1);
  //   }
  // })


});