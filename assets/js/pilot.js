(function (root) {
  'use strict';

  var DEFAULT_PATH = '/api/v1/pilot-requests';
  var TIMEOUT_MS = 15000;

  // Full intake URL, or '' when apiBaseUrl is empty. Empty means nothing is sent.
  function endpoint(config) {
    var base = config && typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim().replace(/\/+$/, '') : '';
    if (!base) return '';
    return base + ((config && config.pilotRequestPath) || DEFAULT_PATH);
  }

  function retryAfter(res) {
    var raw = res.headers && typeof res.headers.get === 'function' ? res.headers.get('Retry-After') : null;
    var seconds = parseInt(raw, 10);
    return isNaN(seconds) ? null : seconds;
  }

  // Core contract: 202 = accepted (PENDING), 400 = invalid payload, 429 = rate limited.
  // Anything else, including network failures, is a generic error. Only 202 is success.
  function classify(res) {
    if (res.status === 202) return { ok: true };
    if (res.status === 400) return { ok: false, reason: 'invalid' };
    if (res.status === 429) return { ok: false, reason: 'throttled', retryAfter: retryAfter(res) };
    return { ok: false, reason: 'error', status: res.status };
  }

  // Resolves with { ok: true } or { ok: false, reason: 'invalid' | 'throttled' | 'error' }. Never rejects.
  function send(config, payload, lang, fetchImpl) {
    var url = endpoint(config);
    if (!url) {
      // With empty apiBaseUrl the form keeps the previous demo behaviour and does not send data.
      console.info('[MachineGuard] Demo mode: apiBaseUrl is empty, pilot request not sent.', payload);
      return new Promise(function (r) { setTimeout(r, 500); }).then(function () { return { ok: true }; });
    }
    var doFetch = fetchImpl || (typeof fetch === 'function' ? fetch : null);
    if (!doFetch) return Promise.resolve({ ok: false, reason: 'error' });

    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, TIMEOUT_MS) : null;
    var init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Language': lang || 'en' },
      body: JSON.stringify(payload)
    };
    if (controller) init.signal = controller.signal;

    return Promise.resolve()
      .then(function () { return doFetch(url, init); })
      .then(classify, function () { return { ok: false, reason: 'error' }; })
      .then(function (result) { if (timer) clearTimeout(timer); return result; });
  }

  var api = { endpoint: endpoint, send: send, TIMEOUT_MS: TIMEOUT_MS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MG_PILOT = api;
})(typeof window !== 'undefined' ? window : globalThis);
