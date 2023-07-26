---
layout:     post
title:      "Tex On Web"
subtitle:   " \"How to show tex on web\""
date:       2022-01-29 00:10:00
author:     "Calvchen"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - Life
    - Solving

---

> “After I finish my tex reference, I found out it can not be shown on my web blog… Which is a common problem of tex…”
>

## How to Show Tex? 

**LaTex** is so beatiful that once you have tried out, you will never remember what word is?

I found so much fun writing tex, however I found that cannot be viewed as math interpertation on web.

**MathJax.js** of JavaScript is a recommended choice of solving this problem, I will come back this afternoon to implement that…

(This afternoon)

I occasionally found out a [blog](http://csega.github.io/mypost/2017/03/28/how-to-set-up-mathjax-on-jekyll-and-github-properly.html) which works fine for my local server, but still not work out my blog web.

$\vdots$

So the final recipe will be:

The recipe is simple.

- Go to your **_includes/head.html** in your Jekyll folder structure.
- Put the following code snippet there (before the </head> tag).

```html
<head>
       ...
       <script type="text/x-mathjax-config"> MathJax.Hub.Config({ TeX: { equationNumbers: { autoNumber: "all" } } }); </script>
       <script type="text/x-mathjax-config">
         MathJax.Hub.Config({
           tex2jax: {
             inlineMath: [ ['$','$'], ["\\(","\\)"] ],
             processEscapes: true
           }
         });
       </script>
       <script src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-MML-AM_CHTML"></script>
       </head>
```

It will surely work fine now (for today). 

But still it has some grammar problems can be interpreted by **Typora** but not MathJax. Won’t be a big problem.

Thanks a lot.

— 4:01 PM 1/29/2022