const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { savePrivateKeyToFile, encryptPrivateKey, decryptPrivateKey } = require('../lib/io');

describe('io module', () => {
  const tmp = path.resolve(__dirname, 'tmp_priv_test.txt');
  afterEach(() => { try { fs.unlinkSync(tmp); } catch(e){} });

  it('should save plaintext private key to file', () => {
    const res = savePrivateKeyToFile('abcd1234', tmp, { encrypt: false });
    expect(res.encrypted).to.equal(false);
    const content = fs.readFileSync(tmp, 'utf8').trim();
    expect(content).to.equal('abcd1234');
  });

  it('should save encrypted private key and be decryptable', () => {
    const pass = 'test-pass';
    const res = savePrivateKeyToFile('abcd5678', tmp, { encrypt: true, passphrase: pass });
    expect(res.encrypted).to.equal(true);
    const raw = fs.readFileSync(tmp, 'utf8');
    const obj = JSON.parse(raw);
    const dec = decryptPrivateKey(obj, pass);
    expect(dec).to.equal('abcd5678');
  });
});
