
from mnemonic import Mnemonic
from bip_utils import Bip44Coins, Bip44
import json

#The varaiable that will be the onlything exposed from cold
global xPubKey
global master
mnemo = Mnemonic("english")
# myMnemonic = mnemo.generate(strength=256)

#! Remove this from hard code to file
savedMnemonic = "onion wave electric town artist ostrich pupil uniform demise tomato basic include trumpet brain museum weekend room parent session grant cup ensure feel lemon"

#Create Seed from Mnemonic
seed = mnemo.to_seed(savedMnemonic, passphrase="")


#Create a BIP44 Wallet using the mnemonic
master = Bip44.FromSeed(seed, Bip44Coins.BITCOIN_TESTNET)

#m/44/1/0 (0|1)
# Derive account 0 for Bitcoin: m/44'/0'/0'
bip44_acc_ctx = master.Purpose().Coin().Account(1)

# Print keys in extended format
#print(bip44_acc_ctx.PublicKey().ToExtended())

#Create the xPub Key(Root Public Key) from the wallet
xPubKey = bip44_acc_ctx.PublicKey().ToExtended()

f = open("pub", "w")
f.write(xPubKey)
f.close()


f = open("transaction", "r")
#print(f.read())
transactionJson = json.loads(f.read());
print(transactionJson)

