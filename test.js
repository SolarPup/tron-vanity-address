///////////////////////////////////
//      Blockchain Tests          //
///////////////////////////////////

const { Block, Blockchain } = require('./blockchain');

let passed = 0;
let failed = 0;

function assert(description, condition) {
    if (condition) {
        console.log('  PASS:', description);
        passed++;
    } else {
        console.error('  FAIL:', description);
        failed++;
    }
}

// --- Block tests ---
console.log('\nBlock');

const block = new Block(0, '2024-01-01T00:00:00.000Z', { message: 'test' }, '0');
assert('calculateHash returns a non-empty string', typeof block.hash === 'string' && block.hash.length > 0);
assert('hash changes when nonce changes', (() => {
    const h1 = block.hash;
    block.nonce++;
    const h2 = block.calculateHash();
    return h1 !== h2;
})());

// --- Blockchain tests ---
console.log('\nBlockchain');

const bc = new Blockchain(2);
assert('starts with a genesis block', bc.chain.length === 1);
assert('genesis block has index 0', bc.chain[0].index === 0);
assert('fresh chain is valid', bc.isChainValid());

bc.addBlock({ from: 'TAddr1', to: 'TAddr2', amount: 100 });
bc.addBlock({ from: 'TAddr2', to: 'TAddr3', amount: 50 });
assert('chain grows after adding blocks', bc.chain.length === 3);
assert('chain is valid after adding blocks', bc.isChainValid());

// Tamper with block data and verify chain becomes invalid
bc.chain[1].data = { from: 'TAddr1', to: 'TAddr2', amount: 9999 };
assert('chain is invalid after tampering with block data', !bc.isChainValid());

// Recalculate hash after tamper to also break previousHash link
bc.chain[1].hash = bc.chain[1].calculateHash();
assert('chain is invalid when previousHash link is broken', !bc.isChainValid());

// --- Summary ---
console.log('\n' + (failed === 0 ? 'All' : failed + ' of ' + (passed + failed)) + ' tests ' + (failed === 0 ? 'passed.' : 'failed.'));
process.exit(failed > 0 ? 1 : 0);
