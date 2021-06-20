const writeJsonFile = require('write-json-file');


const EthemeralLifeForce = require("../build/contracts/EthemeralLifeForce.json")
const Ethemerals = require("../build/contracts/Ethemerals.json");
const EternalBattle = require("../build/contracts/EternalBattle.json")
const PriceFeed = require("../build/contracts/PriceFeed.json")

const main = async () => {
  await writeJsonFile('./abi/EthemeralLifeForce.json', EthemeralLifeForce.abi);
  await writeJsonFile('./abi/Ethemerals.json', Ethemerals.abi);
  await writeJsonFile('./abi/EternalBattle.json', EternalBattle.abi);
  await writeJsonFile('./abi/PriceFeed.json', PriceFeed.abi);

  const addresses = [{
    EthemeralLifeForce: EthemeralLifeForce.networks['42'].address,
    Ethemerals: Ethemerals.networks['42'].address,
    EternalBattle: EternalBattle.networks['42'].address,
    PriceFeed: PriceFeed.networks['42'].address,
  }]

  await writeJsonFile('./abi/Addresses.json', addresses);
}

main();

