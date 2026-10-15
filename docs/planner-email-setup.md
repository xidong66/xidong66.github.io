# QQ 邮箱纪念日提醒

规则固定为 **提前 1 天早上 9 点（UTC+8，北京／新加坡时间）**，发至纪念日所属账号的登录邮箱。每条纪念日需自行勾选“邮件提醒”，已有记录默认关闭。关闭浏览器或电脑仍可发送。

生日等每年重复的倒计时，以及正计时的相识等纪念日，按每年的同月同日提醒。单次倒计时只提醒其目标日期。2 月 29 日在非闰年按 2 月 28 日计算。未来的开始日期之前不会生成往年的提醒；目前仅支持公历。

## 已有项目部署

1. 在 SQL Editor 运行 [数据库升级脚本](../supabase/planner-email-upgrade.sql)。不清空任务或纪念日。
2. 部署 `supabase/functions/planner-email-reminders/` 中的 `index.ts` 和 `handler.mjs` 为 Edge Function `planner-email-reminders`。`verify_jwt=false`，函数内会验证仅保存在 Vault 的随机调度凭据；普通网页登录令牌和 Publishable key 不能触发发信。
3. 在 SQL Editor 运行 [定时任务脚本](../supabase/planner-email-schedule.sql)。如果本次由代理通过 Supabase 插件部署，以上三步已自动完成，不需重复执行。

后台默认关闭，直到下面的自发自收测试被 QQ SMTP 接受。

## 保存 QQ 邮箱授权码

登录 [QQ 邮箱](https://mail.qq.com/)，在设置中找到“第三方服务”或“账号与安全”中的 **IMAP/SMTP 或 POP3/SMTP**，开启并生成授权码。不同版本的菜单名称可能不同。授权码用于 SMTP 登录；不要填写 QQ 登录密码。

打开当前 Supabase 项目的 **Vault**（可用 Dashboard 搜索 Vault），选择 **Add secret**，创建以下两个名称完全一致的密钥：

| Name | Secret value |
| --- | --- |
| `planner_qq_smtp_username` | 你的完整 QQ 发件邮箱，如 `你的号码@qq.com` |
| `planner_qq_smtp_password` | 刚生成的 SMTP 授权码 |

发件服务器已固定为 `smtp.qq.com`、465 端口、TLS 加密；证书验证保持开启。授权码不需要发给代理、写进代码或填在日程网页上。不要改动 Authentication 的 SMTP 设置，它不负责纪念日提醒。

## 发一封测试邮件并启用

在 SQL Editor 运行：

```sql
select public.planner_invoke_mail('test');
```

这一步会向你自己的 QQ 发件邮箱发送一封测试邮件。SQL 返回的数字是异步请求编号，**不是发送成功确认**。稍等后运行：

```sql
select enabled,last_test_at,last_error from public.planner_mail_settings;
```

`enabled=true` 表示测试邮件已被 QQ 发件服务器接受。请再到自己的 QQ 收件箱／垃圾邮件查看“纪念日邮件提醒 · 配置测试”；SMTP 接受不保证最终送达。

`EAUTH` 通常表示邮箱、授权码或 QQ 的安全验证需要检查；`ETIMEDOUT`／`ESOCKET` 表示连接未完成或状态不明确。未配置密钥时函数返回 503，后台保持关闭。可在 Edge Functions → `planner-email-reminders` → Logs／Invocations 检查调用结果。日志与 HTTP 返回不会包含授权码、邮件正文或收件地址。

测试成功后，刷新日程网页，编辑需要提醒的纪念日，勾选“提前 1 天早上 9 点邮件提醒”并保存。每个账号收到自己的提醒，无需共用账号。提醒当日 9 点前保存设置；过了当天发送时段不会补发。

## 定时与失败处理

- 定时任务 `planner-anniversary-email` 在 UTC 01 点每分钟运行，即 UTC+8 的 09:00—09:59。首批在 9 点发送；每次最多处理 5 封，少量积压分批发送。页面不承诺精确到秒。
- 每个纪念日、每个目标日期只认领一次。认领后再次检查取消提醒、删除、编辑及收件邮箱变化。
- SMTP 没有服务端幂等接口。为避免重复提醒，已认领的邮件不自动重发，包括超时、函数中断或发信后数据库确认失败。`claimed` 长时间未完成或 `unknown` 表示结果不明确。先检查 QQ 发件记录和实际收件情况，再决定是否人工处理。
- 查看数据库中的 `planner_mail_deliveries`：`sent` 表示 SMTP 接受，`failed` 表示失败或取消，`unknown` 表示投递结果不明确。该表不向普通网页登录用户开放。
- Supabase 免费项目暂停、定时服务故障、QQ 邮箱风控、额度或收件端过滤都可能影响提醒。不要把它作为唯一的重要提醒渠道。
- 暂停全部提醒：`update public.planner_mail_settings set enabled=false where id;`。单个纪念日在网页取消勾选即可。
- QQ 授权码失效时，更新 Vault 中的密钥并重新运行自发自收测试。不要把授权码复制到 SQL 查询或聊天记录。

参考：[Supabase SMTP 示例](https://github.com/supabase/supabase/tree/master/examples/edge-functions/supabase/functions/send-email-smtp)、[定时函数](https://supabase.com/docs/guides/functions/schedule-functions)、[Vault](https://supabase.com/docs/guides/database/vault)、[腾讯邮件连接参数](https://main.qcloudimg.com/raw/document/product/pdf/1270_46586_cn.pdf)。
