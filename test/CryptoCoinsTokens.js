const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('CryptoCoinsTokens');

const datax = "0x0";

contract('ERC20', accounts => {
  let game;
  let cct;
  const [admin, player1, player2] = [accounts[0], accounts[1], accounts[2]];

  beforeEach(async () => {
    cct = await CCT.new("CryptoCoinsTokens", "CCT");
    // game = await Game.new('https://d5ianf82isuvq.cloudfront.net/api/meta/', cct.address);
  });

  it('should NOT mint if not admin', async () => {
    await expectRevert(
      cct.mint(player1, web3.utils.toWei('100'), {from: player1}),
      "CCT: must have minter role to mint"
    );
  })

  it('should mint if admin', async () => {
    let totalSupply = await cct.totalSupply();
    await cct.mint(player1, web3.utils.toWei('100'), {from: admin});
    let value = await cct.totalSupply();
    assert(value > totalSupply);
  })


});