const { expectRevert } = require('@openzeppelin/test-helpers');
const truffleAssert = require("truffle-assertions");
const CCT = artifacts.require('EthemeralLifeForce');
const Game = artifacts.require('Ethemerals');
const EscrowOnL1 = artifacts.require('EscrowOnL1');

contract('EscrowOnL1', (accounts) => {
    let game;
    let escrow;
    const [admin, player1, bridgeComponent] = [accounts[0], accounts[1], accounts[2]];

    beforeEach(async () => {
        cct = await CCT.new('CryptoCoinsTokens', 'CCT');
        game = await Game.new('https://api.hello.com/', cct.address);
        escrow = await EscrowOnL1.new(game.address);
        // the bridge script has to be the owner of the escrow contract: only this account can call the migrate function
        await escrow.transferOwnership(bridgeComponent);
        await game.mintReserve();
        await game.addDelegate(escrow.address, true);
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
                && e.atk.toNumber() === parseInt(meral[2])
                && e.def.toNumber() === parseInt(meral[3])
                && e.spd.toNumber() === parseInt(meral[4])
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

    it("should not transfer nonexistent token", async function () {
        let tokenId = 11;
        await expectRevert(escrow.transfer(tokenId, { from: player1 }), 'ERC721: owner query for nonexistent token.');
    });

    it('should migrate back from L2', async () => {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        let otherChainNonce = 0;
        let scoreOffset = 1;
        let scoreAdd = true;
        let scoreAmount = 2;
        let rewardsOffset = 3;
        let rewardsAdd = true;
        let rewardsAction = 1;
        await escrow.migrate(tokenId, admin, otherChainNonce, scoreOffset, scoreAdd, scoreAmount, rewardsOffset, rewardsAdd, rewardsAction, { from: bridgeComponent });

        owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);
        assert(parseInt(meral[0]) === 300 + scoreOffset);
        assert(parseInt(meral[1]) === 2000 + scoreAmount + rewardsOffset);
    });

    it("should not migrate back while the contract is paused", async function () {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        await escrow.pause({ from: bridgeComponent });
        let otherChainNonce = 0;
        let scoreOffset = 1;
        let scoreAdd = true;
        let scoreAmount = 2;
        let rewardsOffset = 3;
        let rewardsAdd = true;
        let rewardsAction = 1;
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, scoreOffset, scoreAdd, scoreAmount, rewardsOffset, rewardsAdd, rewardsAction, { from: bridgeComponent }), 'Not allowed while paused');
    });

    it("should not migrate back the token that is not in escrow", async function () {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        let otherChainNonce = 0;
        let scoreOffset = 1;
        let scoreAdd = true;
        let scoreAmount = 2;
        let rewardsOffset = 3;
        let rewardsAdd = true;
        let rewardsAction = 1;
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, scoreOffset, scoreAdd, scoreAmount, rewardsOffset, rewardsAdd, rewardsAction, { from: bridgeComponent }), 'Token is not in escrow');
    });

    it("should not migrate back the token that is already processed", async function () {
        let tokenId = 1;
        let owner = await game.ownerOf(tokenId);
        assert(owner === admin);

        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        let otherChainNonce = 0;
        let scoreOffset = 1;
        let scoreAdd = true;
        let scoreAmount = 2;
        let rewardsOffset = 3;
        let rewardsAdd = true;
        let rewardsAction = 1;
        await escrow.migrate(tokenId, admin, otherChainNonce, scoreOffset, scoreAdd, scoreAmount, rewardsOffset, rewardsAdd, rewardsAction, { from: bridgeComponent });

        owner = await game.ownerOf(tokenId);
        assert(owner === admin);
        let meral = await game.getEthemeral(tokenId);
        assert(parseInt(meral[0]) === 300 + scoreOffset);
        assert(parseInt(meral[1]) === 2000 + scoreAmount + rewardsOffset);

        // transfer again to put the token into escrow
        await game.approve(escrow.address, tokenId);
        await escrow.transfer(tokenId);
        owner = await game.ownerOf(tokenId);
        assert(owner === escrow.address);

        // trying to migrate back with the previous nonce that is already processed will revert
        await expectRevert(escrow.migrate(tokenId, admin, otherChainNonce, scoreOffset, scoreAdd, scoreAmount, rewardsOffset, rewardsAdd, rewardsAction, { from: bridgeComponent }), 'transfer already processed');
    });
});
