// Login diagnostics never send the form's email, password or session token.
export function loginErrorMessage(error, online = true) {
  // Some Auth responses omit structured codes (or the API-version header).
  // Recognize only these exact legacy messages; never print arbitrary payloads.
  const legacyCodes = { 'invalid login credentials': 'invalid_credentials', 'email not confirmed': 'email_not_confirmed' };
  const code = error?.code || legacyCodes[(error?.message || '').trim().toLowerCase()];
  if (code === 'invalid_credentials') return '邮箱或密码不正确，请核对账号后重试。';
  if (code === 'email_not_confirmed') return '账号邮箱尚未确认，请联系站主确认该账号。';
  if (code === 'user_banned') return '该账号暂时无法登录，请联系站主检查账号状态。';
  if (code === 'email_provider_disabled' || code === 'provider_disabled') return '邮箱登录尚未启用，请联系站主检查登录设置。';
  if (error?.status === 429 || code === 'over_request_rate_limit') return '登录尝试太频繁，请稍后再试。';
  if (!online) return '当前设备处于离线状态，请联网后重新登录。';
  if (error?.name === 'SecurityError' || error?.name === 'QuotaExceededError') return '浏览器限制了登录状态的保存，请用 Safari、Chrome 或 Edge 打开后重试。';
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError' || code === 'request_timeout' || /timeout|timed out/i.test(error?.message || '')) return '连接登录服务超时。请点击下方“检测连接”，或切换网络后重试。';
  if (error?.status >= 500) return `登录服务暂时异常（HTTP ${error.status}），请稍后重试。`;
  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0 || /failed to fetch|load failed|networkerror|network request failed/i.test(error?.message || '')) return '当前浏览器未能连接登录服务。请点击下方“检测连接”，或在系统浏览器中打开后重试。';
  if (error?.status === 401 || error?.status === 403) return `登录请求被服务拒绝（HTTP ${error.status}），请检测连接并联系站主。`;
  const detail = /^[a-z0-9_]{1,64}$/i.test(code || '') ? code : 'unknown_error';
  return `登录未成功（${detail}）。请点击下方“检测连接”，并将提示告知站主。`;
}

// Keep an upper bound on authentication requests, including response bodies.
// Return a buffered Response so callers can still use the normal fetch API.
export async function authFetchWithTimeout(input, options = {}, timeoutMs = 15000, fetchImpl = globalThis.fetch) {
  const controller = new AbortController();
  const upstream = options.signal || (typeof Request !== 'undefined' && input instanceof Request ? input.signal : null);
  const onAbort = () => controller.abort(upstream.reason);
  if (upstream?.aborted) onAbort();
  else upstream?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Authentication request timed out', 'TimeoutError')), timeoutMs);
  try {
    const response = await fetchImpl(input, { ...options, signal: controller.signal });
    const body = await response.arrayBuffer();
    return new Response([204, 205, 304].includes(response.status) ? null : body, {
      status: response.status, statusText: response.statusText, headers: response.headers,
    });
  } finally {
    clearTimeout(timer);
    upstream?.removeEventListener('abort', onAbort);
  }
}

export async function checkLoginConnection(config, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const started = performance.now();
  try {
    const response = await authFetchWithTimeout(`${config.url}/auth/v1/settings`, {
      method: 'GET', headers: { apikey: config.publishableKey }, cache: 'no-store',
    }, timeoutMs, fetchImpl);
    if (!response.ok) {
      const message = response.status === 429 ? '登录服务已响应，但当前请求受限，请稍后重试。'
        : [401, 403].includes(response.status) ? '登录服务已响应，但连接配置被拒绝，请联系站主。'
          : '登录服务已响应，但暂时出现异常，请稍后重试。';
      return { state: 'error', message: `${message}（HTTP ${response.status}）` };
    }
    let settings;
    try { settings = await response.json(); }
    catch { return { state: 'error', message: '服务返回的内容不符合预期，请换一个浏览器或网络后重试。' }; }
    if (typeof settings?.external?.email !== 'boolean') return { state: 'error', message: '服务返回的内容不符合预期，请换一个浏览器或网络后重试。' };
    if (!settings.external.email) return { state: 'error', message: '登录服务可以连接，但邮箱登录尚未启用，请联系站主。' };
    return { state: 'ok', message: `登录服务可以连接（约 ${Math.round(performance.now() - started)} 毫秒）。若仍无法登录，请查看上方的登录报错。` };
  } catch (error) {
    const timeout = ['AbortError', 'TimeoutError'].includes(error?.name);
    return { state: 'error', message: timeout
      ? '连接登录服务超时。请用 Safari、Chrome 或 Edge 打开，或切换手机流量后再次检测。'
      : '当前浏览器无法连接登录服务，可能与网络、DNS 或浏览器限制有关。请在系统浏览器中打开，或切换网络后再次检测。' };
  }
}
