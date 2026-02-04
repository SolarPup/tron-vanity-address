///////////////////////////////////
// TRON Vanity Address Generator //
//         By Dean Little        //
///////////////////////////////////

/*
    Please take note that simply generating an address doesn't 
    automatically make it exist on the TRON network. You need
    to invoke it on the network through the account creation
    protocol, or send some TRX to it for it to exist on the
    network. As always, don't send TRX to testnet addresses
    or it wil lbe lost forever!
*/

//Includes
const rl = require('readline');
const CryptoJS = require("crypto-js");;
const base58 = require('base-58');
const elliptic = require('elliptic');
const keccak256 = require('js-sha3').keccak256;
const ec = new elliptic.ec('secp256k1');
const os = require('os');
const { Worker } = require('worker_threads');
const yargs = require('yargs');
const { expectedAttempts } = require('./lib/matcher');

//Variables
let testnet = false;
let string = '';

leadingZeroes = (a, b) => {
    return (a.length<b) ? new Array(b+1-a.length).join('0') + a : a.slice(0,b);
}

isHexChar = (c) => {
  if ((c >= 'A' && c <= 'F') ||
      (c >= 'a' && c <= 'f') ||
      (c >= '0' && c <= '9')) {
    return 1;
  }
  return 0;
}

hexChar2byte = (c) => {
  var d = 0;
  if (c >= 'A' && c <= 'F') {
    d = c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
  }
  else if (c >= 'a' && c <= 'f') {
    d = c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
  }
  else if (c >= '0' && c <= '9') {
    d = c.charCodeAt(0) - '0'.charCodeAt(0);
  }
  return d;
}

hexStr2byteArray = (str) => {
  var byteArray = Array();
  var d = 0;
  var j = 0;
  var k = 0;

  for (let i = 0; i < str.length; i++) {
    var c = str.charAt(i);
    if (isHexChar(c)) {
      d <<= 4;
      d += hexChar2byte(c);
      j++;
      if (0 === (j % 2)) {
        byteArray[k++] = d;
        d = 0;
      }
    }
  }
  return byteArray;
}

byte2hexStr = (byte) => {
  var hexByteMap = "0123456789ABCDEF";
  var str = "";
  str += hexByteMap.charAt(byte >> 4);
  str += hexByteMap.charAt(byte & 0x0f);
  return str;
}

byteArray2hexStr = (byteArray) => {
  var str = "";
  for (var i = 0; i < (byteArray.length - 1); i++) {
    str += byte2hexStr(byteArray[i]);
  }
  str += byte2hexStr(byteArray[i]);
  return str;
}

// UI helpers (module-level so they can be tested)
function formatHashrate(h) {
  if (h < 1000) return h + '/s';
  if (h < 1000 * 1000) return (h / 1000).toFixed(2) + 'k/s';
  if (h < 1000 * 1000 * 1000) return (h / (1000*1000)).toFixed(2) + 'M/s';
  return (h / (1000*1000*1000)).toFixed(2) + 'G/s';
}

function formatDuration(seconds) {
  if (seconds === null) return 'n/a';
  if (seconds < 60) return seconds + 's';
  if (seconds < 3600) return Math.floor(seconds/60) + 'm' + (seconds%60) + 's';
  const h = Math.floor(seconds/3600);
  const m = Math.floor((seconds%3600)/60);
  return h + 'h' + m + 'm';
}


genTronAddress = (testNet = false) =>{    
    let keyPair = ec.genKeyPair();
    // let testNet = testNet;
    let publicBytes = keyPair.getPublic('bytes');
    if (publicBytes.length === 65) {
        publicBytes = publicBytes.slice(1);
    }
    let publicKey = byteArray2hexStr(publicBytes);
    let sha3 = keccak256(publicBytes).toString();
    let addressHex = (testNet) ? 'a0' : 'b0';
    addressHex+=sha3.substring(24);
    let hash0 = CryptoJS.SHA256(hexStr2byteArray(addressHex)).toString();
    let hash1 = CryptoJS.SHA256(hexStr2byteArray(hash0)).toString();
    let checkSum = hash1.slice(0,8);
    let addressCheckSum = addressHex + checkSum;
    let addressBase58 = base58.encode(hexStr2byteArray(addressCheckSum));
    let addresses = [leadingZeroes(keyPair.getPrivate('hex'), 64), addressBase58];
    console.log(addresses[0] + " - " + addresses[1]);
    return addresses;
}

ask = (question, callback) => {
  var r = rl.createInterface({
    input: process.stdin,
    output: process.stdout});
  r.question(question + '\n', function(answer) {
    r.close();
    callback(null, answer);
  });
}

askTestNet = () => {
    ask('Is this a testnet account? y/n', testNetCB);
};

askString = () => {
    ask('What string do you want? (<5 chars recommended)', stringCB);
}

testNetCB = (a, b) => {
    if(b.toLowerCase() !== 'y' && b.toLowerCase() !== 'n'){
        console.log("Invalid answer. Please choose y or n.");
        askTestNet();
        return;
    } else {
        if(b.toLowerCase() === 'y'){
            testnet = true;
        }
        askString();
    }
}

stringCB = (a, b) => {
    if(b === ''){
        console.log("Please enter a valid string.");
        askString();
        return;
    } else {
        string = b;
        generateAddress();
    }
}


generateAddress = () => {
    var address = genTronAddress(testnet);
    var i=0;
    var start = new Date();
    while(!address[1].match(new RegExp(string,"gi"))) {
        i++;
        address = genTronAddress(testnet);
        setTimeout(function(){},0);    
    }
    let d = Math.floor((new Date().getTime() - start.getTime())/1000);
    console.log();
    console.log('---------------------------------------------');
    console.log();
    console.log('Generated in ' + i + ' iterations. Total time taken: ' + d + " second(s).");
    console.log('Private key: ' + address[0]);
    console.log('Address: ' + address[1]);
}

// CLI parsing: support fixed-edges mode
const argv = yargs(process.argv.slice(2)).options({
  'similar-to': { type: 'string' },
  'mode': { type: 'string' },
  'fixed-left': { type: 'number', default: 7 },
  'fixed-right': { type: 'number', default: 6 },
  'threads': { type: 'number', default: Math.max(1, os.cpus().length - 1) },
  'time-limit': { type: 'number', default: 60 },
  'max-attempts': { type: 'number', default: 0 },
  'reveal-private-key': { type: 'boolean', default: false },
  'save-file': { type: 'string' },
  'encrypt': { type: 'boolean', default: false },
  'encrypt-pass': { type: 'string' },
  'testnet': { type: 'boolean', default: false }
}).argv;

async function startFixedEdges(cfg) {
  if (!cfg['similar-to']) {
    console.log('Error: --similar-to is required for fixed-edges mode');
    return;
  }
  const path = require('path');
  const workerPath = path.resolve(__dirname, 'workers', 'worker.js');
  const threads = cfg.threads || 1;
  let found = false;
  let globalAttempts = 0;
  const reveal = !!cfg['reveal-private-key'];
  const saveFile = cfg['save-file'];
  const encrypt = !!cfg['encrypt'];
  const encryptPass = cfg['encrypt-pass'];

  const initialLeft = cfg['fixed-left'];
  const initialRight = cfg['fixed-right'];

  // expose helpers for tests (also exported in module.exports at bottom)
  // (kept for backwards compatibility)
  exports.formatHashrate = formatHashrate;
  exports.formatDuration = formatDuration;

  function renderBar(progress, total, width = 40) {
    const percent = total > 0 ? Math.min(1, progress / total) : 0;
    const filled = Math.round(percent * width);
    const bar = '[' + '#'.repeat(filled) + '-'.repeat(width - filled) + ']';
    return `${bar} ${(percent * 100).toFixed(2)}%`;
  }

  const { savePrivateKeyToFile } = require('./lib/io');
const { validatePassphrase } = require('./lib/security');
const cliProgress = require('cli-progress');

  async function runPhase(left, right) {
    let activeWorkers = [];
    let workerAttempts = new Array(threads).fill(0);
    let workerDoneCount = 0;
    const phaseStart = Date.now();

    // If encryption requested but no passphrase provided, prompt interactively
    async function ensurePassphrase() {
      if (encrypt && !encryptPass) {
        try {
          const pass = await promptPassphrase('Enter passphrase for private key encryption: ');
          const pass2 = await promptPassphrase('Confirm passphrase: ');
          if (pass !== pass2) throw new Error('Passphrases did not match');
          // set into cfg so saving can use it
          cfg['encrypt-pass'] = pass;
        } catch (e) {
          console.error('Encryption setup failed:', e.message);
          return { ok: false, reason: 'encrypt-missing-pass' };
        }
      }
      return { ok: true };
    }

    // validate/collect passphrase
    async function ensureValidPassphraseRetry() {
      if (!encrypt) return { ok: true };
      if (encryptPass) {
        const vr = validatePassphrase(encryptPass, { minLength: 8 });
        if (!vr.ok) return { ok: false, reason: 'invalid-cli-pass' };
        cfg['encrypt-pass'] = encryptPass;
        return { ok: true };
      }
      let attemptsLeft = 3;
      while (attemptsLeft > 0) {
        try {
          const p1 = await promptPassphrase('Enter passphrase (min 8 chars, letters+digits): ');
          const p2 = await promptPassphrase('Confirm passphrase: ');
          if (p1 !== p2) { attemptsLeft--; continue; }
          const v = validatePassphrase(p1, { minLength: 8 });
          if (!v.ok) { attemptsLeft--; continue; }
          cfg['encrypt-pass'] = p1;
          return { ok: true };
        } catch (err) { return { ok: false, reason: 'input-abort' }; }
      }
      return { ok: false, reason: 'attempts_exhausted' };
    }

    // run checks
    const p1 = await ensurePassphrase();
    if (!p1.ok) return { found: false, reason: p1.reason };
    const p2 = await ensureValidPassphraseRetry();
    if (!p2.ok) return { found: false, reason: p2.reason };

    // create cli-progress bar only when TTY and expected is finite
    let bar = null;
    const expected = expectedAttempts(left, right);
    if (process.stdout.isTTY && expected && Number.isFinite(expected)) {
      try {
        bar = new cliProgress.SingleBar({ format: 'Progress {bar} | {percentage}% | {value}/{total} | ETA: {eta_formatted}' }, cliProgress.Presets.shades_classic);
        // scale total to manageable number to avoid huge total values — map expected to 10000 steps
        const totalSteps = 10000;
        bar.start(totalSteps, 0, { eta_formatted: 'n/a' });
      } catch (e) { bar = null; }
    }

    return await new Promise((resolve) => {
      function cleanup() {
        activeWorkers.forEach(wk => wk.postMessage({ type: 'stop' }));
        activeWorkers.forEach(wk => wk.terminate());
        activeWorkers = [];
        try { if (bar) bar.stop(); } catch(e) {}
      }

      for (let i = 0; i < threads; i++) {
        const w = new Worker(workerPath);
        activeWorkers.push(w);
        w.on('message', (m) => {
          if (m.type === 'progress') {
            // m.delta and m.total
            workerAttempts[i] = m.total;
            const delta = m.delta || 0;
            globalAttempts += delta;
            const elapsed = (Date.now() - phaseStart) / 1000 || 1;
            const hashrate = Math.floor(globalAttempts / elapsed);
            const etaSeconds = (expected > 0) ? Math.floor((expected - globalAttempts) / Math.max(1, hashrate)) : null;
            // update cli-progress bar if available
            if (bar) {
              try {
                const totalSteps = 10000;
                const progress = Math.min(totalSteps, Math.floor((globalAttempts / expected) * totalSteps));
                bar.update(progress, { eta_formatted: formatDuration(etaSeconds) });
              } catch(e) {}
            }
            process.stdout.write(`\r${renderBar(globalAttempts, expected)} Attempts: ${globalAttempts} | hashrate: ${formatHashrate(hashrate)} | ETA: ${formatDuration(etaSeconds)} `);
          } else if (m.type === 'match' && !found) {
            found = true;
            console.log('\n--- MATCH FOUND ---');
            console.log('Address:', m.address);
            if (saveFile) {
              try {
                if (encrypt) {
                  const passphrase = cfg['encrypt-pass'];
                  if (!passphrase) throw new Error('Missing --encrypt-pass for encryption');
                  savePrivateKeyToFile(m.privateKey, saveFile, { encrypt: true, passphrase });
                  console.log(`Encrypted private key saved to ${saveFile}`);
                } else {
                  savePrivateKeyToFile(m.privateKey, saveFile, { encrypt: false });
                  console.log(`Private key saved (plaintext) to ${saveFile}`);
                }
              } catch (e) {
                console.error('Failed to save private key:', e.message);
              }
            }
            if (reveal) {
              console.log('Private key:', m.privateKey);
            } else if (!saveFile) {
              console.log('(Private key hidden. Use --reveal-private-key to display or --save-file to persist it.)');
            }
            cleanup();
            resolve({ found: true });
          } else if (m.type === 'done') {
            workerDoneCount++;
            if (workerDoneCount === threads && !found) {
              cleanup();
              resolve({ found: false, reason: m.reason });
            }
          }
        });
        w.on('error', (err) => {
          console.error('Worker error', err);
        });
        w.on('exit', (code) => {});
      }

      // start workers
      activeWorkers.forEach((w) => {
        w.postMessage({ type: 'start', pattern: cfg['similar-to'], fixedLeft: left, fixedRight: right, timeLimit: cfg['time-limit'], maxAttempts: cfg['max-attempts'], testNet: !!cfg['testnet'] });
      });
    });
  }
  // Phase loop with fallback (reduce right side)
  for (let right = initialRight; right >= 0; right--) {
    console.log(`\nPhase: trying left=${initialLeft} right=${right} (expected attempts: ${expectedAttempts(initialLeft, right)})`);
    const res = await runPhase(initialLeft, right);
    if (res && res.found) {
      return true;
    } else {
      console.log(`Phase finished for right=${right}. ${right > 0 ? 'Reducing right and retrying...' : 'No more fallback levels.'}`);
    }
  }

  console.log('\nNo match found within configured fallback limits. Consider reducing fixed constraints or increasing resources/time.');
  return false;
}

// promptPassphrase helper: hidden input
function promptPassphrase(promptText) {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(promptText);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    function onData(ch) {
      ch = String(ch);
      if (ch === '\r' || ch === '\n' || ch === '\u0004') {
        stdout.write('\n');
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        resolve(value);
        return;
      }
      if (ch === '\u0003') { // ctrl-c
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', onData);
        reject(new Error('Input aborted'));
        return;
      }
      // backspace handling
      if (ch === '\u0008' || ch === '\u007f') {
        if (value.length > 0) {
          value = value.slice(0, -1);
          // move cursor back, write space, move back
          stdout.write('\u001b[1D \u001b[1D');
        }
        return;
      }
      value += ch;
      stdout.write('*');
    }
    stdin.on('data', onData);
  });
}

module.exports = { startFixedEdges, promptPassphrase, formatHashrate, formatDuration }

if (argv.mode === 'fixed-edges') {
  startFixedEdges(argv).catch(err => console.error(err));
} else {
  askTestNet();
}