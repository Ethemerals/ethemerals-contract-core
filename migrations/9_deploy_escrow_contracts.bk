const Ethemerals = artifacts.require('Ethemerals');
const EthemeralsOnL2 = artifacts.require('EthemeralsOnL2');
const EscrowOnL1 = artifacts.require('EscrowOnL1');
const EscrowOnL2 = artifacts.require('EscrowOnL2');

module.exports = async function (deployer, network) {
    const birdgeComponentAddress = "!!!TO BE DEFINED!!!"
    switch (network) {
        case "rinkeby":
            let ethemerals = await Ethemerals.deployed();
            let escrowOnL1 = deployer.deploy(EscrowOnL1, ethemerals.address);
            // bridge component is the owner of the escrow contracts
            await escrowOnL1.transferOwnership(bridgbirdgeComponentAddresseComponent);
            // we need to add the escrow contract as delegate for the changeScore and changeRewards function to work
            await ethemerals.addDelegate(escrowOnL1.address, true);
            break;
        case "arbitrum_rinkeby":
            let ethemeralsOnL2 = await EthemeralsOnL2.deployed()
            let escrowOnL2 = deployer.deploy(EscrowOnL2, ethemeralsOnL2.address);
            // bridge component is the owner of the escrow contracts
            await escrowOnL2.transferOwnership(bridgbirdgeComponentAddresseComponent);
            // we need to add the escrow contract as delegate for the changeScore and changeRewards function to work
            await ethemeralsOnL2.addDelegate(escrowOnL2.address, true);
            // migrate and update functions of the ethemeralsOnL2 can be called only by the escrow contract therefore the ethemeralsOnL2 has to be aware if the escrow's address
            await ethemeralsOnL2.setEscrowAddress(escrowOnL2.address);
            break;
    }
};

