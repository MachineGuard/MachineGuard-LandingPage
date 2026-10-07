(function (root) {
  'use strict';

  var MIN_RATE = 0.1;
  var MAX_RATE = 100;
  var MIN_REDUCTION = 5;
  var MAX_REDUCTION = 50;

  function validate(value, rate) {
    var errors = {};
    if (value === '' || value === null || value === undefined) errors.value = 'required';
    else if (!(Number(value) > 0)) errors.value = 'positive';
    if (rate === '' || rate === null || rate === undefined) errors.rate = 'required';
    else if (!(Number(rate) >= MIN_RATE && Number(rate) <= MAX_RATE)) errors.rate = 'range';
    return errors;
  }

  function estimate(value, rate, reductionPct) {
    var pct = Math.min(MAX_REDUCTION, Math.max(MIN_REDUCTION, Number(reductionPct)));
    var loss = Number(value) * (Number(rate) / 100);
    var avoided = loss * (pct / 100);
    return { loss: loss, avoided: avoided, annual: avoided * 12, reductionPct: pct };
  }

  var api = { validate: validate, estimate: estimate, MIN_RATE: MIN_RATE, MAX_RATE: MAX_RATE, MIN_REDUCTION: MIN_REDUCTION, MAX_REDUCTION: MAX_REDUCTION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MG_CALC = api;
})(typeof window !== 'undefined' ? window : globalThis);
