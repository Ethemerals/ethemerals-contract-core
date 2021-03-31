// firebase
const admin = require('firebase-admin');
const serviceAccount = require('./firebase_admin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cbae-f9c77-default-rtdb.firebaseio.com"
});

const db = admin.firestore();
const bucket = admin.storage().bucket('cbae-f9c77.appspot.com');

const erc1155Abi = '/home/tbach/Web/coin-baes/cb-contracts_v0.2/build/contracts/CryptoCoins.json';
const erc20Abi = '/home/tbach/Web/coin-baes/cb-contracts_v0.2/build/contracts/CryptoCoinsTokens.json';
const erc1155Address = '0xDDe0EED51f559eBDc2Ba3692e3A7a171d1304664';
const erc20Address = '0x1E25582c9f8d8cB50B1cf76E09d985c858d45841';


const updateStore = async (doc) => {
  try {
    const ref = await db.collection('utils').doc(doc.id);
    await ref.set(doc.data);
  } catch (error) {
    console.log(error);
  }
}



const updateStorage = async (blob) => {
  try {
    await bucket.upload(blob.filePath, {destination: blob.destFilePath});
  } catch (error) {
    console.log(error);
  }
}

const init = async () => {


  const erc1155Doc = {
    id: 'erc1155',
    data: {address: erc1155Address},
  }

  const erc20Doc = {
    id: 'erc20',
    data: {address: erc20Address},
  }

  const erc1155Blob = {
    filePath: erc1155Abi,
    destFilePath: 'contracts/erc1155/CryptoCoins.json',
  }

  const erc20Blob = {
    filePath: erc20Abi,
    destFilePath: 'contracts/erc20/CryptoCoinsTokens.json',
  }



  await updateStore(erc1155Doc);
  await updateStore(erc20Doc);
  await updateStorage(erc1155Blob);
  await updateStorage(erc20Blob);

  console.log('done');

}

init();