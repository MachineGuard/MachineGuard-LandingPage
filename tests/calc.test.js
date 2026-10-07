const test = require('node:test');
const assert = require('node:assert/strict');
const { validate, estimate } = require('../assets/js/calc.js');

test('validate accepts a positive value and a rate within range', () => {
  assert.deepEqual(validate('50000', '10'), {});
});

test('validate reports required fields when empty', () => {
  assert.deepEqual(validate('', ''), { value: 'required', rate: 'required' });
});

test('validate rejects zero and negative inventory values', () => {
  assert.equal(validate('0', '10').value, 'positive');
  assert.equal(validate('-5', '10').value, 'positive');
});

test('validate rejects rates outside 0.1%-100% and accepts the limits', () => {
  assert.equal(validate('100', '0.05').rate, 'range');
  assert.equal(validate('100', '150').rate, 'range');
  assert.deepEqual(validate('100', '0.1'), {});
  assert.deepEqual(validate('100', '100'), {});
});

test('estimate: 50000 at 10% loss with 20% reduction avoids 1000 per month', () => {
  const r = estimate(50000, 10, 20);
  assert.equal(r.loss, 5000);
  assert.equal(r.avoided, 1000);
  assert.equal(r.annual, 12000);
  assert.equal(r.reductionPct, 20);
});

test('estimate scales with the chosen reduction', () => {
  assert.equal(estimate(50000, 10, 40).avoided, 2000);
});

test('estimate clamps the reduction to the 5%-50% assumption range', () => {
  assert.equal(estimate(10000, 10, 0).reductionPct, 5);
  assert.equal(estimate(10000, 10, 90).reductionPct, 50);
});
