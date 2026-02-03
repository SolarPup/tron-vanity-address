const { expect } = require('chai');
const { deriveAddress, generateKeypair } = require('../lib/address');

describe('address module', () => {
  it('deriveAddress should return address and privateKey of expected format', () => {
    const kp = generateKeypair({ seed: 'test-seed-1' });
    expect(kp).to.have.property('privateKey');
    expect(kp).to.have.property('address');
    expect(kp.privateKey).to.be.a('string').with.lengthOf(64);
    expect(kp.address).to.be.a('string').that.match(/^[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it('generateKeypair with same seed is deterministic', () => {
    const a = generateKeypair({ seed: 'same-seed' });
    const b = generateKeypair({ seed: 'same-seed' });
    expect(a.privateKey).to.equal(b.privateKey);
    expect(a.address).to.equal(b.address);
  });
});
