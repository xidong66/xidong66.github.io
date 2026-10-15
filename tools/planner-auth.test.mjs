import test from 'node:test';
import assert from 'node:assert/strict';
import { loginErrorMessage, authFetchWithTimeout, checkLoginConnection } from '../js/planner-auth.mjs';

const config = { url: 'https://example.supabase.co', publishableKey: 'sb_publishable_test' };
test('login distinguishes credentials, confirmation, rate limits, service errors and network failures', () => {
  assert.match(loginErrorMessage({ code: 'invalid_credentials', status: 400 }), /邮箱或密码/);
  assert.match(loginErrorMessage({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 }), /邮箱或密码/);
  assert.match(loginErrorMessage({ name: 'AuthApiError', message: 'Email not confirmed', status: 400 }), /尚未确认/);
  assert.match(loginErrorMessage({ code: 'email_not_confirmed' }), /尚未确认/);
  assert.match(loginErrorMessage({ status: 429 }), /太频繁/);
  assert.match(loginErrorMessage({ name: 'AuthRetryableFetchError', status: 503 }), /服务暂时异常/);
  assert.match(loginErrorMessage({ name: 'AuthRetryableFetchError', status: 0 }), /未能连接登录服务/);
  assert.match(loginErrorMessage({ message: 'TypeError: Load failed' }), /未能连接登录服务/);
  assert.match(loginErrorMessage({ name: 'TimeoutError' }), /超时/);
  assert.match(loginErrorMessage({}, false), /离线/);
  assert.match(loginErrorMessage({ name: 'SecurityError' }), /浏览器限制/);
});
test('login failure never uses task-save wording or includes raw secret-bearing errors', () => {
  const message = loginErrorMessage({ message: 'password=secret refresh_token=hidden', code: '<unsafe>' });
  assert.doesNotMatch(message, /secret|hidden|unsafe|修改未保存/);
  assert.match(message, /unknown_error/);
});
test('connection probe uses GET and only the public key, without credentials', async () => {
  let called = 0;
  const result = await checkLoginConnection(config, { fetchImpl: async (url, options) => {
    called++;
    assert.equal(url, 'https://example.supabase.co/auth/v1/settings');
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(options.headers, { apikey: config.publishableKey });
    assert.equal(options.cache, 'no-store');
    return new Response(JSON.stringify({ external: { email: true } }));
  } });
  assert.equal(called, 1); assert.equal(result.state, 'ok'); assert.match(result.message, /可以连接/);
});
test('connection probe distinguishes service denial, rate limits, disabled email and invalid responses', async () => {
  for (const status of [401, 403, 429, 503]) {
    const result = await checkLoginConnection(config, { fetchImpl: async () => new Response('{}', { status }) });
    assert.equal(result.state, 'error'); assert.match(result.message, new RegExp(`HTTP ${status}`));
  }
  const disabled = await checkLoginConnection(config, { fetchImpl: async () => new Response('{"external":{"email":false}}') });
  assert.match(disabled.message, /邮箱登录尚未启用/);
  for (const body of ['<html>intercepted</html>', '{}']) {
    const result = await checkLoginConnection(config, { fetchImpl: async () => new Response(body) });
    assert.equal(result.state, 'error'); assert.match(result.message, /不符合预期/);
  }
});
test('failed connection probes report uncertainty rather than a geographic diagnosis', async () => {
  const result = await checkLoginConnection(config, { fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  assert.equal(result.state, 'error'); assert.match(result.message, /可能/); assert.doesNotMatch(result.message, /中国|封锁|密码错误/);
});
test('authentication deadline aborts hanging requests and restores caller control', async () => {
  let signal;
  const hanging = async (_url, options) => {
    signal = options.signal;
    return new Promise((_resolve, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    });
  };
  const result = await checkLoginConnection(config, { fetchImpl: hanging, timeoutMs: 15 });
  assert.equal(signal.aborted, true); assert.equal(result.state, 'error'); assert.match(result.message, /超时/);
});
test('authentication deadline includes a response body that stalls after headers', async () => {
  const fetchImpl = async (_url, { signal }) => ({
    status: 200, headers: new Headers(), statusText: 'OK',
    arrayBuffer: () => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })),
  });
  await assert.rejects(authFetchWithTimeout(config.url, {}, 15, fetchImpl), { name: 'TimeoutError' });
});
test('upstream cancellation and normal response bodies remain supported', async () => {
  const controller = new AbortController(); controller.abort(new DOMException('cancel', 'AbortError'));
  await assert.rejects(authFetchWithTimeout(config.url, { signal: controller.signal }, 100, async (_url, { signal }) => {
    if (signal.aborted) throw signal.reason;
    return new Response('{}');
  }), { name: 'AbortError' });
  const response = await authFetchWithTimeout(config.url, {}, 100, async () => new Response('{"ok":true}', { status: 200 }));
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { ok: true });
});
