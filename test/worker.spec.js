const { expect } = require('chai');
const { Worker } = require('worker_threads');
const path = require('path');

// This test ensures worker can start and respect timeLimit with no crash
describe('worker basic', function() {
  it('worker should finish with timeLimit without crash', function(done) {
    this.timeout(5000);
    const workerPath = path.resolve(__dirname, '..', 'workers', 'worker.js');
    const w = new Worker(workerPath);
    let finished = false;
    w.on('message', (m) => {
      if (m.type === 'done') {
        finished = true;
        w.terminate();
        done();
      }
    });
    w.on('error', (err) => done(err));
    w.postMessage({ type: 'start', pattern: 'TYAavN2xCDro5Gdip8UU6W9oQmM43rNxzQ', fixedLeft: 1, fixedRight: 1, timeLimit: 1, maxAttempts: 1000 });
  });
});
