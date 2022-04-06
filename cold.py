
from mnemonic import Mnemonic
from bip_utils import Bip44Coins, Bip44

#The varaiable that will be the onlything exposed from cold
global xPubKey
global master
mnemo = Mnemonic("english")
# myMnemonic = mnemo.generate(strength=256)

#! Remove this from hard code to file
savedMnemonic = "onion wave electric town artist ostrich pupil uniform demise tomato basic include trumpet brain museum weekend room parent session grant cup ensure feel lemon"

#Create Seed from Mnemonic
seed = mnemo.to_seed(savedMnemonic, passphrase="")

#TODO Fix the xPub key to be hardened and match with the one on iancoleman.io
#Create a BIP44 Wallet using the mnemonic
master = Bip44.FromSeed(seed, Bip44Coins.BITCOIN)

#Create the xPub Key(Root Public Key) from the wallet
xPubKey = master.PublicKey().ToExtended()

f = open("pub", "w")
f.write(xPubKey)
f.close()


