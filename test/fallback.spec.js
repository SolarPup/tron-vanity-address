const { expect } = require('chai');
const { startFixedEdges } = require('../index');

describe('fallback behavior', function() {
  it('should complete phases and return false when no match found (small limits)', async function() {
    this.timeout(10000);
    const res = await startFixedEdges({ 'similar-to': 'TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ', mode: 'fixed-edges', 'fixed-left': 1, 'fixed-right': 1, threads: 1, 'time-limit': 1, 'max-attempts': 10 });
    expect(res).to.be.false;
  });
});
