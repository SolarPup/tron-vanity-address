function matchesFixedEdges(address, target, leftN, rightM) {
  if (!address || !target) return false;
  if (leftN + rightM > target.length) return false;
  const leftMatch = (leftN === 0) ? true : (address.substring(0, leftN) === target.substring(0, leftN));
  const rightMatch = (rightM === 0) ? true : (address.substring(address.length - rightM) === target.substring(target.length - rightM));
  return leftMatch && rightMatch;
}

function expectedAttempts(leftN, rightM) {
  return Math.pow(58, leftN + rightM);
}

module.exports = { matchesFixedEdges, expectedAttempts };
