# Xidong Wu — Academic Homepage

吴熙东的个人学术主页，目前为新加坡国立大学（NUS）博士研究生，展示研究方向、论文、教育经历、学术服务和个人动态。

- GitHub Pages：<https://xidong66.github.io/>
- 自定义域名配置：`CNAME` 中的 `wuxidong.com`。使用前请核对域名 DNS 和仓库 Pages 设置。

项目是直接发布的静态 HTML/CSS/JavaScript 网站，无需 npm、Hugo 或构建步骤。

## 目录

```text
index.html                 首页和个人资料
css/redlounge.css           原有主题样式
css/site.css                首页布局、手机适配和引用弹窗样式
js/citations.js             BibTeX 复制与下载降级处理
js/preferences-init.js      首屏深浅色设置，避免刷新时主题闪烁
js/preferences.js           中英文、深浅色、新加坡时钟和共享翻译
css/preferences.css         偏好控件和时钟样式
studio/index.html           交互式研究工作台（/studio/）
css/studio.css              工作台与地球仪布局
js/studio.js                工作台弹窗、交互和动画控制
js/studio-scene.js          原创 Three.js 桌面、地球仪和合成 ECG
js/vendor/three/            本地 Three.js 0.180.0 与 MIT 许可证
assets/studio/              Natural Earth 公共领域地图数据
assets/bibtex/              可下载的 BibTeX 引用，每篇论文一个文件
assets/img/                 照片、校徽、期刊标识
assets/paper/               论文相关图片
assets/pdf/XidongWuCV.pdf   简历
minds/md/                  历史笔记 Markdown 源文件
minds/html/                历史笔记导出文件（保留原路径）
tools/check_site.py         首页结构和本地资源检查
tools/md2html.py            可选的 Markdown 转 HTML 工具
.github/workflows/         自动检查配置
CNAME                      GitHub Pages 自定义域名
```

`css/styles.css`、`css/academicons.min.css` 和 `js/scripts.js` 是历史模板文件，当前首页不加载它们。已有编辑器配置也保留原文件；`.gitignore` 只阻止新增本地配置和缓存进入版本管理。

## 本地预览

在包含 `index.html` 的仓库根目录运行（Python 3.10 或更高版本）：

```bash
python -m http.server 8000 --bind 127.0.0.1
```

浏览器打开 <http://127.0.0.1:8000/>，按 `Ctrl+C` 停止。

首页侧栏的 **Research Studio** 可进入研究工作台，也可以直接打开 <http://127.0.0.1:8000/studio/>。点击桌面上的电脑、示波器、地球仪、笔记本、键盘、信封或灯，或使用画面下方的按钮。地球仪支持拖动、缩放和城市切换；ECG 是可调心率的合成演示。键盘可输入简单命令探索工作台。信封可以填写信件、折好、展开修改，并通过邮件客户端给 `xidong03@163.com` 发信；页面不自动投递邮件。工作台的库与地图均在本地，无运行时外部请求。实现与素材来源见 [工作台维护说明](docs/studio-assets.md)。

请通过 HTTP 预览。直接双击 HTML 会影响外部资源加载和引用文件读取。首页使用 Pure CSS、Google Fonts 和 ClustrMaps 外部资源，需要网络；第三方资源不可用时，字体会回退到本地字体。

主页与工作台顶部可切换 `[Light | Dark]` 和 `[EN | 中]`；选择会在刷新及页面间跳转时保留。首次访问使用系统深浅色设置和英文界面。正文、导航、教育经历、弹窗和工作台提示均支持中文；论文题目、期刊名称、作者和 BibTeX 保持正式出版写法。新加坡时钟固定使用 `Asia/Singapore`（UTC+8），每秒更新，不随访客所在地变化。

翻译统一维护在 `js/preferences.js`，页面通过 `data-i18n` 标记引用；动态工作台消息通过 `SitePreferences.t()` 读取。新增院系、导师或入学时间前请核实信息；当前 NUS 教育条目只显示博士生身份与在读状态。

## 更新内容

旅行地球仪入口为 `/studio/globe/`，也可点击工作台的地球仪进入。照片按地点保存在 `travel/`；往已有文件夹添加 JPG 后运行 `python tools/build_travel_atlas.py` 更新索引。添加新地点时，先在该脚本的 `LOCATIONS` 中补充中英文名称、国家及地点坐标。修改 `studio/index.html` 后也运行该脚本，保持地球仪直达页同步。照片保持原文件，按选中的地点加载。

1. 在 `index.html` 中按 `about`、`publications`、`education` 等 section ID 定位内容。
2. 添加论文时，复制一个 `<article class="publication">`，填写已核实的标题、作者、发表信息和链接。录用或审稿状态用文字展示。
3. 将引用保存到 `assets/bibtex/引用键.bib`，用 `<a href="assets/bibtex/引用键.bib" data-citation download>[BibTeX]</a>` 引用。点击会复制到剪贴板；浏览器拒绝复制时显示可手动复制的弹窗；禁用 JavaScript 时仍可下载文件。
4. 更新简历时替换 `assets/pdf/XidongWuCV.pdf`。新增图片应填写准确的 `alt` 文本。
5. 页面样式修改放在 `css/site.css`。不要在正文中嵌入另一套 `html/head/body` 文档。

## 验证

```bash
python tools/check_site.py
node --check js/citations.js
node --check js/preferences-init.js
node --check js/preferences.js
node --check js/studio.js
node --check js/studio-scene.js
node --check js/travel-globe.js
node --check js/travel-data.js
```

Python 检查无需第三方依赖，涵盖首页标签闭合、重复 ID、图片说明、本地链接、加载的 CSS 资源和 BibTeX 基本格式。Node 检查用于 JavaScript 语法；Node 不是网站运行依赖。

GitHub Actions 在 push / pull request 时运行同样的检查，不执行发布。外部链接、论文事实、历史笔记和完整 BibTeX 语义需要另行核对。

## 可选：导出 Markdown 笔记

安装 `pypandoc`，并按 [Pandoc 安装说明](https://pandoc.org/installing.html) 安装 Pandoc：

```bash
python -m pip install pypandoc
python tools/md2html.py "minds/md/Support/Git.md" -o "minds/html/Git.html"
```

如果目标文件已存在，确认需要替换后加 `--force`。省略 `-o` 时输出到源文件旁边的同名 `.html`。该工具生成 Pandoc 独立页面，不复刻历史 Typora 导出样式；网站预览和发布不需要此依赖。

## GitHub Pages 发布

维护此仓库现有的 Pages 发布方式。当前远端曾通过 `pages build and deployment` 工作流成功部署；可在仓库 Settings → Pages 核对发布分支和目录。如果按分支发布，首页必须位于配置的发布目录根部。自定义域名同时需要 `CNAME`、DNS 和 Pages 设置一致。

整理记录和待核对项见 [项目检查记录](docs/project-audit.md)。项目来自已有主页模板的 fork；未新增许可证，复用或公开分发时请核对原模板与第三方素材的授权。
