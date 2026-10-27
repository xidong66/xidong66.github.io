# 个人计划：首次配置

页面：`/planner/`，与现有 GitHub Pages 网站一起发布。电脑端显示日历和右侧清单；手机端切换日历与清单。所有日期和时间统一使用新加坡时间（UTC+8），不随设备时区改变。

## 1. 创建任务表

打开自己的 Supabase 项目，左侧 **SQL Editor**（`>_` 图标）→ **New query**。

复制 [supabase/planner.sql](../supabase/planner.sql) 的完整内容，粘贴并点击 **Run**。脚本不需要填写密码或邮箱，可以重复执行。它创建任务表、单次任务完成／修改记录、用户权限、更新时间触发器和实时同步。

成功后应显示执行成功，常见提示为 `Success. No rows returned`。Table Editor 中会出现 `planner_tasks`、`planner_occurrences`、`planner_anniversaries`。

该脚本通过 `auth.uid() = user_id` 限制每个用户只能读写自己的记录；单次记录通过复合外键绑定同一用户的任务。未登录访问没有表权限。创建项目时关闭“Automatically expose new tables”不会影响本脚本：脚本仅为这三张表手动授权。

已有旧版日历的项目：只需在 SQL Editor 运行 [supabase/planner-days-upgrade.sql](../supabase/planner-days-upgrade.sql)，扩充分类约束并创建纪念日表。可重复运行，保留现有任务。未升级时原日程仍可使用，纪念日页会提示尚未启用，新分类暂时不能保存。

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
3. 手机完成普通任务，电脑右侧该项应消失；勾选“显示已完成”可查看。循环任务完成当次后，同一条任务显示下一个尚未完成的日期。
4. 创建每周指定日期重复的任务，只完成本周一次，确认下周仍未完成。
5. 修改周期任务“仅这一次”，确认其他日期没有变化；拖动周期任务只调整当次。
6. 退出后应只显示登录页。未登录请求任务表应被拒绝。

## 使用与维护

- 周期支持按天／周／月间隔及结束日期，每周可多选星期。每月同一天遇到不存在的日期会跳过，而非移到月底。
- 分类包括研究、课程、生活、旅行、约会、作业、项目、会议、其他，每类使用独立颜色。月历使用紧凑任务条，超过当日空间时点击“还有 N 项”查看。
- 顶部“纪念日”页签支持新增、编辑、删除、搜索及置顶。正计时从开始日算起，当天为 0 天；未来开始日先显示倒计时。倒计时目标已过则显示“已过去”，生日可选择每年重复，2 月 29 日在非闰年按 2 月 28 日计算。仅支持公历，不自动创建日历任务。可选的 QQ 邮件提醒需先按[邮件提醒配置](planner-email-setup.md)完成后台部署与自发自收测试；每条纪念日默认关闭提醒。
- 纪念日与任务一样按登录账号保存并同步。置顶记录排在最前，首条以大卡片展示，其余按临近日期排序。多设备同时编辑同一条记录时会拒绝覆盖，需关闭弹窗重新打开。
- “记账”在同一登录账号下管理自己的多张银行卡和钱包，支持 CNY、GBP、SGD，快速记账后可补选账户，固定收支按月生成。部署和使用规则见[个人记账配置](planner-ledger-setup.md)。
- “打卡”支持创建多个独立的每日习惯，每个习惯有自己的月历、颜色、开始日期和备注。可当天打卡、补打过去的日期、取消打卡、按月查看，显示月打卡、累计打卡、月完成率和当前连续天数。部署和统计规则见[习惯打卡配置](planner-habits-setup.md)。
- “体重”支持按日期记录公斤数，可漏记、补记、修改和删除。曲线按实际日期间隔显示，缺失日期不填 0，跨漏记日用虚线连接。可查看近 30 天、近 90 天、指定月份和全部记录，见[体重管理配置](planner-weight-setup.md)。
- 编辑“整个系列”改变基础规则；已有的单次覆盖和完成记录保留。规则不再包含的旧日期记录不会显示；再次改回规则可能重新显示这些记录。
- 删除周期任务时会单独询问“仅这一次”或“整个系列”，无需先调整“修改范围”。选择“整个系列”将删除全部重复日期和完成记录；取消不会删除任何数据。
- 右侧按任务显示平铺清单，一个循环系列只显示一条，并用循环图标标识；日期为最早尚未完成且未跳过的一次，勾选后显示下一次。逾期任务不会自动标记为完成。远于七天的任务也会显示，同名但独立创建的任务不会合并。
- “显示已完成”展示普通任务和已全部完成的循环系列，每个任务仍只有一条；仍在继续的循环任务，其历史完成记录在日历查看。点开日历中的某一次任务，可用“恢复为未完成”撤销误勾。
- 操作在服务器确认后才显示成功。离线不接收编辑，不把未保存任务伪装成已同步；本版不提供离线编辑队列。
- 使用 `updated_at` 条件更新防止同一记录在两台设备上静默互相覆盖。发生冲突时提示刷新重试；表单需关闭后重新打开。
- “体重”页内部可切换“血压”，记录高压、低压和可选心率，支持一天多次、修改、删除、双曲线和按时间范围查看，见[血压记录配置](planner-bp-setup.md)。
- 点击“导出备份”获得包含全部任务、单次记录、纪念日、所有月份记账数据、全部习惯打卡、体重和血压记录的 JSON（格式版本 6）。该文件含个人日程、账目和测量记录，请自行妥善保存。本版没有网页导入功能，可由维护者恢复。
- 免费项目连续一周无活动可能暂停，需登录 Dashboard 恢复。免费方案不含自动备份，建议定期导出。[套餐说明](https://supabase.com/pricing)
- 本版未接入 Outlook 数据、系统后台通知或到点推送。
- 登录页提供“检测连接”，只使用公开项目配置检查邮箱登录接口，不发送输入的邮箱、密码或会话凭据。微信内置浏览器会显示系统浏览器打开提示。检测成功仅证明该接口可达，不等于账号验证成功；检测失败也不能单凭结果断定是某地区的网络封锁。认证请求最长等待约 15 秒，连接检测最长约 8 秒。
- 页面使用本地固定版本 FullCalendar 和 Supabase JS，版本与 MIT 许可证在 `js/vendor/planner/`。不加载主页的第三方访客统计。

## 验证命令

```text
python tools/check_site.py
node --check js/planner.js
node --check js/planner-config.js
node --check js/planner-model.mjs
node --check js/planner-auth.mjs
node --check js/planner-days.mjs
node --check js/planner-anniversaries.mjs
node --check js/planner-ledger.mjs
node --check js/planner-ledger-model.mjs
node --check js/planner-habits.mjs
node --check js/planner-habits-model.mjs
node --check js/planner-weight.mjs
node --check js/planner-weight-model.mjs
node --check js/planner-bp.mjs
node --check js/planner-bp-model.mjs
node --test tools/planner-model.test.mjs
node --test tools/planner-auth.test.mjs
node --test tools/planner-days.test.mjs
node --test tools/planner-email.test.mjs
node --test tools/planner-ledger.test.mjs
node --test tools/planner-habits.test.mjs
node --test tools/planner-weight.test.mjs
node --test tools/planner-bp.test.mjs
```

自动验证不替代运行 SQL 后的真实账号与跨设备验收。


第六项项目管理见 [planner-projects-setup.md](planner-projects-setup.md)。项目支持状态、合作者、产出、反思与发现；备份格式版本 7 增加完整的 projects 数组。

纪念日数字区域支持点击或键盘 Enter/空格，在“总天数”和“X年X个月X天”之间逐卡切换；名称用于编辑。年月天按整月锚点计算，月末日期按目标月份末日截断，剩余为实际天数；年度倒数使用下一次目标日期。显示选择在当前页面内保留，刷新页面或退出登录时重置，不修改纪念日或邮件提醒数据。
