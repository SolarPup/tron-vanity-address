const { expect } = require('chai');
const { startFixedEdges } = require('../index');

describe('testnet flag', function() {
  it('accepts testnet flag and completes phases without crash', async function() {
    this.timeout(10000);
    const res = await startFixedEdges({ 'similar-to': 'TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ', mode: 'fixed-edges', 'fixed-left': 0, 'fixed-right': 0, threads: 1, 'time-limit': 1, 'max-attempts': 1, testnet: true });
    expect(res).to.be.false;
  });
});
