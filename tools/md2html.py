
#!/usr/bin/env python
# -*- coding: utf-8 -*-


# encoding = '<meta charset="utf-8">'


import pypandoc


# With an input file: it will infer the input format from the filename
output = pypandoc.convert_file('index.md', 'html', outputfile='index-2.html')



# Or
# 使用Markdown编辑器Typora，文件 --> 导出 --> HTML