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
}

main();