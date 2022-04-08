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

    //var transaction = new Transaction()
    

    return null;
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
        //const addressFromFirstKid = await getAddressFromChild(kids[0])
        //console.log("Address: ", addressFromFirstKid)
        //The current head refers to the earliest child in kids that doesn't have any transactions

        //const head = await getCurrentHead(kids);
        //console.log("Current Head Child's Address: ", await getAddressFromChild(head));

        const utxoMap = await getUtxoMap(kids)
        //console.log("Utxo Map: ", utxoMap);

        //Get ScriptPubKey for a Given Child
        //const scriptPubKey = (await getTransactionInformationFromTxid(utxoMap.get(kids[0])[0].txid)).vout[0].scriptpubkey;
        //76a914048afd56271542e9ed2315294de350e30a9f7a4188ac

        //Manually Writing the UTXO
        var utxo = {
            "txId" : "7523242efb3f8585855e9b10460f3ef98f61a89ae976c722c0618d6032d0bdd8",
            "outputIndex" : 0,
            "address" : "mfvyVzF63cXU5kGF5oi4dpT7JNjaTUDvvQ",
            "script" : "76a914048afd56271542e9ed2315294de350e30a9f7a4188ac",
            "satoshis" : 50000
        };

        //Create Transaction Object
        var transaction = new bitcore.Transaction();
        transaction.from(utxo);
        transaction.to('mm8m3pg3PaJWNeANsMC2yy2PmgWLtqixAg', 15000);
        transaction.change('mm8m3pg3PaJWNeANsMC2yy2PmgWLtqixAg');

        //Send Transaction Object Without Signature over to Cold as Json
        //console.log(transaction.toObject());

        fs.writeFile('transaction', JSON.stringify(transaction.toObject()), err => {
            if (err) {
              console.error(err)
              return
            }
            console.log("Wrote Object To File")
            //file written successfully
        })

        transaction.sign("cW8YvnXxjFiHwnaKfVQbewzACkUEUDcbn91epFN83qvPcAuoNMJw");
        //console.log(transaction.serialize());

        console.log(transaction.isFullySigned());
        //transaction.serialize();

        console.log(transaction.toString())
        //broadcastToTestnet(transaction.toString());
        //console.log("Transaction Went Through!")
    }
});
