require('dotenv').config();
const { request, gql } = require('graphql-request')
const Web3 = require('web3');
const Ethemerals = require('../abi/arbitrumRinkeby/Ethemerals.json');

const provider = new Web3.providers.HttpProvider(`https://arbitrum-rinkeby.infura.io/v3/${process.env.PROJECTID}`);
const web3 = new Web3(provider);

const { address: admin } = web3.eth.accounts.wallet.add(`${process.env.ADMIN_KEY}`);

const ethemeralsContractAddress = Ethemerals.networks['421611'].address;
const ethemeralsContract = new web3.eth.Contract(
    Ethemerals.abi,
    ethemeralsContractAddress
);

const subgraphEndpoint = 'https://api.thegraph.com/subgraphs/name/ethemerals/ethemerals'
const query = gql`
    {
        ethemerals(first: 1000) {
            id
            owner {
            id
            }
            rewards
            score
            atk
            def
            spd
    
        }
    }`

async function main() {
    const data = await request(subgraphEndpoint, query)
    // first needs to sort the meral array by ID interpreted as integer since in thegraph the ID is string so that gives a different order
    const meralsOrderedById = data.ethemerals.map(meral => {
        meral.intId = parseInt(meral.id);
        return meral;
    }).sort((meral1, meral2) => (meral1.intId > meral2.intId) ? 1 : -1);

    for (let meral of meralsOrderedById) {
        const tx = ethemeralsContract.methods
            .migrateMeral(meral.id, meral.owner.id, meral.score, meral.rewards, meral.atk, meral.def, meral.spd);
        const [gasPrice, gasCost] = await Promise.all([
            web3.eth.getGasPrice(),
            tx.estimateGas({ from: admin }),
        ]);
        gasPriceIncreased = 2 * gasPrice;
        const data = tx.encodeABI();
        const txData = {
            from: admin,
            to: ethemeralsContractAddress,
            data,
            gas: gasCost,
            gasPriceIncreased
        };
        await web3.eth.sendTransaction(txData)
            .on('receipt', function (receipt) {
                console.log(`Meral has been migrated:\n` + JSON.stringify(meral, undefined, 2));
            })
            .on('error', function (error) {
                console.log("Transaction error: " + error);
            });
        // has to wait one second because in some rare cases the transaction nonce was out of sync even after the trx confirmation
        setTimeout(function () {
            console.log("Waiting")
        }, 1000);
    }
}

main().catch((error) => console.error(error))