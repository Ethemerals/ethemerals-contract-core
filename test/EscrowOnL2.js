const { expectRevert } = require('@openzeppelin/test-helpers');
const truffleAssert = require("truffle-assertions");
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('EthemeralsOnL2');
const EscrowOnL2 = artifacts.require('EscrowOnL2');

contract('EscrowOnL2', (accounts) => {
    let game;
    let escrow;
    const [admin, player1, bridgeComponent] = [accounts[0], accounts[1], accounts[2]];

    beforeEach(async () => {
        cct = await CCT.new('CryptoCoinsTokens', 'CCT');
        game = await Game.new('https://api.hello.com/', cct.address);
        escrow = await EscrowOnL2.new(game.address);
        // the bridge script has to be the owner of the escrow contract: only this account can call the migrate function
        await escrow.transferOwnership(bridgeComponent);
        await game.mintReserve();
        await game.addDelegate(escrow.address, true);
        await game.setEscrowAddress(escrow.address);
    });

    it('should transfer meral', async () => {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);

        // !!! We need to first approve the escrow contract for being able to transfer the token
        // !!! Implications: the UI also has to first ask the user to approve the escrow contract to transfer his token
        await game.approve(escrow.address, tokenId);
        let result = await escrow.transfer(tokenId);
        truffleAssert.eventEmitted(result, 'Transfer');
        truffleAssert.eventEmitted(result, 'Transfer', (e) => {
            return e.id.toNumber() === tokenId
                && e.recipient === owner
                && e.score.toNumber() === parseInt(meral[0])
                && e.rewards.toNumber() === parseInt(meral[1])
                && e.nonce.toNumber() === 0;
        }, 'event params incorrect');

        owner = await game.ownerOf(1);
        assert(owner === escrow.address);
    });

    it("should not transfer while the contract is paused", async function () {
        await escrow.pause({ from: bridgeComponent });
        let tokenId = 1;
        await game.approve(escrow.address, tokenId);
        await expectRevert(escrow.transfer(tokenId), 'Not allowed while paused');
    });

    it("should not transfer if not the owner is the initiator", async function () {
        let tokenId = 1;
        await game.approve(escrow.address, tokenId);
        await expectRevert(escrow.transfer(tokenId, { from: player1 }), 'Only the owner can initiate a transfer into the escrow');
    });

    it('should migrate from L1 a token that does not exist on L2 yet', async () => {
        // this token id is not minted in game.mintReserve()
        let tokenId = 11;

        // migration
        let otherChainNonce = 0;
        let score = 100;
        let rewards = 300;
        let atk = 234;
        let def = 178;
        let spd = 432;
        await escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent });

        owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);
        assert(parseInt(meral[0]) === score);
        assert(parseInt(meral[1]) === rewards);
        assert(parseInt(meral[2]) === atk);
        assert(parseInt(meral[3]) === def);
        assert(parseInt(meral[4]) === spd);
    });

    it('should migrate from L1 a token that already exist on L2 and is in the escrow', async () => {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        // first transfer
        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        // migration back
        let otherChainNonce = 0;
        let score = 100;
        let rewards = 300;
        let atk = 234;
        let def = 178;
        let spd = 432;
        await escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent });

        owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);
        assert(parseInt(meral[0]) === score);
        assert(parseInt(meral[1]) === rewards);
        assert(parseInt(meral[2]) === atk);
        assert(parseInt(meral[3]) === def);
        assert(parseInt(meral[4]) === spd);
    });

    it('should not migrate from L1 a token that already exist on L2 and is not in the escrow', async () => {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        // migration of the existing token that is not in the escrow
        let otherChainNonce = 0;
        let score = 100;
        let rewards = 300;
        let atk = 234;
        let def = 178;
        let spd = 432;
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent }), 'Tokens already exists and not in the escrow');
    });

    it("should not migrate while the contract is paused", async function () {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        await escrow.pause({ from: bridgeComponent });
        let otherChainNonce = 0;
        let score = 100;
        let rewards = 300;
        let atk = 234;
        let def = 178;
        let spd = 432;
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent }), 'Not allowed while paused');
    });

    it("should not migrate back the token that is already processed", async function () {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        // first transfer
        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        // first migration
        let otherChainNonce = 0;
        let score = 100;
        let rewards = 300;
        let atk = 234;
        let def = 178;
        let spd = 432;
        await escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent });

        owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);
        assert(parseInt(meral[0]) === score);
        assert(parseInt(meral[1]) === rewards);
        assert(parseInt(meral[2]) === atk);
        assert(parseInt(meral[3]) === def);
        assert(parseInt(meral[4]) === spd);

        // transfer again to put the token into escrow
        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        // trying to migrate back with the previous nonce that is already processed will revert
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, score, rewards, atk, def, spd, { from: bridgeComponent }), 'transfer already processed');
    });
});
