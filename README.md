# Tron Vanity Address

Generate a vanity address for the Tron network.

Simply `git clone` the repo, then run the program with `node index` and follow the prompts. Here I created a custom address containing "JSun" for Justin Sun.

![alt text](https://i.imgur.com/KaOhDLr.png)

Keep in mind that to create custom addresses with >4 characters can be very computer and time intensive.

Creating an address also doesn't mean that it exists on the Tron network. You will still need to activate your account by sending it some TRX or registering it with their protocol. (As always, don't send TRX to testnet accounts or they will be lost forever.)

## Blockchain

The repository also includes a simple blockchain implementation in `blockchain.js`. It provides:

- **`Block`** – a block with `index`, `timestamp`, `data`, `previousHash`, `hash`, and `nonce`.
- **`Blockchain`** – a chain of blocks with proof-of-work mining and chain validation.

### Usage

```js
const { Blockchain } = require('./blockchain');

const bc = new Blockchain(2); // difficulty 2

bc.addBlock({ from: 'TAddr1', to: 'TAddr2', amount: 100 });
bc.addBlock({ from: 'TAddr2', to: 'TAddr3', amount: 50 });

console.log('Chain valid:', bc.isChainValid()); // true
```

Run `npm test` to verify the blockchain works correctly.

Enjoy! :)
