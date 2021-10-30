const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');

contract('ERC721', (accounts) => {
    let game;
    const [admin, player1, player2] = [accounts[0], accounts[1], accounts[2]];

    beforeEach(async () => {
        cct = await CCT.new('CryptoCoinsTokens', 'CCT');
        game = await Game.new('https://api.hello.com/', cct.address);
    });

    it('should migrate one meral', async () => {
        const id = 1;
        const recipient = player1;
        const rewards = 2000;
        const score = 300;
        const atk = 305;
        const def = 584;
        const spd = 394
        await game.migrateMeral(id, recipient, score, rewards, atk, def, spd);

        let owner = await game.ownerOf(1);
        assert(owner === player1);

        let supply = await game.meralSupply();
        assert(supply.toNumber() === 2);

        let meral = await game.getEthemeral(1);
        assert(parseInt(meral[0]) === score);
        assert(parseInt(meral[1]) === rewards);
        assert(parseInt(meral[2]) === atk);
        assert(parseInt(meral[3]) === def);
        assert(parseInt(meral[4]) === spd);
    });

    it('should migrate two merals', async () => {
        const id1 = 1;
        const recipient1 = player1;
        const rewards1 = 2000;
        const score1 = 300;
        const atk1 = 305;
        const def1 = 584;
        const spd1 = 394
        await game.migrateMeral(id1, recipient1, score1, rewards1, atk1, def1, spd1);

        const id2 = 2;
        const recipient2 = player2;
        const rewards2 = 4000;
        const score2 = 200;
        const atk2 = 205;
        const def2 = 284;
        const spd2 = 294
        await game.migrateMeral(id2, recipient2, score2, rewards2, atk2, def2, spd2);

        let owner1 = await game.ownerOf(1);
        assert(owner1 === player1);
        let owner2 = await game.ownerOf(2);
        assert(owner2 === player2);

        let supply = await game.meralSupply();
        assert(supply.toNumber() === 3);

        let meral1 = await game.getEthemeral(1);
        assert(parseInt(meral1[0]) === score1);
        assert(parseInt(meral1[1]) === rewards1);
        assert(parseInt(meral1[2]) === atk1);
        assert(parseInt(meral1[3]) === def1);
        assert(parseInt(meral1[4]) === spd1);

        let meral2 = await game.getEthemeral(2);
        assert(parseInt(meral2[0]) === score2);
        assert(parseInt(meral2[1]) === rewards2);
        assert(parseInt(meral2[2]) === atk2);
        assert(parseInt(meral2[3]) === def2);
        assert(parseInt(meral2[4]) === spd2);
    });

    it('should not migrate if not the admin calls', async () => {
        const id = 1;
        const recipient = player1;
        const rewards = 2000;
        const score = 300;
        const atk = 305;
        const def = 584;
        const spd = 394
        await expectRevert(game.migrateMeral(id, recipient, score, rewards, atk, def, spd, { from: player2 }), 'Ownable: caller is not the owner');
    });

    it('should not migrate meral that is alreadz migrated', async () => {
        const id1 = 1;
        const recipient1 = player1;
        const rewards1 = 2000;
        const score1 = 300;
        const atk1 = 305;
        const def1 = 584;
        const spd1 = 394
        await game.migrateMeral(id1, recipient1, score1, rewards1, atk1, def1, spd1);

        const id2 = 1;
        const recipient2 = player2;
        const rewards2 = 4000;
        const score2 = 200;
        const atk2 = 205;
        const def2 = 284;
        const spd2 = 294
        await expectRevert(game.migrateMeral(id2, recipient2, score2, rewards2, atk2, def2, spd2, { from: admin }), 'ERC721: token already minted.');
    });

});
