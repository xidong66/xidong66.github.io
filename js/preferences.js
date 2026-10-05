/* Shared language, palette, and Singapore clock for the homepage and studio. */
(() => {
  const messages = {
    'control.light': ['Light', '浅色'], 'control.dark': ['Dark', '深色'],
    'control.singapore': ['Singapore', '新加坡'], 'control.palette': ['Color theme', '颜色主题'],
    'control.language': ['Language', '语言'], 'control.clock': ['Singapore time (UTC+8)', '新加坡时间（UTC+8）'],
    'home.name': ['Xidong Wu', '吴熙东'], 'home.role': ['PhD student', '博士研究生'],
    'home.profileRole': ['Undergraduate student', '本科生'],
    'home.profileUniversities': ['Northeastern University / University of Dundee', '东北大学 / 英国邓迪大学'],
    'home.nus': ['National University of Singapore', '新加坡国立大学（NUS）'],
    'home.about': ['About', '关于我'], 'home.publications': ['Publications', '论文成果'],
    'home.honors': ['Honors and Awards', '荣誉与奖励'], 'home.education': ['Education', '教育经历'],
    'home.services': ['Academic Services', '学术服务'], 'home.news': ['Personal News', '个人动态'],
    'home.skills': ['Skills', '技能'], 'home.email': ['Email', '邮箱'], 'home.resume': ['Resume', '简历'],
    'home.team': ['My Team', '研究团队'], 'home.studio': ['Research Studio', '研究工作台'],
    'home.scholar': ['Google Scholar', '谷歌学术'], 'home.skip': ['Skip to content', '跳到正文'],
    'visitors.title': ['Visitors', '访客'],
    'visitors.intro': ['Visitors from around the world.', '来自世界各地的访客。'],
    'visitors.stats': ['View visitor statistics ↗', '查看访客统计 ↗'],
    'home.bio': [
      'I am an undergraduate student studying Biomedical Engineering through the joint training programme between Northeastern University and the University of Dundee. My research focuses on medical signal and image analysis, using artificial intelligence for biosignal classification, medical image segmentation, and efficient deployment.',
      '我目前是东北大学与英国邓迪大学生物医学工程联合培养项目的本科生，研究聚焦医学信号与图像分析，探索人工智能在生理信号分类、医学图像分割及高效部署中的应用。'],
    'home.research': [
      'My work covers two main directions: electrocardiogram signal classification and deployment on embedded devices, and the application of models such as SAM and CLIP to medical imaging. I am also working toward an open-source platform for standardized evaluation of ECG analysis methods, while exploring connections between medical imaging and genomics.',
      '我的工作主要涵盖两个方向：心电信号分类及嵌入式设备部署，以及 SAM、CLIP 等模型在医学图像中的应用。同时，我致力于构建用于心电分析方法标准化评估的开源平台，并探索医学图像与基因组学之间的交叉研究。'],
    'home.authors': ['#: Co-first author; ✳: Corresponding author', '#：共同第一作者；✳：通讯作者'],
    'home.review': ['[Under Review]', '[审稿中]'], 'home.reviewer': ['Reviewer', '审稿人'],
    'home.neu': ['Northeastern University', '东北大学'], 'home.dundee': ['University of Dundee', '邓迪大学'],
    'home.undergraduate': ['Undergraduate studies', '本科阶段'], 'home.current': ['Current', '在读'],
    'education.phdPeriod': ['2027 – Present', '2027 – 至今'],
    'education.beng': ['Degree of Bachelor of Engineering', '工学学士学位'],
    'education.biomedical': ['Biomedical Engineering', '生物医学工程'],
    'education.grade': ['Grade: 88/100', '成绩：88/100'],
    'education.firstClass': ['First Class Honours', '一等荣誉学位'],
    'home.honorsText': ['Aug 2024: Northeastern University Third-Class Scholarship\nMar 2024: Northeastern University Innovation Individual Award\nAug 2023: Northeastern University Second-Class Scholarship', '2024 年 8 月：东北大学三等奖学金\n2024 年 3 月：东北大学创新个人奖\n2023 年 8 月：东北大学二等奖学金'],
    'home.newsDate': ['Feb 2025:', '2025 年 2 月：'],
    'home.newsIntro': ['A feature about my research achievements and academic work was published on the', '我的科研成果与学术工作获报道，刊登于'],
    'home.newsSource': ['official website of the School of Biomedical Engineering, Northeastern University', '东北大学生物医学与信息工程学院官方网站'],
    'home.top': ['Back to top', '返回顶部'], 'home.copyright': ['© 2026, Xidong Wu. All rights reserved.', '© 2026 吴熙东。保留所有权利。'],
    'citation.title': ['BibTeX citation', 'BibTeX 引用'], 'citation.help': ['Copy the citation below, or use the download link on the publication.', '复制下方引用，或通过论文条目的引用链接下载。'],
    'citation.close': ['Close', '关闭'], 'citation.copied': ['BibTeX copied to clipboard.', 'BibTeX 已复制到剪贴板。'],
    'citation.failed': ['Unable to load BibTeX. Please download the citation.', '无法加载 BibTeX，请下载引用文件。'],
    'studio.skip': ['Skip to workbench', '跳到工作台'], 'studio.home': ['Academic homepage', '学术主页'],
    'studio.tagline': ['A SMALL SPACE FOR BIG QUESTIONS', '在小小空间里，探索大的问题'],
    'studio.eyebrow': ['XIDONG WU / RESEARCH WORKBENCH', '吴熙东 / 研究工作台'],
    'studio.from': ['From signals', '从信号出发'], 'studio.to': ['to ', '探索'], 'studio.possibilities': ['possibilities.', '更多可能。'],
    'studio.intro': ['Biosignals, medical images, and a little curiosity.', '生理信号、医学图像，还有一点好奇心。'],
    'studio.invite': ['Take a look around my desk.', '来我的工作台看看。'],
    'studio.desk': ['01 / THE DESK', '01 / 工作台'], 'studio.click': ['Click an object to explore', '点击物件，开始探索'],
    'studio.computer': ['Computer', '电脑'], 'studio.globe': ['Globe', '地球仪'], 'studio.notebook': ['Notebook', '笔记本'],
    'studio.keyboard': ['Keyboard', '键盘'], 'studio.envelope': ['Envelope', '信封'], 'studio.lamp': ['Lamp', '台灯'],
    'studio.board': ['Circuit board', '电路板'],
    'desk.height': ['Desk height', '桌面高度'], 'desk.lower': ['Lower the desk', '降低桌面'], 'desk.raise': ['Raise the desk', '升高桌面'],
    'desk.presets': ['Desk height presets', '桌面高度预设'], 'desk.sitting': ['Sitting', '坐姿'], 'desk.standing': ['Standing', '站姿'],
    'desk.help': ['Hold an arrow to adjust; release to stop.', '按住箭头持续升降，松开即停。'],
    'desk.toggleHelp': ['Switch sitting or standing; press again to stop.', '点击切换坐姿或站姿，升降中点击停止。'],
    'studio.pause': ['Pause motion', '暂停动画'], 'studio.resume': ['Resume motion', '继续动画'],
    'studio.afterword': ['Medical signals tell stories.', '医学信号，诉说生命的故事。'],
    'studio.afterwordSecond': ['I build methods to help us read them.', '我研究帮助我们读懂它们的方法。'],
    'studio.publications': ['Explore the publications', '查看论文成果'], 'studio.footer': ['BIOMEDICAL ENGINEERING / KEEP EXPLORING', '生物医学工程 / 持续探索'],
    'studio.write': ['Write a little letter ↗', '写封小信 ↗'],
    'studio.atKeyboard': ['AT THE KEYBOARD', '在键盘前'], 'studio.terminalTitle': ['A tiny research terminal.', '一个小小的研究终端。'],
    'studio.terminalHelp': ['Type help to see the commands: projects, globe, notes, email, clear.', '输入 help 查看命令：projects、globe、notes、email、clear。'],
    'studio.terminalInitial': ['XW / RESEARCH TERMINAL\nHello, curious visitor.\nType help to get started.', 'XW / 研究终端\n你好，欢迎来探索。\n输入 help 开始。'],
    'studio.commandPlaceholder': ['Type a command', '输入命令'], 'studio.enter': ['Enter ↵', '回车 ↵'],
    'studio.available': ['Available commands:', '可用命令：'], 'studio.opening': ['Opening', '正在打开'],
    'studio.unknown': ['Unknown command. Type help to explore.', '未识别该命令，请输入 help 查看。'],
    'studio.atComputer': ['ON THE COMPUTER', '在电脑上'], 'studio.projectsTitle': ['Signals & images.', '信号与图像。'],
    'studio.projectsIntro': ['A few windows into my research.', '通过几个项目，了解我的研究。'],
    'studio.mfeg': ['Multiscale feature enhanced gating for atrial fibrillation detection.', '用于心房颤动检测的多尺度特征增强门控网络。'],
    'studio.mdf': ['Noise-estimator-centric experts for robust biosignal classification.', '以噪声估计器为中心的专家模型，实现稳健的生理信号分类。'],
    'studio.og': ['Organogenesis-based adaptive modeling for multi-organ segmentation.', '基于器官发生机制的自适应建模，用于多器官分割。'],
    'studio.codeLink': ['EXPLORE THE CODE ↗', '查看代码 ↗'], 'studio.paperLink': ['READ THE PAPER ↗', '阅读论文 ↗'],
    'studio.atScope': ['ON THE OSCILLOSCOPE', '在示波器上'], 'studio.signalTitle': ['A rhythm to explore.', '探索生命的节律。'],
    'studio.signalIntro': ['A synthetic ECG illustration. Move the dial and watch the rhythm change.', '这是合成的心电波形演示。调整心率，观察节律的变化。'],
    'studio.signalDemo': ['SYNTHETIC SIGNAL / DEMO', '合成信号 / 演示'], 'studio.rate': ['Rate', '心率'],
    'studio.freeze': ['Freeze trace', '冻结波形'], 'studio.resumeTrace': ['Resume trace', '继续波形'],
    'studio.signalResearch': ['Explore my biosignal research ↗', '了解我的生理信号研究 ↗'],
    'studio.inNotebook': ['IN THE NOTEBOOK', '在笔记本里'], 'studio.notesTitle': ['Questions worth asking.', '值得追问的问题。'],
    'studio.questionNoise': ['How can a model stay reliable when a biosignal gets noisy?', '当生理信号受到噪声干扰时，如何让模型保持可靠？'],
    'studio.questionAnatomy': ['How can medical image models adapt to the anatomy they see?', '如何让医学图像模型适应不同的解剖结构？'],
    'studio.questionDevice': ['How can an accurate model fit on a small device?', '如何把准确的模型部署到小型设备上？'],
    'studio.cv': ['Curriculum vitae ↗', '个人简历 ↗'],
    'letter.eyebrow': ['A LITTLE LETTER', '一封小信'], 'letter.good': ['Good ideas', '好想法'],
    'letter.start': [' start with ', '从一声'], 'letter.hello': ['hello.', '你好开始。'],
    'letter.intro': ['A research question, a collaboration, or just a hello. There is room for all of them.', '一个研究问题，一次合作交流，或者简单的一句你好，都欢迎写给我。'],
    'letter.draftInstruction': ['Write a note, fold it, then finish sending in your email app.', '写下几句话，把信折好，再到邮件应用中完成发送。'],
    'letter.sealedInstruction': ['One last step: open your email app, review your letter, and send.', '最后一步：打开邮件应用，确认信件内容并发送。'],
    'letter.to': ['TO', '收件人'], 'letter.subject': ['SUBJECT', '主题'], 'letter.subjectPlaceholder': ['What is on your mind?', '想聊些什么？'],
    'letter.greeting': ['Hi Xidong,', '熙东，你好：'], 'letter.bodyLabel': ['Your message', '信的正文'],
    'letter.bodyPlaceholder': ['I have been thinking about…', '最近，我在想……'], 'letter.short': ['A few words are enough.', '随意写上几句就好。'],
    'letter.fold': ['Fold the letter', '把信折好'], 'letter.address': ['TO XIDONG WU', '寄给吴熙东'],
    'letter.ready': ['READY FOR YOUR EMAIL APP', '信已折好，等待寄出'],
    'letter.readyHelp': ['Your letter is folded. Open your email app to review it and send.', '信已经折好了。打开邮件应用，确认内容后发送。'],
    'letter.open': ['Open email app ↗', '打开邮件应用 ↗'], 'letter.edit': ['Unfold & edit', '展开修改'], 'letter.copy': ['Copy letter', '复制信件'],
    'letter.validation': ['Please write a few words.', '请写下几句话。'], 'letter.copied': ['Letter copied. Paste it into your preferred email app.', '信件已复制，可以粘贴到你常用的邮件应用。'],
    'letter.manual': ['Select and copy your letter below.', '请选中并复制下方信件。'], 'letter.copyLabel': ['Letter text for manual copying', '可手动复制的信件内容'],
    'atlas.connected': ['02 / CONNECTED PLACES', '02 / 求学之路'], 'atlas.eyebrow': ['THREE CITIES, ONE CURIOSITY', '三座城市，同一份好奇'],
    'atlas.world': ['A world ', '求学'], 'atlas.learning': ['of learning.', '之路。'],
    'atlas.intro': ['I am now a PhD student at NUS in Singapore, following my undergraduate joint training at Northeastern University and the University of Dundee.', '我目前在新加坡国立大学攻读博士，此前在东北大学与邓迪大学的联合培养项目中完成本科阶段学习。'],
    'atlas.singapore': ['Singapore', '新加坡'], 'atlas.shenyang': ['Shenyang', '沈阳'], 'atlas.dundee': ['Dundee', '邓迪'],
    'atlas.countrySingapore': ['SINGAPORE', '新加坡'], 'atlas.countryChina': ['CHINA', '中国'], 'atlas.countryUK': ['UNITED KINGDOM', '英国'],
    'atlas.descriptionSingapore': ['National University of Singapore (NUS) · PhD student · 2027 – Present.', '新加坡国立大学（NUS）· 博士研究生 · 2027 – 至今。'],
    'atlas.descriptionShenyang': ['Northeastern University · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · Grade: 88/100. Joint training with Dundee.', '东北大学 · 生物医学工程，工学学士学位 · 2022 – 2026 · 成绩：88/100。与邓迪大学联合培养。'],
    'atlas.descriptionDundee': ['University of Dundee · Degree of Bachelor of Engineering, Biomedical Engineering · 2022 – 2026 · First Class Honours. Joint training with Northeastern University.', '邓迪大学 · 生物医学工程，工学学士学位 · 2022 – 2026 · 一等荣誉学位。与东北大学联合培养。'],
    'atlas.visit': ['Visit the university ↗', '访问学校官网 ↗'], 'atlas.reset': ['Reset', '重置'],
    'studio.documentTitle': ['Research Workbench', '研究工作台'],
    'entrance.hello': ['Hello', '你好'], 'entrance.introducing': ["I'm", '我是'], 'entrance.skip': ['Skip intro ↗', '跳过入场 ↗'],
    'entrance.cancel': ['Cancel', '取消'], 'entrance.projects': ['Turning toward the screen…', '正在转向电脑屏幕……'],
    'entrance.atlas': ['Unfolding the world…', '正在展开地球仪……'], 'entrance.letter': ['Opening your letter…', '正在展开信纸……'],
    'entrance.back': ['← Back to the desk', '← 回到书桌'],
    'stationery.back': ['Back', '返回'], 'stationery.note': ['01 / A NOTE', '01 / 一封小信'],
    'stationery.title': ['A few words,\na good beginning.', '寥寥几笔，\n就是好的开始。'],
    'stationery.intro': ['An idea, a question, or a little hello. Make yourself at home.', '一个想法，一个问题，一声你好。不必字斟句酌，随意写上几句。'],
    'stationery.signoff': ['Looking forward to hearing from you,', '期待回信，'],
    'stationery.foldHelp': ['Fold your note, then leave your mark.', '把心意折好，再亲手封缄。'],
    'stationery.sealStep': ['02 / YOUR SEAL', '02 / 亲手封缄'], 'stationery.sealTitle': ['Leave a little mark.', '落下你的印记。'],
    'stationery.dragHelp': ['Drag the stamp onto the wax and release.', '拖动印章，将底座对准火漆后松手。'],
    'stationery.dragStamp': ['Drag the stamp onto the wax, or press Enter to seal', '拖动印章至火漆，或按回车键盖印'],
    'stationery.stamp': ['Stamp & release the pigeon ↗', '盖戳，让信鸽启程 ↗'],
    'stationery.deliveryStep': ['03 / A LITTLE FLIGHT', '03 / 信鸽启程'], 'stationery.departed': ['The carrier is on its way.', '信鸽启程了。'],
    'stationery.replay': ['Watch the flight again', '再看一次信鸽送信'],
    'stationery.footer': ['From your corner of the world to mine.', '从你的一隅，寄到我的一隅。'],
    'stationery.persist': ['Your draft stays when you close this panel; reloading clears it.', '收起页面会保留草稿；刷新后草稿清空。'],
    'stationery.folding': ['Folding your thoughts with care.', '把心意轻轻折好。'],
    'stationery.inserting': ['A safe little home for your words.', '妥帖地装进信封。'], 'stationery.wax': ['A little wax, a little care.', '落下一滴火漆，封好这份心意。'],
    'stationery.sealInstruction': ['Bring the base of the stamp gently onto the wax.', '让印章的底座，轻轻靠近火漆。'],
    'stationery.stamping': ['Leaving your mark.', '轻轻盖下你的印记。'], 'stationery.flying': ['A small carrier, a long way to go.', '信鸽衔起信件，向远方飞去。'],
    'travel.atlas': ['Personal atlas', '旅行地球仪'], 'travel.back': ['↙ Back to the bench', '↙ 返回工作台'],
    'travel.title': ['A world of memories.', '把旅途，\n留在这里。'],
    'travel.explore': ['Explore the places ↗', '探索旅行足迹 ↗'], 'travel.destinations': ['Travel destinations', '旅行地点'],
    'travel.quote': ['Small moments, kept close.', '把细小的瞬间，好好收藏。'],
    'travel.fallback': ['Use the place list to explore the photographs.', '通过地点列表浏览旅行照片。'],
    'travel.help': ['Drag to turn · Click a pin to open its photographs', '拖动旋转 · 点击标记查看照片'],
    'travel.closeNote': ['Close travel note', '收起旅行纸条'], 'travel.openPhoto': ['Open photograph', '查看照片大图'],
    'travel.imageError': ['This photograph could not be loaded. Try the next one.', '这张照片暂时无法加载，请尝试下一张。'],
    'travel.navigation': ['Photo navigation', '照片导航'], 'travel.previous': ['Previous photograph', '上一张照片'],
    'travel.next': ['Next photograph', '下一张照片'], 'travel.fromAlbum': ['FROM MY TRAVEL ALBUM', '来自我的旅行相册'],
    'travel.choosePhoto': ['Choose a photograph', '选择照片'], 'travel.footer': ['COLLECT MOMENTS, KEEP THE STORIES.', '收藏瞬间，留下故事。'],
    'travel.continued': ['TO BE CONTINUED ✳', '旅途未完 ✳'], 'travel.closePhoto': ['Close photograph', '关闭照片大图'],
    'travel.places': ['PLACES', '个地点'], 'travel.photographs': ['PHOTOGRAPHS', '张照片'],
    'travel.albumDescription': ['A few moments from my travels, kept in photographs.', '用照片留下一些旅途中的瞬间。'],
    'atlas.drag': ['DRAG TO ROTATE · SCROLL TO ZOOM', '拖动旋转 · 滚动缩放'], 'atlas.keys': ['Arrow keys to turn · Home to reset', '方向键旋转 · Home 键重置'],
    'atlas.footer': ['EDUCATION / SHENYANG ↔ DUNDEE → SINGAPORE', '教育经历 / 沈阳 ↔ 邓迪 → 新加坡'], 'atlas.mapData': ['Map data:', '地图数据：'],
    'atlas.fallback': ['The map is unavailable. Explore the cities using the buttons.', '地图暂时无法显示，可以通过按钮了解各座城市。'],
    'status.loading': ['Preparing the workbench…', '正在准备工作台……'], 'status.ready': ['Made of questions & a few polygons.', '一些问题，一些模型，一份好奇心。'],
    'status.mapless': ['Coordinate globe / map data unavailable.', '坐标地球仪 / 地图数据暂不可用。'],
    'status.lost': ['3D paused. Explore using the buttons below.', '3D 暂停，请通过下方按钮探索。'], 'status.restored': ['Workbench restored.', '工作台已恢复。'],
    'status.unavailable': ['Explore using the buttons below. 3D is unavailable.', '3D 暂不可用，请通过下方按钮探索。'],
    'status.lampOn': ['A little more light.', '添一点光。'], 'status.lampOff': ['Lamp switched off.', '台灯已关闭。'],
    'hint.projects': ['Computer / research projects', '电脑 / 研究项目'], 'hint.signal': ['Oscilloscope / synthetic ECG', '示波器 / 合成心电信号'],
    'hint.atlas': ['Globe / connected places', '地球仪 / 求学之路'], 'hint.notes': ['Notebook / research questions', '笔记本 / 研究问题'],
    'hint.keyboard': ['Keyboard / research terminal', '键盘 / 研究终端'], 'hint.letter': ['Envelope / write a little letter', '信封 / 写封小信'], 'hint.lamp': ['Lamp / switch the light', '台灯 / 开关灯光'],
    'hint.board': ['Circuit board / embedded AI', '电路板 / 嵌入式人工智能'],
    'hint.desk-toggle': ['Desk height / sit, stand or stop', '桌面高度 / 坐姿、站姿或停止'],
    'hint.desk-up': ['Raise the desk', '升高桌面'], 'hint.desk-down': ['Lower the desk', '降低桌面'],
    'a11y.projects': ['Close projects', '关闭项目'], 'a11y.signal': ['Close ECG', '关闭心电信号'], 'a11y.notes': ['Close notebook', '关闭笔记本'],
    'a11y.keyboard': ['Close keyboard', '关闭键盘'], 'a11y.letter': ['Close letter', '关闭信件'], 'a11y.atlas': ['Close globe', '关闭地球仪'],
    'a11y.desk': ['3D research workbench. Use the buttons below to explore its objects.', '3D 研究工作台。可以通过下方按钮探索各个物件。'],
    'a11y.globe': ['Interactive globe. Drag to rotate, use arrow keys to turn, plus or minus to zoom, and Home to reset.', '交互地球仪。拖动或使用方向键旋转，加减键缩放，Home 键重置。'],
    'a11y.zoomIn': ['Zoom in', '放大'], 'a11y.zoomOut': ['Zoom out', '缩小'],
  };
  const root = document.documentElement, colorQuery = matchMedia('(prefers-color-scheme: dark)');
  function read(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function save(key, value) { try { localStorage.setItem(key, value); } catch { /* Preferences still work for this page. */ } }
  let language = read('xw.language') === 'zh' ? 'zh' : 'en';
  let explicitTheme = ['light', 'dark'].includes(read('xw.theme'));
  let theme = root.dataset.theme || (colorQuery.matches ? 'dark' : 'light');
  const t = key => messages[key]?.[language === 'zh' ? 1 : 0] ?? key;
  function translate() {
    root.lang = language === 'zh' ? 'zh-CN' : 'en'; root.dataset.locale = language;
    document.querySelectorAll('[data-i18n]').forEach(node => {
      const text = t(node.dataset.i18n);
      if (node.dataset.i18nMode === 'text') {
        const part = [...node.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
        if (part) part.textContent = `${text} `;
      } else node.textContent = text;
    });
    for (const attribute of ['placeholder', 'aria-label']) {
      document.querySelectorAll(`[data-i18n-${attribute}]`).forEach(node => node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`))));
    }
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
    const studio = root.dataset.page === 'studio';
    document.title = language === 'zh' ? `吴熙东 · ${studio ? '研究工作台' : '本科生'}` : `Xidong Wu · ${studio ? 'Research Workbench' : 'Undergraduate student'}`;
    window.dispatchEvent(new CustomEvent('xw:languagechange', { detail: { language } }));
  }
  function applyTheme(value) {
    theme = value; root.dataset.theme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme)));
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#111d24' : '#f4f2eb';
    window.dispatchEvent(new CustomEvent('xw:themechange', { detail: { theme } }));
  }
  window.SitePreferences = { t, get language() { return language; }, get theme() { return theme; } };
  document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    language = button.dataset.language; save('xw.language', language); translate(); tick();
  }));
  document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => {
    explicitTheme = true; save('xw.theme', button.dataset.themeChoice); applyTheme(button.dataset.themeChoice);
  }));
  colorQuery.addEventListener('change', event => { if (!explicitTheme) applyTheme(event.matches ? 'dark' : 'light'); });
  window.addEventListener('storage', event => {
    if (event.key === 'xw.language') { language = event.newValue === 'zh' ? 'zh' : 'en'; translate(); tick(); }
    if (event.key === 'xw.theme') { explicitTheme = ['light', 'dark'].includes(event.newValue); applyTheme(explicitTheme ? event.newValue : colorQuery.matches ? 'dark' : 'light'); }
  });
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  function tick() {
    const now = new Date();
    document.querySelectorAll('[data-singapore-time]').forEach(clock => {
      clock.textContent = formatter.format(now); clock.dateTime = now.toISOString();
      clock.setAttribute('aria-label', `${t('control.clock')}: ${clock.textContent}`);
    });
  }
  let clockTimer;
  function runClock() { clearInterval(clockTimer); tick(); if (!document.hidden) clockTimer = setInterval(tick, 1000); }
  document.addEventListener('visibilitychange', runClock);
  translate(); applyTheme(theme); runClock();
  document.querySelectorAll('.site-preferences').forEach(bar => { bar.hidden = false; });
})();
