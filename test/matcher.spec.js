const { expect } = require('chai');
const { matchesFixedEdges, expectedAttempts } = require('../lib/matcher');

describe('matcher module', () => {
  it('matchesFixedEdges should match left and right parts', () => {
    const target = 'TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ';
    const candidate = 'TYAavN2xXXXXXXXXXXXXXXW9oQmM43rNxzQ';
    expect(matchesFixedEdges(candidate, target, 7, 6)).to.equal(true);
  });

  it('expectedAttempts should compute roughly 58^(left+right)', () => {
    const e = expectedAttempts(7,6);
    expect(e).to.be.a('number');
    expect(e).to.equal(Math.pow(58,13));
  });
});
