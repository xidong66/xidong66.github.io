---
layout:     post
title:      "LaTex Cheat Sheet"
subtitle:   " \"LaTex is All You Need!\""
date:       2022-01-29 12:00:00
author:     "Calvchen"
header-img: "img/post-bg-2015.jpg"
catalog: true
tags:
    - Tex
    - Starter
    - Writing

---

# Latex Cheat Sheet

> “This contains many math symbols I encountered while writing Tex, so I gather them around for fast reference. ”



## Diagrams and visualizations 

[Mermaid Cheat Sheet](https://mermaid-js.github.io/mermaid/#/flowchart)

### Emoji

[Have Fun with Emoji Unicode](https://apps.timwhitlock.info/emoji/tables/unicode#block-6c-other-additional-symbols)

To make the writing more vivid~

❔❓❗❕❌💻🎸🎻🎺🎵🎶🌑🌓🌔🌕🌆🌇⭐⚾⚽⚡⚠🆒🚲🚀🍣😉😜😱🔥🌊🌈📌🍦



### Text

| Renders                                         | LaTeX markup          | Renders                   | LaTeX markup     |
| ----------------------------------------------- | --------------------- | ------------------------- | ---------------- |
| $a \quad b \qquad c$                            | `\quad \qquad`        | $a\!b\,c\:d\;e$           | `\ +i,:;_`       |
| $\mathcal{ABC}$                                 | `\mathcal`            | $\mathscr{ABC}$           | `\mathscr`       |
| $\mathbb{ABC}$                                  | `\mathbb`             | $\mathfrak{ABC}$          | `\mathfrak`      |
| $\mathsf{ABC}$                                  | `\mathsf`             | $\mathbf{ABC}$            | `\mathbf`        |
| $\ell\ \Re\ \mho$                               | `\ell \Re \mho`       | $\log \lg \ln$            | `\log \lg \ln`   |
| $\ldots  \cdots$                                | `\ldots cdots`        | $\vdots \ddots$           | `\vdots ddots`   |
| $\bar a\ \vec a\ \hat a$                        | `\bar \vec \hat`      | $\tilde{a} \widetilde{a}$ | `\tilde \wide+X` |
|| $$                                              | ``                    | $\acute{a}\  \grave{a}$   | `\acute \grave`  ||
| $\check a \  \breve a$                          | `\check \breve`       | $\dot a \ \ddot a$        | `\dot \ddot`     |
| $\overline{a+b}$                                | `\overline`           | $\underline{a+b}$         | `\underline`     |
| $\underset {\theta }{X}\ \overset{\theta }{X} $ | `\underset \overset{}{X} ` | $$                        | `\overset`       |

Color offered: $\color{grey}{grey}\ \color{purple}{purple}\ \color{maroon}{maroon}\ \color{olive}{olive}\ \color{silver}{silver}\ \color{navy}{navy}\ \color{lime}{lime} \color{teal}{teal}$

Markup `\overbrace{a + \underbrace{b+c}_{1.0} + d}^{2.0}` will render below:


$$
\overbrace{a+\underbrace{b+c}_{1.0}+d}^{2.0}
$$

>The enclose package haven’t provided…

| $$\enclose{horizontalstrike}{a}\ \enclose{verticalstrike}{a}$$ | `\enclose{horizontalstrike}` | $\enclose{updiagonalstrike}{a} \enclose{downdiagonalstrike}{a}$ | `up/down + diagonalstrike` |
| ------------------------------------------------------------ | ---------------------------- | ------------------------------------------------------------ | -------------------------- |
| $\enclose{updiagonalstrike,downdiagonalstrike}{a}$           | `up,downdiagonalstrike`      |                                                              |                            |

### Greek Letters

| Renders                                                      | LaTeX markup              | Renders                                                      | LaTeX markup        |
| ------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------ | ------------------- |
| ![{\displaystyle \alpha A}](https://wikimedia.org/api/rest_v1/media/math/render/svg/1423e0a85ebc0eacd23bce6800aac8f222548cb1) | `\alpha A`                | ![{\displaystyle \nu N}](https://wikimedia.org/api/rest_v1/media/math/render/svg/ae155e152964cc8ca332708abdd014d9362b1959) | `\nu N`             |
| ![{\displaystyle \beta B}](https://wikimedia.org/api/rest_v1/media/math/render/svg/e86ade6391d9979a1ec9ef888a69c8e1bfaca861) | `\beta B`                 | ![{\displaystyle \xi \Xi }](https://wikimedia.org/api/rest_v1/media/math/render/svg/58db043ab673381e890f325efefdf7eee06d9acd) | `\xi \Xi`           |
| ![{\displaystyle \gamma \Gamma }](https://wikimedia.org/api/rest_v1/media/math/render/svg/0a703b97315b40b657673479ae39d6e6f8fecbe1) | `\gamma \Gamma`           | ![{\displaystyle oO\;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/6c5cb490780176f943464dc5313ec8eb2a6285d4) | `o O`               |
| ![{\displaystyle \delta \Delta }](https://wikimedia.org/api/rest_v1/media/math/render/svg/7ec33521315a7ca8e815f20024d2b9494b8123b3) | `\delta \Delta`           | ![{\displaystyle \pi \Pi }](https://wikimedia.org/api/rest_v1/media/math/render/svg/ab5a189a040911908efdcededa3d4e40e48ae602) | `\pi \Pi`           |
| ![{\displaystyle \epsilon \varepsilon E\;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/ace20d40a97f4bcd3d5a0efbdee5513c241fe016) | `\epsilon \varepsilon E`  | ![{\displaystyle \rho \varrho P\;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/a4cf38723a1cd25888c0c3c828e09f01ab04b012) | `\rho \varrho P`    |
| ![{\displaystyle \zeta Z}](https://wikimedia.org/api/rest_v1/media/math/render/svg/98de1aceefc11746f0bd397a8c7954cad5a0a6ce) | `\zeta Z`                 | ![{\displaystyle \sigma \,\!\Sigma \;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/9689e4eb34d33e1d734a3044d9d35a89680f0dc3) | `\sigma \Sigma`     |
| ![{\displaystyle \eta H}](https://wikimedia.org/api/rest_v1/media/math/render/svg/0aa854c7fa2f3b73dfc306fd9d2c3d79105e80e3) | `\eta H`                  | ![{\displaystyle \tau T}](https://wikimedia.org/api/rest_v1/media/math/render/svg/d9c0bbf08b46b2399edbd6f01cdc029da3abfa7f) | `\tau T`            |
| ![{\displaystyle \theta \vartheta \Theta }](https://wikimedia.org/api/rest_v1/media/math/render/svg/083985203afdb520647be7a9b79acda20074e744) | `\theta \vartheta \Theta` | ![{\displaystyle \upsilon \Upsilon }](https://wikimedia.org/api/rest_v1/media/math/render/svg/9d75a091b694acee6aeb07edc29b0f507a76ee59) | `\upsilon \Upsilon` |
| ![{\displaystyle \iota I}](https://wikimedia.org/api/rest_v1/media/math/render/svg/698f27066de7dd25ab2a00dac02995172fbbbcfa) | `\iota I`                 | ![{\displaystyle \phi \varphi \Phi }](https://wikimedia.org/api/rest_v1/media/math/render/svg/3a540725a8834facfdc76786932db303403f8347) | `\phi \varphi \Phi` |
| ![{\displaystyle \kappa K}](https://wikimedia.org/api/rest_v1/media/math/render/svg/8714fc0053e3bc115a8ab0e2e5044529a79541e8) | `\kappa K`                | ![{\displaystyle \chi X}](https://wikimedia.org/api/rest_v1/media/math/render/svg/49a711f6b26e350769bea7258cf6b50cf22f5c91) | `\chi X`            |
| ![{\displaystyle \lambda \Lambda \;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/cbf5521f6c5782d76a904953cc3ad1928ea8e615) | `\lambda \Lambda`         | ![{\displaystyle \psi \Psi }](https://wikimedia.org/api/rest_v1/media/math/render/svg/eeab56671924f9300f94dd188d0ab8d40d0d3d63) | `\psi \Psi`         |
| ![{\displaystyle \mu M}](https://wikimedia.org/api/rest_v1/media/math/render/svg/7cb72c559885487b695afaea0096ad43ac3323a1) | `\mu M`                   | ![{\displaystyle \omega \Omega }](https://wikimedia.org/api/rest_v1/media/math/render/svg/712b9bf23b1404718331d8f2a4deab1a7c3ca46c) | `\omega \Omega `    |

### Mathematical modes

| Renders       | LaTeX markup | Renders               | LaTeX markup |
| ------------- | ------------ | --------------------- | ------------ |
| $\sum$        | `\sum`       | $\prod$               | `\prob`      |
| $\sqrt[y]{X}$ | `\sqrt[y]`   | $\lim_{n \to \infty}$ | `\lim`       |
| $\int$        | `\int`       | $\oint$               | `\oint`      |
| $\sqrt{X}$    | `\sqrt`      | $\iiint$              | `\iiint`     |
| $\propto $    | `\propto `   | $\approx$             | `\approx`    |
| $\pmod{m}$    | `\pmod`      | $a \bmod b$           | `\bmod`      |

### Arrows

For saving space: $X$ is a substition of $array$ in following markup

| Renders                            | LaTeX markup               | Renders                                | LaTeX markup                 |
| ---------------------------------- | -------------------------- | -------------------------------------- | ---------------------------- |
| $\leftarrow\  \Leftarrow$          | `\left \Left arrow`        | $\rightarrow\ \Longrightarrow$         | ``\right \Longright arrow `` |
| $\uparrow \ \Uparrow$              | `\up \Up arrow`            | $\downarrow \ \Downarrow$              | `\down \Down arrow `         |
| $\updownarrow\ \Updownarrow$       | `\up \Up downarrow`        | $\leftrightarrow\ \Leftrightarrow\ $   | `\Left \left rightarray `    |
| $\rightleftharpoons$               | `\rightleftharpoons`       | $\mapsto$                              | `\mapsto`                    |
| $\nearrow\ \swarrow$               | `\ne/sw array`             | $\nwarrow\ \searrow$                   | `\nw/se array`               |
| $\leftharpoonup\  \rightharpoonup$ | `\left \right harpoonup  ` | $\leftharpoondown\  \rightharpoondown$ | `\left \right harpoondown`   |

### Miscellaneous symbols

| Renders                                                      | LaTeX markup   | Renders                                                      | LaTeX markup  |
| ------------------------------------------------------------ | -------------- | ------------------------------------------------------------ | ------------- |
| ![{\displaystyle \infty \;\;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/7e636ab1710fb09518c89fb6777597377fe79f0f) | `\infty`       | ![{\displaystyle \forall \;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/025c7b257d7948331271a151fe460cdce3c69167) | `\forall`     |
| ![{\displaystyle \Re }](https://wikimedia.org/api/rest_v1/media/math/render/svg/2cc5a2cb7aa22f6d765976edb1daebefaf408142) | `\Re`          | ![{\displaystyle \Im }](https://wikimedia.org/api/rest_v1/media/math/render/svg/d3e0312a4871a615cbdae168be102907f0a51e95) | `\Im`         |
| ![{\displaystyle \nabla }](https://wikimedia.org/api/rest_v1/media/math/render/svg/a3d0e93b78c50237f9ea83d027e4ebbdaef354b2) | `\nabla`       | ![{\displaystyle \exists }](https://wikimedia.org/api/rest_v1/media/math/render/svg/77ed842b6b90b2fdd825320cf8e5265fa937b583) | `\exists`     |
| ![{\displaystyle \partial }](https://wikimedia.org/api/rest_v1/media/math/render/svg/62b4e7c1cedb9564609aefd2aa2309972f455c24) | `\partial`     | ![{\displaystyle \nexists }](https://wikimedia.org/api/rest_v1/media/math/render/svg/105571be31b330ddf22ac965fc50efedfb59de7d) | `\nexists`    |
| ![{\displaystyle \emptyset }](https://wikimedia.org/api/rest_v1/media/math/render/svg/6af50205f42bb2ec3c666b7b847d2c7f96e464c7) | `\emptyset`    | ![{\displaystyle \varnothing \;}](https://wikimedia.org/api/rest_v1/media/math/render/svg/73f3c132d4a55444673503c4498310ea7cdd7df5) | `\varnothing` |
| ![{\displaystyle \wp }](https://wikimedia.org/api/rest_v1/media/math/render/svg/f4050ebf63686af152bf1ef5caabcdf2a2d812cf) | `\wp`          | ![{\displaystyle \complement }](https://wikimedia.org/api/rest_v1/media/math/render/svg/6b2479e2cdb7ce0c5be60408f111d2354369189f) | `\complement` |
| ![{\displaystyle \neg }](https://wikimedia.org/api/rest_v1/media/math/render/svg/fa78fd02085d39aa58c9e47a6d4033ce41e02fad) | `\neg`         | ![{\displaystyle \cdots }](https://wikimedia.org/api/rest_v1/media/math/render/svg/e1d67495288eac0fa90d5bbcad7d9a343c15ad56) | `\cdots`      |
| ![{\displaystyle \square }](https://wikimedia.org/api/rest_v1/media/math/render/svg/455831d58fa08f311b934d324adcff89a868b4e4) | `\square`      | ![{\displaystyle \surd }](https://wikimedia.org/api/rest_v1/media/math/render/svg/8a9d637675e4ee00572431a0e42fa556901a4ca8) | `\surd `      |
| ![{\displaystyle \blacksquare }](https://wikimedia.org/api/rest_v1/media/math/render/svg/8733090f2d787d03101c3e16dc3f6404f0e7dd4c) | `\blacksquare` | ![{\displaystyle \triangle }](https://wikimedia.org/api/rest_v1/media/math/render/svg/d909fe94e8277a4c44a50853cb7dbbf0fa3148ed) | `\triangle`   |

### Binary Operation/Relation Symbols

| Renders            | LaTeX markup     | Renders                | LaTeX markup          |
| ------------------ | ---------------- | ---------------------- | --------------------- |
| $\pm$              | `\pm`            | $\not >$               | `\not`                |
| $\times\ \div$     | `\times \div`    | $\cdot \circ \ast$     | `\cdot \circ \ast`    |
| $\cup\ \cap$       | `\cup \cap`      | $\subset\ \supset$     | `\subset \supset`     |
| $\leq\ \geq$       | `\leq \geq`      | $\ll\ \gg$             | `\ll \gg `            |
| $\in\ \notin$      | `\in \notin`     | $\perp\ \exists$       | `\perp \exists`       |
| $\oplus\ \otimes$  | `\oplus \otimes` | $\odot\ \ominus$       | `\bigodot \ominus`    |
| $\Box \ \boxtimes$ | `\Box \boxtimes` | $\wedge\ \vee$         | `\wedge\ \vee`        |
| $\equiv\ \neq$     | `\equiv \neq`    | $\because\ \therefore$ | `\because \therefore` |
| $\sim\ \approx$    | `\sim \approx`   | $\simeq\ \cong$        | `\simeq \cong`        |

### Brackets and Parentheses

| Type                        | LaTeX markup          | Renders as  |
| --------------------------- | --------------------- | ----------- |
| Parentheses; round brackets | `(x+y)`               | (*x*+*y*)   |
| Brackets; square brackets   | `[x+y]`               | [*x*+*y*]   |
| Braces; curly brackets      | `\{ x+y \}`           | {*x*+*y*}   |
| Angle brackets              | `\langle x+y \rangle` | ⟨*x*+*y*⟩   |
| Pipes; vertical bars        | `|x+y|`               | \|*x*+*y*\| |
| Double pipes                | `\|x+y\|`             | ∥*x*+*y*∥   |

- \left[ … \right]  
-  \left( … \right()
- \Bigg \langle … \bigg \rangle

$$
\left[  \frac{ N } { \left( \frac{L}{p} \right)  - (m+n) }  \right]\\
\left(  \frac{ N } { \left( \frac{L}{p} \right)  - (m+n) }  \right)\\
 \Bigg \langle 3x+7 \bigg \rangle
$$

![image-20220129110413636](https://ik.imagekit.io/haochen/Typora/image-20220129110413636.png)

![image-20220129110431210](https://ik.imagekit.io/haochen/Typora/image-20220129110431210.png)



$\partial x \differential x, \dd x \dv{f}{x} \pdv x \fdv{x} \functionalderivative x$

![https://i.stack.imgur.com/lLM3t.png](https://i.stack.imgur.com/lLM3t.png)
