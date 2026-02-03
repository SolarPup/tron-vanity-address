const elliptic = require('elliptic');
const keccak256 = require('js-sha3').keccak256;
const CryptoJS = require('crypto-js');
const base58 = require('base-58');
const crypto = require('crypto');
const ec = new elliptic.ec('secp256k1');

function hexChar2byte(c) {
  if (c >= 'A' && c <= 'F') return c.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
  if (c >= 'a' && c <= 'f') return c.charCodeAt(0) - 'a'.charCodeAt(0) + 10;
  return c.charCodeAt(0) - '0'.charCodeAt(0);
}

function isHexChar(c) {
  return ((c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f') || (c >= '0' && c <= '9'));
}

function byte2hexStr(byte) {
  var hexByteMap = "0123456789ABCDEF";
  var str = "";
  str += hexByteMap.charAt(byte >> 4);
  str += hexByteMap.charAt(byte & 0x0f);
  return str;
}

function byteArray2hexStr(byteArray) {
  var str = "";
  for (var i = 0; i < (byteArray.length - 1); i++) {
    str += byte2hexStr(byteArray[i]);
  }
  str += byte2hexStr(byteArray[i]);
  return str;
}

function hexStr2byteArray(str) {
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

function deriveAddress(privateKeyHex, testNet = false) {
  const keyPair = ec.keyFromPrivate(privateKeyHex, 'hex');
  let publicBytes = keyPair.getPublic('bytes');
  if (publicBytes.length === 65) publicBytes = publicBytes.slice(1);
  const sha3 = keccak256(publicBytes).toString();
  let addressHex = (testNet) ? 'a0' : 'b0';
  addressHex += sha3.substring(24);
  let hash0 = CryptoJS.SHA256(hexStr2byteArray(addressHex)).toString();
  let hash1 = CryptoJS.SHA256(hexStr2byteArray(hash0)).toString();
  let checkSum = hash1.slice(0,8);
  let addressCheckSum = addressHex + checkSum;
  let addressBase58 = base58.encode(hexStr2byteArray(addressCheckSum));
  return {
    privateKey: privateKeyHex.padStart(64, '0'),
    address: addressBase58
  };
}

function generateKeypair(options = {}) {
  // options.seed: optional deterministic seed (string) for tests
  let privateKeyHex;
  if (options.seed) {
    // deterministic: derive 32 bytes from seed using sha256
    const seedHash = crypto.createHash('sha256').update(options.seed).digest('hex');
    privateKeyHex = seedHash;
  } else if (options.rng && typeof options.rng === 'function') {
    privateKeyHex = options.rng(32).toString('hex');
  } else {
    privateKeyHex = crypto.randomBytes(32).toString('hex');
  }
  return deriveAddress(privateKeyHex, options.testNet || false);
}

module.exports = {
  deriveAddress,
  generateKeypair
};
