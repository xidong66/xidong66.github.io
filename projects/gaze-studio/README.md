# Gaze Studio — 临时课程演示

线上地址：<https://wuxidong.com/projects/gaze-studio/>

来源：作业仓库 `integration/line-tool` 分支的提交 `85ef6e4`。
运行文件包括 `index.html`、`style.css`、`app.js`、`experiment.js` 和 `assets/favicon.svg`。
不需要 npm、构建步骤、后端或数据库。原项目：
<https://github.com/ixnac/bn5213-gaze-drawing/commit/85ef6e4b24f4f42f7b850e66c9dbe36b5fedfab4>。

## 集成范围

- 所有运行资源都在这个目录中，CSS/JS 不由主页或其他页面加载。
- 首页 `index.html` 中的 `BEGIN temporary-gaze-studio` / `END temporary-gaze-studio`
  注释之间是唯一的站内入口。
- 演示页页脚提供回主页链接，并标记为临时课程演示。
- 演示页使用 `noindex, follow`，请求搜索引擎不要索引临时页面；这不是访问控制。
- 应用草稿仅存于浏览器 localStorage 的 `bn5213-gaze-studio-v1` 键，
  实验记录保存在 `bn5213-gaze-experiment-v1` 键，可下载为 CSV。
  摄像头画面、画作和实验结果均在浏览器处理。

## 随时移除

1. 在网站根目录 `index.html` 中删除两个 `temporary-gaze-studio` 注释及其间的整个块。
2. 删除整个 `projects/gaze-studio/` 目录（包含本说明）。
3. 提交并推送到现有 Pages 发布分支，等待部署完成。

只做第 1 步会隐藏入口，知道网址的人仍能访问；完整下线需要同时做第 2 步。
不需要修改网站公共 CSS/JS、数据库或部署配置。原作业压缩包不受影响。
访客可在下线前导出画作和实验 CSV。已保存的草稿和实验记录仍存于各自的浏览器。

## 预览和限制

从网站根目录运行 `python tools/serve_site.py --port 8000`，访问
<http://127.0.0.1:8000/projects/gaze-studio/>。

摄像头需要 HTTPS 或 localhost；WebGazer 按需从
`https://webgazer.cs.brown.edu/webgazer.js` 加载，MediaPipe 从 jsDelivr 加载，
字体使用 Google Fonts。鼠标、触屏和数字键 1–4 的绘画模式无需摄像头。
选择 **Four points** 连接四个固定点，或选择 **Line tool**，用鼠标悬停
或注视依次选定直线的两个端点。摄像头模式下切换工具后需要重新校准。
选择 **Experiment** 后填写参与者编号，即可进行水平线计时、图形、四点选择或注视任务。
真人注视精度仍需实际设备测试。
