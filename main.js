import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import bitcoin from "bitcoinjs-lib";
import fs from "fs";
import axios from"axios";
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

//HELPER FUNCTIONS
//================================================================
//Generate Children at and index
const getChildAtIndex = async (xpub, account_index, change) => {

    if (change) {
        //bip44 path to create hierarchy
        let path = "1/" + account_index.toString();
        let root = bip32.fromBase58(xpub, bitcoin.networks.testnet);
        let child = root.derivePath(path);

        return child

    } else {
        //bip44 path to create hierarchy
        let path = "0/" + account_index.toString();
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
    var change = false;
    var lastTransactionNotEmpty = false;

    for (let i = 0; i < counter; i++) {

        //Create new adddress
        var child = await getChildAtIndex(xPub,i,change);
        var childAddress = await getAddressFromChild(child);
        change = !change;
        
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

        } catch (e) {
            console.log(e);
        }
    }
    return utxoMap;
}

//Create transactions
//====================================================================

//TODO
//Takes in a map of addresses with UTXOs
//Returns a transacton message that needs to be signed
const getTransactionMessage = async (utxoMap, currentHead) => {

    const utxomap = utxoMap;
    const head = currentHead;

    var transaction = new Transaction()
    

    return transaction;
}

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

        //The current head refers to the earliest child in kids that doesn't have any transactions
        const head = await getCurrentHead(kids);
        console.log("Current Head Child's Address: ", await getAddressFromChild(head));

        const utxoMap = await getUtxoMap(kids)
        console.log("Utxo Map: ", utxoMap);

        const transaction = getTransactionMessage(utxoMap, head);

    }
});
