const fs = require('fs')
const { HDPublicKey, PublicKey, Address, Networks } = require('bitcore-lib')
const bs58 = require('bs58')

//TODO (Check if address has transactions on it, if it does add make loop again)
//Takes in a xPub  
//Returns a list of Address objects that are all addresses with transactions and 20 more fresh ones
const getChildAddresses = async (xPub) => {

    //Turn the xPub into the root Address Object (xPub -> HDPubKey -> Address Object)
    const hdPublicKey = HDPublicKey(xPub, Networks.testnet);
    let rootAddress = new Address(hdPublicKey.publicKey)
    var childAddresses = [];

    // We'll generate the first 20 addresses (default number of addresses that Electrum shows you)
    for (let i = 0; i < 20; i++) {
    
        //Create Derived Child
        var child = hdPublicKey.deriveChild(`m/44/1/0/0/${i}`);

        //Address Class into ChildAddress array
        if (Address.isValid(rootAddress, Networks.testnet)){
            //console.log(rootAddress);
            //console.log(rootAddress.toString());
            childAddresses.push(new Address(child.publicKey));
        }
    }
    return childAddresses;
}

//TODO Check if working
//Takes in a list of addresses 
//Returns a map with a keypair of addresses and their utxos
const getAddressesWithUTXO = async (addressesArray) => {

    let insight = new Insight('testnet');
    let utxoAddresses = new map();
    for (let i = 0; i < addressesArray.length; i++) {

        insight.getUtxos(addressesArray[i], (err, utxos) => {
            if(err){ 
                //Handle errors
                console.log("Address, " + addressesArray[i]  + " did not have a UTXO");
            }else{
                    console.log(utxos)
                    utxoAddresses.set(addressesArray[i],utxos)
            }
        });
    }
}

//TODO
//Takes in a list of addresses with UTXOs
//Returns a transacton message that needs to be signed
const getTransactionMessage = async (xPub) => {

    return null;
}


fs.readFile("pub", "utf8", async function readFileCallback(err, data) {
    
    if (err) {
      console.log(err);
    }
    else{

        //Get xPublic Key
        const xPub = data.toString();
        var childAddresses = await getChildAddresses(xPub);
        console.log(childAddresses[0]);
    }
});
