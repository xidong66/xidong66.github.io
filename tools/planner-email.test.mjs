import test from 'node:test';
import assert from 'node:assert/strict';
import { handleReminderRequest, reminderMail } from '../supabase/functions/planner-email-reminders/handler.mjs';

const token = 'a'.repeat(64);
const credentials = { username: 'sender@qq.com', password: 'secret-authorization-code' };
const job = { id: '123', anniversary_id: '456', title: '相识\r\n纪念日', recipient: 'account@example.com', event_date: '2026-10-17' };
const request = (body = { action: 'run' }, headers = { 'x-planner-mail-token': token }) => new Request('https://example.com', { method: 'POST', headers, body: JSON.stringify(body) });
function mock({ authorized = true, jobs = [job], due = true, sendError, finishError, creds = credentials } = {}) {
  const calls = [], sent = [];
  return { calls, sent, deps: {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === 'planner_mail_authorize') return authorized;
      if (name === 'planner_mail_credentials') return creds;
      if (name === 'planner_mail_claim') return jobs;
      if (name === 'planner_mail_still_due') return due;
      if (name === 'planner_mail_finish' && finishError) throw finishError;
    },
    sendMail: async (_creds, mail) => { if (sendError) throw sendError; sent.push(mail); },
  } };
}
test('authorization precedes all secret reads; rejects bad methods and tokens', async () => {
  const m = mock();
  assert.equal((await handleReminderRequest(new Request('https://example.com'), m.deps)).status, 405);
  assert.equal((await handleReminderRequest(request({}, {}), m.deps)).status, 401);
  assert.equal(m.calls.length, 0);
  const denied = mock({ authorized: false });
  assert.equal((await handleReminderRequest(request(), denied.deps)).status, 401);
  assert.deepEqual(denied.calls.map((c) => c.name), ['planner_mail_authorize']);
});
test('run uses claimed account recipient, ignores caller recipient, records acceptance', async () => {
  const m = mock();
  const response = await handleReminderRequest(request({ action: 'run', to: 'attacker@example.com', now: '2030-01-01' }), m.deps);
  const result = await response.json();
  assert.deepEqual(result, { sent: 1, failed: 0, skipped: 0 });
  assert.equal(m.sent[0].to, job.recipient);
  assert.equal(m.calls.find((c) => c.name === 'planner_mail_claim').args, undefined);
  assert.deepEqual(m.calls.at(-1).args, { p_id: '123', p_status: 'sent' });
  assert(!m.sent[0].subject.includes('\n'));
  assert(!JSON.stringify(result).includes(credentials.password));
});
test('unconfigured SMTP makes no claims; rejects secrets with newline', async () => {
  for (const creds of [{}, { ...credentials, password: 'bad\ncode' }, { ...credentials, username: 'bad\n@qq.com' }]) {
    const m = mock({ creds });
    assert.equal((await handleReminderRequest(request(), m.deps)).status, 503);
    assert(!m.calls.some((c) => c.name === 'planner_mail_claim')); assert.equal(m.sent.length, 0);
  }
});
test('test sends only to QQ sender itself and enables only after SMTP acceptance', async () => {
  const m = mock();
  assert.equal((await handleReminderRequest(request({ action: 'test', to: 'other@example.com' }), m.deps)).status, 200);
  assert.equal(m.sent[0].to, credentials.username);
  assert.deepEqual(m.calls.at(-1), { name: 'planner_mail_test_result', args: { p_ok: true } });
  const failed = mock({ sendError: { code: 'EAUTH', message: credentials.password } });
  const response = await handleReminderRequest(request({ action: 'test' }), failed.deps);
  assert.equal(response.status, 502); assert(!(await response.text()).includes(credentials.password));
  assert.deepEqual(failed.calls.at(-1).args, { p_ok: false, p_error: 'EAUTH' });
});
test('opt-out or edits after claim prevent send', async () => {
  const m = mock({ due: false });
  assert.deepEqual(await (await handleReminderRequest(request(), m.deps)).json(), { sent: 0, failed: 0, skipped: 1 });
  assert.equal(m.sent.length, 0);
});
test('ambiguous SMTP failures are marked unknown and never retried within the invocation', async () => {
  const m = mock({ sendError: { code: 'ETIMEDOUT', message: credentials.password } });
  const response = await handleReminderRequest(request(), m.deps);
  assert.equal(response.status, 200);
  assert.equal(m.calls.at(-1).args.p_status, 'unknown');
  assert(!(await response.text()).includes(credentials.password));
});
test('failed DB acknowledgement after accepted mail does not send twice', async () => {
  const m = mock({ finishError: new Error('DB failed') });
  assert.equal((await handleReminderRequest(request(), m.deps)).status, 503);
  assert.equal(m.sent.length, 1);
});
test('plain-text reminder contains expected date and fixed website link', () => {
  assert(reminderMail(job).text.includes('2026-10-17'));
  assert(reminderMail(job).text.includes('https://wuxidong.com/planner/'));
  assert.equal(reminderMail(job).messageId, '<planner-123@wuxidong.com>');
});
