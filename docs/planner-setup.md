# 个人计划：首次配置

页面：`/planner/`，与现有 GitHub Pages 网站一起发布。电脑端显示日历和右侧清单；手机端切换日历与清单。所有日期和时间统一使用新加坡时间（UTC+8），不随设备时区改变。

## 1. 创建任务表

打开自己的 Supabase 项目，左侧 **SQL Editor**（`>_` 图标）→ **New query**。

复制 [supabase/planner.sql](../supabase/planner.sql) 的完整内容，粘贴并点击 **Run**。脚本不需要填写密码或邮箱，可以重复执行。它创建任务表、单次任务完成／修改记录、用户权限、更新时间触发器和实时同步。

成功后应显示执行成功，常见提示为 `Success. No rows returned`。Table Editor 中会出现 `planner_tasks`、`planner_occurrences`。

该脚本通过 `auth.uid() = user_id` 限制每个用户只能读写自己的记录；单次记录通过复合外键绑定同一用户的任务。未登录访问没有表权限。创建项目时关闭“Automatically expose new tables”不会影响本脚本：脚本仅为这两张表手动授权。

## 2. 创建你自己的网页登录账号

**这与登录 Supabase 管理后台的账号不同，也不是数据库密码。**

在 **Authentication → Users → Add user → Create new user** 中填写希望用于计划网页的邮箱和一个独立密码。创建时启用 **Auto Confirm User**（如有该选项），确保该用户的邮箱已确认。密码自行保存，不要写进仓库或发给他人。

在 **Authentication → Sign In / Providers** 或 General configuration 中关闭 **Allow new users to sign up**。保持 Email 登录启用、Anonymous sign-ins 关闭。这是个人工具，网页只提供登录，不开放注册。

如果控制台菜单改名，可用 Dashboard 的 Search 搜索上述选项。官方说明：

- [Auth General configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Email/password login](https://supabase.com/docs/guides/auth/passwords)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## 3. 访问网页

本地在仓库根目录运行 `python tools/serve_site.py --port 8000`，打开 `http://127.0.0.1:8000/planner/`。该预览脚本修正部分 Windows 机器将 JavaScript 识别为 `text/plain`、导致模块无法加载的问题。

将网站更改发布到 GitHub Pages 后，在电脑和手机打开同一个站点的 `/planner/`，使用上一步创建的同一账号登录。`CNAME` 当前为 `wuxidong.com`，预期地址为 `https://wuxidong.com/planner/`，以实际 Pages 域名配置为准。

当前配置使用公开项目地址和 Publishable key，位于 `js/planner-config.js`。没有保存任何管理员密钥。它不赋予匿名访客访问任务的权限；登录和数据库 RLS 是数据访问的边界。不要把 Secret key、service_role key 或数据库密码放进网页。

## 4. 首次同步验收

1. 电脑登录后创建一个任务，确认状态为“已同步”。
2. 手机登录同一账号，确认任务出现。通常实时更新；实时连接受限时，最多 30 秒或点击“刷新”。
3. 手机完成任务，电脑右侧该项应消失；勾选“显示已完成”可查看。
4. 创建每周指定日期重复的任务，只完成本周一次，确认下周仍未完成。
5. 修改周期任务“仅这一次”，确认其他日期没有变化；拖动周期任务只调整当次。
6. 退出后应只显示登录页。未登录请求任务表应被拒绝。

## 使用与维护

- 周期支持按天／周／月间隔及结束日期，每周可多选星期。每月同一天遇到不存在的日期会跳过，而非移到月底。
- 编辑“整个系列”改变基础规则；已有的单次覆盖和完成记录保留。规则不再包含的旧日期记录不会显示；再次改回规则可能重新显示这些记录。
- 右侧显示过去未完成任务、今天和未来七天，每组最多显示 80 项，可搜索缩小范围。日历可导航查看更远的任务。
- 操作在服务器确认后才显示成功。离线不接收编辑，不把未保存任务伪装成已同步；本版不提供离线编辑队列。
- 使用 `updated_at` 条件更新防止同一记录在两台设备上静默互相覆盖。发生冲突时提示刷新重试；表单需关闭后重新打开。
- 点击“导出备份”获得包含全部任务和单次记录的 JSON。该文件含个人日程，请自行妥善保存。本版没有网页导入功能，可由维护者恢复。
- 免费项目连续一周无活动可能暂停，需登录 Dashboard 恢复。免费方案不含自动备份，建议定期导出。[套餐说明](https://supabase.com/pricing)
- 本版未接入 Outlook 数据、系统后台通知或到点推送。
- 页面使用本地固定版本 FullCalendar 和 Supabase JS，版本与 MIT 许可证在 `js/vendor/planner/`。不加载主页的第三方访客统计。

## 验证命令

```text
python tools/check_site.py
node --check js/planner.js
node --check js/planner-config.js
node --check js/planner-model.mjs
node --test tools/planner-model.test.mjs
```

自动验证不替代运行 SQL 后的真实账号与跨设备验收。
