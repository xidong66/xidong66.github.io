# 项目检查与整理记录

检查日期：2026-10-01（Asia/Singapore）。检查对象：`xidong66/xidong66.github.io` 的本地工作副本及远端 `main`。

## 已修复

- 首页嵌套第二个 DOCTYPE、html、head、body，部分 section、strong、b、p 标签缺失闭合：已整理为一个完整文档、七个并列内容区块。
- 学术服务的内嵌样式和首页布局规则：移到 `css/site.css`，补充手机端照片和文本适配、侧栏滚动、键盘焦点与图片说明。
- 五套重复 BibTeX 脚本：拆成五个 `.bib` 文件，由 `js/citations.js` 统一复制，支持复制受限时手动复制和无 JavaScript 时下载。
- 空链接形式的录用/审稿状态：改为普通文字；指向出版页面的 `[PDF]` 改为 `[Paper]`。
- 不存在的 RSS `index.xml`、无用的 Hugo generator 元数据、未使用的 highlight.js、引用缺失字体的 Academicons 首页加载：已移除。
- 删除首页中已注释的其他作者模板经历、本地绝对路径、示例新闻和过时的 Universal Analytics 代码；保留现有 ClustrMaps 访客组件。
- README 内容不足：补充目录、预览、维护、引用文件、检查和 Pages 发布说明。
- Markdown 转换脚本写死不存在的 `index.md`：增加命令行参数、输入验证、禁止默认覆盖和依赖缺失提示。
- 新增标准库首页检查脚本及 GitHub Actions 检查工作流；补充本地缓存/配置忽略规则。

## 两处引文不一致核对

学术检索 MCP 在本会话不可用；使用 CrossRef 官方 DOI 接口核实两篇明显不一致的条目，并交叉查看出版记录。其余引用没有进行逐篇完整审核。

| 条目 | 原问题 | 已确认与修改 | 来源 |
| --- | --- | --- | --- |
| Lightweight element-wise product enhanced neural network… | 链接误指向 OG-SAM 的 Springer 章节，展示标题与引用标题不同，引用只列在线年份 2025 | 改为对应 DOI 链接和正式标题，引用补充卷 273、正式期刊年份 2026 和 DOI；保留作者顺序 | [CrossRef 官方记录](https://api.crossref.org/works/10.1016/j.cmpb.2025.109101)、[出版页面](https://www.sciencedirect.com/science/article/abs/pii/S0169260725005176)、[PubMed](https://pubmed.ncbi.nlm.nih.gov/41075315/) |
| MSCGN | 页面第三作者写作 Haotian Tan，BibTeX 写作 Haotian Tang | CrossRef 作者为 Haotian Tang，页面修正并给引用补充 DOI；正式年份 2026、卷 112 不变 | [CrossRef 官方记录](https://api.crossref.org/works/10.1016/j.bspc.2025.108563) |

Lightweight 论文于 2025 年在线发表、2026 年正式刊期出版，二者并不矛盾；引用采用卷号对应的正式刊期年份。

## 保留与待核对项

- **个人资料与投稿状态**：保留 `Undergraduate`、2022–2026 教育经历和现有审稿/录用状态。是否更新毕业、去向、ICASSP 年份、投稿结果，需要作者确认事实。
- **影响因子**：2026-10-01 初次整理时未改动；2026-10-02 按作者要求统一更新，数值、口径及检索来源见下方记录。
- **自定义域名**：保留 `CNAME` 的 `wuxidong.com`，未验证 DNS、域名归属、证书及当前 Pages 设置；Open Graph URL 保留原 GitHub Pages 地址。
- **历史笔记**：保留 `minds/` 的全部路径和内容，其中有旧 Typora 导出及一个 Markdown 文件放在 `minds/html/`。未移动或批量重生成，避免破坏既有 URL。首页检查不覆盖这些历史文件。
- **历史模板文件**：保留当前首页不用的 Bootstrap 样式/脚本和缺少配套字体的 Academicons 文件，后续确认历史用途后再清理。
- **编辑器文件**：`.idea/`、`.vscode/` 已有文件仍被 Git 跟踪，新增忽略规则不会自动取消跟踪。
- **资源与授权**：图片、简历及论文素材原样保留。仓库没有 LICENSE，未替作者选择许可证，也未删除历史 Git 对象或改写仓库历史。
- **发布状态**：远端检查时，2026-01-17 的 [Pages 部署运行](https://github.com/xidong66/xidong66.github.io/actions/runs/21091615915) 成功。本次整理保存在本地，未提交、推送或发布。

本地在检查前已有 `index.html` 的两行空白修改；整理以包含该修改的工作文件为基础。原始工作文件另存于本次任务产物目录，便于比对。

## 本地验证

- 标准库检查：七个内容区块、五个引用入口和五十个链接/资源引用通过；JavaScript 语法及 Git 空白检查通过。
- Edge 无界面浏览器：320、390、768、1280 像素宽度均无页面横向溢出，本地图片全部加载。
- 五个引用逐一验证剪贴板内容与 `.bib` 文件一致；拒绝剪贴板权限时手动复制弹窗可打开/关闭；禁用 JavaScript 时原生下载正常；引用读取失败时显示提示并触发下载降级。
- 浏览器未出现未捕获的 JavaScript 异常。当前测试环境无法连接 ClustrMaps，因此访客地球组件未显示；保留该外部组件，未将它的服务可用性计入首页检查结果。
- Markdown 工具参数帮助及错误提示已检查；本机没有 pypandoc/Pandoc，未验证实际 HTML 转换。新增 GitHub Actions 尚未在远端运行。

## 2026-10-02：按作者提供的信息更新两篇论文

- MDF：更新为提供的标题大小写与 ICASSP 2026 会议信息，用 IEEE 论文链接替换 `[Accepted]`，新增 `miao2026mdf.bib` 及引用入口。
- PhysioSAug：替换为 **A Diffusion-Enhanced Classification System for Physiological Signal-based Diagnosis**，期刊改为 **Expert Systems with Applications**，作者补充 Yue Xu 和 Zhuoyuan Li；去掉原期刊的 IF 数字及 `[Under Review]`，加入指定的 ScienceDirect 摘要页链接和 `tang2026diffusion.bib`。
- 两份 BibTeX 按作者提供内容保存，仅整理换行缩进，未额外添加或推测 DOI、卷号、影响因子。首页引用入口由五个增至七个。
- 按作者要求统一论文操作链接的视觉表现：所有 `[Paper]`、`[BibTeX]`、`[Code]`、`[Oral]` 使用普通字重，移除加粗标签；会议说明中的 `(Oral)` 同样取消加粗。

## 2026-10-02：更新期刊影响因子

按作者要求，Diffusion 论文的期刊行去掉发表年份，统一显示 `Expert Systems with Applications IF 9.4`；BibTeX 中的发表年份保留。首页所有已有期刊 IF 更新为下表数值，维持原有 IF 加粗和论文链接普通字重的样式。

口径为公开检索来源注明的 **2025 Journal Impact Factor（2026 年更新）**，核对日期为 2026-10-02。未采用 CiteScore、五年影响因子或其他网站自算指标。出版商 ScienceDirect Insights 页面直连返回 403；部分旧卷页面的搜索缓存仍显示 2024 数值。此次使用 Bioxbio 的逐年记录，并与独立公开记录交叉核对；未直接访问 Clarivate 授权 JCR 原表。

| 期刊 | 更新后 IF | 年度记录 | 交叉核对记录 |
| --- | --- | --- | --- |
| Expert Systems with Applications | 9.4 | [Bioxbio](https://www.bioxbio.com/journal/EXPERT-SYST-APPL) | [大学教师维护的 JCR 记录](https://csiebeta.npu.edu.tw/~wchu/IF%26Rank.htm) |
| Computer Methods and Programs in Biomedicine | 6.4 | [Bioxbio](https://www.bioxbio.com/journal/COMPUT-METH-PROG-BIO) | [JCR 2025 记录](https://dizin.docent.com.tr/en/dergiler/01692607) |
| Biomedical Signal Processing and Control | 5.7 | [Bioxbio](https://www.bioxbio.com/journal/BIOMED-SIGNAL-PROCES) | [JCR 2025 记录](https://www.minicod.com/journals/biomedical-signal-processing-and-control-a6a38989) |
| Engineering Applications of Artificial Intelligence | 9.0 | [Bioxbio](https://www.bioxbio.com/journal/ENG-APPL-ARTIF-INTEL) | [卢布林理工大学期刊记录](https://pub.pollub.pl/publication/19154/) |
| Neural Networks | 7.2 | [Bioxbio](https://www.bioxbio.com/journal/NEURAL-NETWORKS) | [注明 JCR 来源的期刊记录](https://referencecitationanalysis.com/InCiteJournalInfo?id=17244) |

CMPB 的两篇论文均同步更新为 IF 6.4。会议条目不添加期刊影响因子。
