const fs = require('fs');
const crypto = require('crypto');

function encryptPrivateKey(privateKeyHex, passphrase) {
  // Derive key via scrypt (salted)
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(privateKeyHex, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    version: 1,
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decryptPrivateKey(encryptedObj, passphrase) {
  const salt = Buffer.from(encryptedObj.salt, 'base64');
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = Buffer.from(encryptedObj.iv, 'base64');
  const tag = Buffer.from(encryptedObj.tag, 'base64');
  const ciphertext = Buffer.from(encryptedObj.ciphertext, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

function savePrivateKeyToFile(privateKeyHex, filePath, options = {}) {
  // options.encrypt (bool), options.passphrase (string)
  if (options.encrypt) {
    if (!options.passphrase) throw new Error('Passphrase required for encryption');
    const obj = encryptPrivateKey(privateKeyHex, options.passphrase);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), { encoding: 'utf8', mode: 0o600 });
    return { encrypted: true, file: filePath };
  } else {
    fs.writeFileSync(filePath, privateKeyHex + '\n', { encoding: 'utf8', mode: 0o600 });
    return { encrypted: false, file: filePath };
  }
}

module.exports = { encryptPrivateKey, decryptPrivateKey, savePrivateKeyToFile };
