---
layout:     post
title:      "Pandas Cheat Sheet"
subtitle:   " \"The amazing data scientist tool\""
date:       2022-02-01 12:00:00
author:     "Calvchen"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - Python
    - Pandas
    - Data

---

> “It is hard to distinguish between Numpy and pandas grammar, so I collect many useful examples for speeding up tabular data processing…”

# Welcome to Pandas

I always find it problematic to search for Pandas grammar because tabular is quite trivial to process that it create tools to satisfy lots of different situations precisely to avoid ambiguity.

Thus, here comes my fast pandas reference page below:

### Conditional Search

```
df.query("X > @thres")
```

### Iterations

```
df.iteritems()  # column-wise
df.iterrows()   # row-wise
df.itertuples([index, name])   # column-wise
```

### Apply

![image-20220203164413966](https://ik.imagekit.io/haochen/Typora/image-20220203164413966.png)





