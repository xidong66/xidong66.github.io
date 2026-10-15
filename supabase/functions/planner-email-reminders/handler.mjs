// No credentials or personal data in responses/logs. SMTP has no idempotency API:
// claimed deliveries are never automatically resent, including ambiguous failures.
export function reminderMail(job) {
  const title = job.title.replace(/[\r\n]+/g, ' ');
  return {
    to: job.recipient,
    subject: `明天是「${title}」｜纪念日提醒`,
    text: `明天（${job.event_date}）是「${title}」。\n\n这是你设置的提前 1 天提醒。\n查看日程：https://wuxidong.com/planner/\n\n不再需要提醒时，可在纪念日编辑窗口关闭“邮件提醒”。`,
    messageId: `<planner-${job.id}@wuxidong.com>`,
  };
}
const safeError = (error) => ['EAUTH','ETIMEDOUT','ECONNECTION','ESOCKET','EENVELOPE','EMESSAGE'].includes(error?.code) ? error.code : 'SEND_ERROR';
const validCredentials = (value) => value && typeof value.username === 'string'
  && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(qq\.com|foxmail\.com)$/i.test(value.username)
  && typeof value.password === 'string' && value.password.trim().length > 0 && !/[\r\n]/.test(value.password);

export async function handleReminderRequest(request, { rpc, sendMail }) {
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'POST' } });
  const token = request.headers.get('x-planner-mail-token');
  if (!token || token.length < 32) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (await rpc('planner_mail_authorize', { p_token: token }) !== true) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    let body;
    try { body = await request.json(); } catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
    if (!body || !['run', 'test'].includes(body.action)) return Response.json({ error: 'Invalid action' }, { status: 400 });
    const credentials = await rpc('planner_mail_credentials');
    if (!validCredentials(credentials)) return Response.json({ error: 'QQ SMTP is not configured' }, { status: 503 });
    if (body.action === 'test') {
      try {
        await sendMail(credentials, {
          to: credentials.username, subject: '纪念日邮件提醒 · 配置测试',
          text: 'QQ 邮箱发件测试成功。\n提醒规则：提前 1 天，早上 9 点（UTC+8），发至各账号自己的登录邮箱。\n请在网站的纪念日编辑窗口勾选“邮件提醒”。',
        });
        await rpc('planner_mail_test_result', { p_ok: true });
        return Response.json({ test: 'accepted', enabled: true });
      } catch (error) {
        await rpc('planner_mail_test_result', { p_ok: false, p_error: safeError(error) });
        return Response.json({ test: 'failed', code: safeError(error) }, { status: 502 });
      }
    }
    const jobs = await rpc('planner_mail_claim');
    const counts = { sent: 0, failed: 0, skipped: 0 };
    for (const job of jobs) {
      if (await rpc('planner_mail_still_due', { p_id: job.id }) !== true) {
        await rpc('planner_mail_finish', { p_id: job.id, p_status: 'failed', p_error: 'CANCELLED' });
        counts.skipped++; continue;
      }
      try {
        await sendMail(credentials, reminderMail(job));
      } catch (error) {
        const code = safeError(error);
        await rpc('planner_mail_finish', { p_id: job.id, p_status: ['ETIMEDOUT','ESOCKET','SEND_ERROR'].includes(code) ? 'unknown' : 'failed', p_error: code });
        counts.failed++; continue;
      }
      // A DB acknowledgement failure must never trigger another SMTP send.
      await rpc('planner_mail_finish', { p_id: job.id, p_status: 'sent' });
      counts.sent++;
    }
    return Response.json(counts);
  } catch {
    return Response.json({ error: 'Reminder processing failed; inspect delivery status before retrying' }, { status: 503 });
  }
}
