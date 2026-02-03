const { parentPort, workerData } = require('worker_threads');
const { generateKeypair } = require('../lib/address');
const { matchesFixedEdges } = require('../lib/matcher');

let attempts = 0;
let lastReport = Date.now();
let running = true;

parentPort.on('message', (msg) => {
  if (msg && msg.type === 'start') {
    run(msg);
  } else if (msg && msg.type === 'stop') {
    running = false;
  }
});

function run(config) {
  const target = config.pattern;
  const left = config.fixedLeft || 7;
  const right = config.fixedRight || 6;
  const timeLimit = config.timeLimit || 60; // seconds
  const maxAttempts = config.maxAttempts || Number.MAX_SAFE_INTEGER;
  const testNet = !!config.testNet;
  const startTime = Date.now();
  const reportIntervalMs = 2000;
  let lastReportedAttemptsLocal = 0;

  while (running) {
    attempts++;
    const kp = generateKeypair({ seed: undefined, testNet });
    if (matchesFixedEdges(kp.address, target, left, right)) {
      parentPort.postMessage({ type: 'match', address: kp.address, privateKey: kp.privateKey, attempts });
      running = false;
      break;
    }

    const now = Date.now();
    if (now - lastReport > reportIntervalMs) {
      const delta = attempts - lastReportedAttemptsLocal;
      parentPort.postMessage({ type: 'progress', total: attempts, delta });
      lastReportedAttemptsLocal = attempts;
      lastReport = now;
    }

    if ((now - startTime) / 1000 > timeLimit) {
      parentPort.postMessage({ type: 'done', reason: 'timeLimit', attempts });
      running = false;
      break;
    }

    if (attempts >= maxAttempts) {
      parentPort.postMessage({ type: 'done', reason: 'maxAttempts', attempts });
      running = false;
      break;
    }
  }
}
