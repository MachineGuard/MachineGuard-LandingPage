const test = require('node:test');
const assert = require('node:assert/strict');
const { send, endpoint } = require('../assets/js/pilot.js');

const CONFIG = { apiBaseUrl: 'https://core.example.test/', pilotRequestPath: '/api/v1/pilot-requests' };
const PAYLOAD = {
  companyName: 'Acme SAC',
  contactName: 'Ana Perez',
  contactEmail: 'ana@acme.test',
  contactPhone: '+51 999 999 999',
  industry: 'FOOD',
  estimatedMonthlyLoss: 1500.5
};

function recordingFetch(respond) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { calls, fetchImpl };
}

test('endpoint joins apiBaseUrl without a trailing slash and the pilot path', () => {
  assert.equal(endpoint(CONFIG), 'https://core.example.test/api/v1/pilot-requests');
  assert.equal(endpoint({ apiBaseUrl: 'http://127.0.0.1:18090' }), 'http://127.0.0.1:18090/api/v1/pilot-requests');
});

test('empty or blank apiBaseUrl has no endpoint', () => {
  assert.equal(endpoint({ apiBaseUrl: '' }), '');
  assert.equal(endpoint({ apiBaseUrl: '   ' }), '');
  assert.equal(endpoint(undefined), '');
});

test('202 from the Core is the only success and sends the Landing payload as JSON', async () => {
  const { calls, fetchImpl } = recordingFetch(() => new Response(JSON.stringify({ id: 'x', status: 'PENDING' }), { status: 202 }));
  const result = await send(CONFIG, PAYLOAD, 'es', fetchImpl);

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://core.example.test/api/v1/pilot-requests');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].init.headers['Accept-Language'], 'es');
  assert.deepEqual(JSON.parse(calls[0].init.body), PAYLOAD);
});

test('400 is reported as invalid, not as success', async () => {
  const { fetchImpl } = recordingFetch(() => new Response(JSON.stringify({ status: 400, error: 'Bad Request', message: 'contactEmail invalid' }), { status: 400 }));
  assert.deepEqual(await send(CONFIG, PAYLOAD, 'en', fetchImpl), { ok: false, reason: 'invalid' });
});

test('429 is reported as throttled and keeps Retry-After', async () => {
  const { fetchImpl } = recordingFetch(() => new Response('{}', { status: 429, headers: { 'Retry-After': '120' } }));
  assert.deepEqual(await send(CONFIG, PAYLOAD, 'en', fetchImpl), { ok: false, reason: 'throttled', retryAfter: 120 });
});

test('network failure is a generic error', async () => {
  const { fetchImpl } = recordingFetch(() => { throw new TypeError('Failed to fetch'); });
  assert.deepEqual(await send(CONFIG, PAYLOAD, 'en', fetchImpl), { ok: false, reason: 'error' });
});

test('5xx is a generic error and never success', async () => {
  const { fetchImpl } = recordingFetch(() => new Response('oops', { status: 500 }));
  assert.deepEqual(await send(CONFIG, PAYLOAD, 'en', fetchImpl), { ok: false, reason: 'error', status: 500 });
});

test('empty apiBaseUrl keeps the previous demo behaviour: no request, console note, success after the demo delay', async () => {
  const { calls, fetchImpl } = recordingFetch(() => new Response(null, { status: 202 }));
  const infos = [];
  const originalInfo = console.info;
  console.info = (...args) => infos.push(args);
  let result;
  let elapsed;
  try {
    const started = Date.now();
    result = await send({ apiBaseUrl: '   ' }, PAYLOAD, 'en', fetchImpl);
    elapsed = Date.now() - started;
  } finally {
    console.info = originalInfo;
  }

  assert.deepEqual(result, { ok: true });
  assert.ok(elapsed >= 400, `demo delay expected, got ${elapsed} ms`);
  assert.equal(calls.length, 0);
  assert.equal(infos.length, 1);
  assert.equal(infos[0][0], '[MachineGuard] Demo mode: apiBaseUrl is empty, pilot request not sent.');
  assert.deepEqual(infos[0][1], PAYLOAD);
});
