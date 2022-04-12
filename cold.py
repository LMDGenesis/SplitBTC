from hdwallet import HDWallet
from hdwallet.symbols import BTCTEST as SYMBOL
from hdwallet.derivations import BIP44Derivation
from hdwallet.utils import generate_mnemonic
from typing import Optional
from btcpy.setup import setup
from btcpy.structs.transaction import Transaction, TransactionFactory, MutableTransaction, TxIn, TxOut, Locktime
from btcpy.structs.crypto import PrivateKey, PublicKey
from btcpy.structs.script import Script, ScriptBuilder, PublicKey, ScriptSig
from btcpy.structs.sig import Solver, Sighash, P2pkhScript, P2pkhSolver, P2wshV0Solver
import json

# Generate english mnemonic words
mnemonic = "genre clinic accident dolphin disease sorry library radio regular echo exhibit return identify nice tiny quit act tunnel guess flush chaos pelican slender gaze"

def sendXPubKey(mnemonic): 
    wallet = HDWallet(SYMBOL, False)
    root = wallet.from_mnemonic(mnemonic)
    child = root.from_path("m/44'/1'/1'/0")
    xPubKey = child.xpublic_key()
    f = open("pub", "w")
    f.write(xPubKey)
    f.close()
    

sendXPubKey(mnemonic)

f = open("transaction", "r")
transaction = f.read()
f.close()

f = open("childIndex", "r")
kidsIndex = f.read()
f.close()
kidsIndex = json.loads(kidsIndex)

f = open("utxoInfo", "r")
utxoInfo = f.read()
f.close()

utxoInfoArray = json.loads(utxoInfo)

counter = 0;
unlocks = []
locks = []

#For each index in childIndex create an unlock script and x locks
for index in kidsIndex:
    wallet = HDWallet(SYMBOL, False)
    root = wallet.from_mnemonic(mnemonic)
    child = root.from_path("m/44'/1'/1'/0/"+str(index))
    

    # print(json.dumps(child.dumps(), indent=4, ensure_ascii=False))
    
    private = child.private_key()
    priv = PrivateKey.unhexlify(private)

    pub = child.public_key()
    public = PublicKey.unhexlify(pub)
    
    lock = P2pkhScript(public)
    unlock = P2pkhSolver(priv)

    # print("Counter: ", counter)
    # print("Index: ", index)
    # print("Child: ", child)
    # print("Priv: ", priv)
    # print("Pub: ", public)
    # print("Lock: ", lock)
    # print("Unlock: ", unlock)
    
    txOut = TxOut(value=utxoInfoArray[counter].get("satoshis"),n=utxoInfoArray[counter].get("outputIndex"), script_pubkey=lock)
    # print("TxOut: ", txOut)
    locks.append(txOut)
    unlocks.append(unlock)
    
    counter+=1;
    
unsigned = MutableTransaction.unhexlify(transaction)
print(unsigned)
signed = unsigned.spend(locks, unlocks)
print(signed)
signed = signed.hexlify()


f = open("signedTransaction", "w")
f.write(signed)
f.close()