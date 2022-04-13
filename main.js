import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import bitcoin from "bitcoinjs-lib";
import fs from "fs";
import axios from "axios";
import bitcore from "bitcore-lib";
import assert from "assert-plus";
const bip32 = BIP32Factory(ecc);

//API CALLS
//================================================================
//Get transaction history from address
const getTransactionsFromAddress = async (address) => {
    try {
      const resp = await axios.get(
        "https://blockstream.info/testnet/api//address/" + address + "/txs"
      );
      //console.log(resp.data[0]);
      return resp.data;
    } catch (e) {
      console.log(e);
    }
};

const getTransactionInformationFromTxid = async (tx) => {
    try {
      const resp = await axios.get(
        "https://blockstream.info/testnet/api//tx/" + tx
      );
      //console.log(resp.data[0]);
      return resp.data;
    } catch (e) {
      console.log(e);
    }
};

//Post Transaction
const broadcastToTestnet = async (transaction) => {
    try {
      await axios({
        method: "post",
        url: "https://blockstream.info/testnet/api/tx",
        data: transaction,
      });
    } catch (e) {
      console.log(e);
    }
};

//HELPER FUNCTIONS
//================================================================
//Generate Children at and index
const getChildAtIndex = async (xpub, account_index, change) => {

    if (change) {
        //bip44 path to create hierarchy
        let path = account_index.toString();
        let root = bip32.fromBase58(xpub, bitcoin.networks.testnet);
        let child = root.derivePath(path);

        return child

    } else {
        //bip44 path to create hierarchy
        let path = account_index.toString();
        let root = bip32.fromBase58(xpub, bitcoin.networks.testnet)
        let child = root.derivePath(path);

        return child
    }
}

//Get Address from child
const getAddressFromChild = async (child) => {

    let { address } = bitcoin.payments.p2pkh({
        pubkey: child.publicKey,
        network: bitcoin.networks.testnet,
    });
    return address
}

//Create 20 children that have no transactions
//Return an array of children
const getChildren = async(xpub) => {

    var children = [];
    //Create addresses and keypairs
    //Make sure 20 children have no transaction history
    var counter = 20;
    const xPub = xpub;
    var lastTransactionNotEmpty = false;

    for (let i = 0; i < counter; i++) {

        //Create new adddress
        var child = await getChildAtIndex(xPub,i,false);
        var childAddress = await getAddressFromChild(child);
        
        //Check Whether address has transactions or not
        var transactions = await getTransactionsFromAddress(childAddress);

        if (transactions.length == 0) {
            if (lastTransactionNotEmpty) {
                lastTransactionNotEmpty = false;
            }
            lastTransactionNotEmpty = false;
        } else {
            lastTransactionNotEmpty = true;
            counter += 1;
        }
    
        children.push(child);
    }

    return children;
}

//Takes in a child array
//Returns the first address without a transaction
const getCurrentHead = async(childArray) => {

    for (let i = 0; i < childArray.length; i++) {
        var address = await getAddressFromChild(childArray[i]);
        //console.log(address);
        var transactions = await getTransactionsFromAddress(address);

        if (transactions.length == 0) {
            return address
        }
    }
}

const getCurrentHeadKid = async(childArray) => {

    for (let i = 0; i < childArray.length; i++) {
        var address = await getAddressFromChild(childArray[i]);
        //console.log(address);
        var transactions = await getTransactionsFromAddress(address);

        if (transactions.length == 0) {
            return childArray[i]
        }
    }
}

//Takes in a list of addresses
//Returns a map with a keypair of children and their utxos
const getUtxoMap = async (childArray) => {

    var utxoMap = new Map();

    for (let i = 0; i < childArray.length; i++) {
        var address = await getAddressFromChild(childArray[i]);

        try {
            var resp = await axios.get(
                "https://blockstream.info/testnet/api/address/" + address + "/utxo"
            );
            
            if(resp.data.length > 0) {
                utxoMap.set(childArray[i], resp.data)
            }
            else{
                utxoMap.set(childArray[i], [])
            }

        } catch (e) {
            console.log(e);
        }
    }

    return utxoMap;
}

//Input: UTXO Map, List of Kids
//Output Array of UTXO Objects in Bitcore Transaction Formation
const writeUTXOInformation = async (utxoMap, kids) => {

    var headIndex = await getCurrentHeadKid(kids)
    //The array containing the finished UTXO objects for bitcore transactions
    var utxoArray = [];

    //Used in cold storage
    var kidIndex = [];

    //Loop through every kid in the UTXO Map
    for(let i = headIndex.index-1; i > 0 ; i--){

        //The array for each child containing their UTXO information

        var childsUtxos = utxoMap.get(kids[i])

        console.log(utxoMap.get(kids[i]))
        //For each UTXO Information object they child has
        for(let x = 0; x < childsUtxos.length; x++){

            //console.log(childsUtxos[x]);
            //Gather information into a UTXO object for bitcore

            var transInfo = await getTransactionInformationFromTxid(childsUtxos[x].txid)
            var address = await getAddressFromChild(kids[i])
            var scriptPubKey = ""
            for(let p = 0; p < transInfo.vout.length; p++){
                if(address == transInfo.vout[p].scriptpubkey_address){
                    scriptPubKey = transInfo.vout[p].scriptpubkey
                }
            }
            //console.log(transInfo)
            var utxo = {
                "txId" : childsUtxos[x].txid,
                "outputIndex" : childsUtxos[x].vout,
                "address" : address,
                "script" : scriptPubKey,
                "satoshis" : childsUtxos[x].value
            };
            //console.log(utxo)
            //Send that object into the utxoArray
            kidIndex.push(kids[i].index)
            utxoArray.push(utxo)
        }
        fs.writeFile('childIndex', JSON.stringify(kidIndex), err => {
            if (err) {
              console.error(err)
              return
            }
            console.log("childIndex Updated")
            //file written successfully
        })
        
    }
    return utxoArray
}

//Input: Array of Utxo Information
//Output: Writes Utxo information to a file
const fileUtxos = async (utxoInformationArray) => {
    fs.writeFile('utxoInfo', JSON.stringify(utxoInformationArray), err => {
        if (err) {
          console.error(err)
          return
        }
        console.log("Wrote Utxos Information to utxoInfo")
        //file written successfully
    })
}

//Create transactions
//====================================================================

//Main
//====================================================================
fs.readFile("pub", "utf8", async function readFileCallback(err, data) {

    if (err) {
        console.log(err);
    }
    else {

        //Get xPublic Key
        const xPub = data.toString();
        console.log("xPub: ", xPub);

        const kids = await getChildren(xPub);
        const currentHead = await getCurrentHead(kids);

        console.log("Head Index: ", currentHead)
        const utxoMap = await getUtxoMap(kids)
        //console.log("Utxo Map: ", utxoMap);
        //console.log("Utxo List: ", await writeUTXOInformation(utxoMap,kids));
        const utxosArray = await writeUTXOInformation(utxoMap,kids);
        fileUtxos(utxosArray);

        //Create Transaction Object
        var transaction = new bitcore.Transaction();
        transaction.from(utxosArray);

        //Address to send it to and the amount to send
        transaction.to('tb1qjg3xv4pfzcwhrph7lz3pmzrwhalq8y839k7p9d', 150000);
        //Current Head to send change to
        transaction.change(currentHead);

        //Send Transaction Object Without Signature over to Cold as Json
        fs.writeFile('transaction', transaction.toString(), err => {
            if (err) {
              console.error(err)
              return
            }
            console.log("Wrote Object To File")
            //file written successfully
        })
        //Run the python file
        
        //console.log(transaction.toString())

        fs.readFile("signedTransaction", "utf8", async function readFileCallback(err, data) {

            if (err) {
                console.log(err);
            }else{

                let signedTransaction = data;
                broadcastToTestnet(signedTransaction)
                //console.log(signedTransaction)
                console.log("Transaction Went Through!")
            }
        })
        //transaction.sign("cW8YvnXxjFiHwnaKfVQbewzACkUEUDcbn91epFN83qvPcAuoNMJw");
        //console.log(transaction.serialize());

        //console.log(transaction.isFullySigned());
        //transaction.serialize();

        //console.log(transaction.toString())
        //broadcastToTestnet(transaction.toString());
        //console.log("Transaction Went Through!")*/
    }
});
