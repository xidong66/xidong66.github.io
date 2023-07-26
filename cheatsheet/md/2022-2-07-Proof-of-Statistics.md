---
layout:     post
title:      "Statistics Theoretical Derivation, MIT 18.6501x"
subtitle:   " \"Welcome to the derivation of STAT Functions!\""
date:       2022-02-08 12:00:00
author:     "Calvin Chen"
header-img: "img/post-bg-universe.jpg"
catalog: true
tags:
    - Math
    - Statistics
    - Course

---

> “Statistics is not perfect, but it is beautiful and exquisite! ”

# Theoretical Derivation

This post is heavily focused on the mathematical proof and theoretical derivation, which doesn’t be discussed much in the *“Statistics”* Post. 

Will be an appendix of it.

## Gaussian Distribution

Normally, we have Gaussian Distribution: $$X\sim\mathcal{N}(\mu, \sigma^2)$$.



We can now have $(X-\mu)\sim\mathcal{N}(0, \sigma^2)$, which is symmetric odd-function. 



As for the properties of **PDF** and **CDF**, we have:


$$
\int_{-\infty}^{\infty} \frac{1}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x=1\\

\int_{-\infty}^{\infty} \frac{x-\mu}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x=0
$$

### Gaussian Probability Tables and Quantiles



### Means of Gaussians

**For** $\mathbb E[x] = \mu$,


$$
\begin{aligned}
\mathbb  E(x) &=\int_{-\infty}^{+\infty} x f(x) d x=\int_{-\infty}^{+\infty} \frac{x}{\sqrt{2 \pi} \delta} e^{-\frac{(x-\mu)^{2}}{2 \delta^{2}}} d x \\

&=\int_{-\infty}^{+\infty} \frac{(x - \mu) + \mu}{\sqrt{2 \pi} \delta} e^{-\frac{(x-\mu)^{2}}{2 \delta^{2}}} d x \\

&=\underbrace{\int_{-\infty}^{+\infty} \frac{x-\mu}{\sqrt{2 \pi} \delta} e^{-\frac{(x-\mu)^{2}}{2 \delta^{2}}} d x}_{0}+ \mu \underbrace{\int_{-\infty}^{+\infty} \frac{1}{\sqrt{2 \pi} \delta} e^{-\frac{(x-\mu)^{2}}{2 \delta^{2}}} d x}_{1} \\
&=\mu
\end{aligned}
$$



**For** $\mathbb E[x^2] = \sigma^2 +\mu^2$,


$$
\begin{array}{l}
\mathbb E(x^{2})=\int_{-\infty}^{\infty} x^{2} \cdot \frac{1}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x=\int_{-\infty}^{\infty} \frac{(x+\mu)(x-\mu)+\mu^{2}}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x \\
=\int_{-\infty}^{\infty} \frac{(x+\mu)(x-\mu)}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x+\int_{-\infty}^{\infty} \frac{\mu^{2}}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x \\
=\int_{-\infty}^{\infty} \frac{-\sigma(x+\mu)}{\sqrt{2 \pi}} d\left(e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}}\right)+\mu^{2} \\
=\underbrace{\left(\frac{-\sigma(x+\mu)}{\sqrt{2 \pi}} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}}\right)^{\infty}}_0+\sigma^2\int_{-\infty}^{\infty} \frac{1}{\sigma\sqrt{2 \pi}} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x+\mu^{2}\\
=\sigma^{2}+\mu^{2} \\
\end{array}
$$



**For** $\mathbb E[x^3] = 3\mu\sigma^2 +\mu^3$,

Patch up $x^3$ into $(x-\mu)^3$,


$$
x^3 = (x-\mu)^3 + \mu^3+3\mu x^2 - 3x\mu^2
$$


So we have, substitutes with $\mathbb E[x^2]$ and $\mathbb E[x]$ formulas:


$$
\begin{array}{l}
\mathbb E\left(x^{3}\right)=\int_{-\infty}^{\infty} x^{3} \cdot \frac{1}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x=\int_{-\infty}^{\infty} \frac{(x-\mu)^3 + \mu^3+3\mu x^2 - 3x\mu^2}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x \\
=\underbrace{\int_{-\infty}^{\infty} \frac{(x-\mu)^3}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x}_{0}+
\int_{-\infty}^{\infty} \frac{3(\mu x^2-x\mu^{2})}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x + \mu^3\\
=\small 0 + 3(\mu E(x^{2}) - \mu^2E(x)) +\mu^3\\
= \small 3\mu\sigma^2 +\mu^3
\end{array}
$$

**For** $\mathbb E[x^4] = 3\sigma^4 +6\mu^2\sigma^2 + \mu^4$,

Patch up $x^4$,


$$
x^4 = (x^2 + \mu^2)(x+\mu)(x-\mu) + \mu^4
$$


So we have,


$$
\begin{array}{l}
\mathbb E\left(x^{4}\right)=\int_{-\infty}^{\infty} x^{4} \cdot \frac{1}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x=\int_{-\infty}^{\infty} 

\frac{(x^2 + \mu^2)(x+\mu)(x-\mu)}{\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d x  + \mu^4 \\

= \int_{-\infty}^{\infty} \frac{(x^2 + \mu^2)(x+\mu)}{2\sqrt{2 \pi} \sigma} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d (x-\mu)^2  + \mu^4 \\

= -\int_{-\infty}^{\infty} \frac{\sigma(x^2 + \mu^2)(x+\mu)}{\sqrt{2 \pi}} d e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}}  + \mu^4 \\

=\underbrace{\left(- \frac{\sigma(x^2 + \mu^2)(x+\mu)}{\sqrt{2 \pi} } e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} \right)^{\infty}}_{0} +  \int_{-\infty}^{\infty} e^{-\frac{(x-\mu)^{2}}{2 \sigma^{2}}} d \frac{(x^2 + \mu^2)(x+\mu)}{2\sqrt{2 \pi} \sigma}  + \mu^4\\ 

=\small 0 + \sigma^2(3*E(x^{2}) +2 \mu E(x) +\mu^2)  + \mu^4 \\
= \small 3\sigma^4 +6\mu^2\sigma^2 + \mu^4

\end{array}
$$

**For** $\mathbb E[\bar{X}_{n}] = \mathbb{E}[X_{1}]$,
$$
\mathbb{E}\left[\bar{X}_{n}\right]=\frac{1}{n} \sum_{i=1}^{n} \mathbb{E}\left[X_{i}\right]=\mathbb{E}\left[X_{1}\right]
$$
![[eq2]](https://www.statlect.com/images/mean-estimation__10.png)

**For** $\mathbb E[XY]$,

The expectation of the product of X and Y is the product of the individual expectations: **E(XY ) = E(X)E(Y )**. 



### Variance of Gaussians

**For** $\mathbb V[x] = \sigma^2$,

With integral formulas step by step, we can get:


$$
\begin{aligned}
V &=\int_{-\infty}^{+\infty} \frac{1}{\sqrt{2 \pi} \delta} e^{-\frac{(x-u)^{2}}{2 \delta^{2}}}(x-u)^{2} d x \\
&=\int_{-\infty}^{+\infty} \frac{1}{\sqrt{2 \pi} \delta} e^{-\frac{x^{2}}{2 \delta^{2}}} x^{2} d x \\
&=-\frac{\delta}{\sqrt{2 \pi}} \int_{-\infty}^{+\infty} x d\left(e^{-\frac{x^{2}}{2 \delta^{2}}}\right) \\
&=-\frac{\delta}{\sqrt{2 \pi}}(\underbrace{\left.x e^{-\frac{x^{2}}{2 \delta^{2}}}\right|_{-\infty} ^{+\infty}}-\int_{-\infty}^{+\infty} e^{-\frac{x^{2}}{2 \delta^{2}}} d x) \\
&=\frac{\delta}{\sqrt{2 \pi}} \int_{-\infty}^{+\infty} e^{-\frac{x^{2}}{2 \delta^{2}}} d x \\
&=\delta^{2}
\end{aligned}
$$



Which can be simplified with expectation substitutions we concluded above:



$$
\begin{aligned}
V(x) &=E\left((x-E(x))^{2}\right) \\
&=E\left(x^{2}-2 x E(x)+E^{2}(x)\right) \\
&=E\left(x^{2}\right)-2 E(x) E(x)+E^{2}(x) \\
&=E\left(x^{2}\right)-E^{2}(x) \\
&=E\left(x^{2}\right)-\mu^{2} \\
&=\sigma^2
\end{aligned}


\\
$$



**For** $\mathbb V[x^2] = 2\sigma^4+4\sigma^2\mu^2$,

$$
\begin{aligned}
V(x^2) &=E(x^{4})-E(x^2)^{2} \\
&=3\sigma^4 +6\mu^2\sigma^2 + \mu^4 - (\sigma^2 + \mu^2)^2\\
&=2\sigma^4+4\sigma^2\mu^2
\end{aligned}


\\4
$$



$V(\bar X_n)=\large\frac{\sigma^2}{n}$

![[eq3]](https://www.statlect.com/images/mean-estimation__14.png)

Var(XY)

![image-20220301113018384](C:\Users\calvchen\PycharmProjects\chqwer2.github.io\_posts\Math\image-20220301113018384.png)

![image-20220301113212523](C:\Users\calvchen\PycharmProjects\chqwer2.github.io\_posts\Math\image-20220301113212523.png)

![image-20220329155656760](https://ik.imagekit.io/haochen/Typora/image-20220329155656760.png)

### Covariance

Normally, we have standard covariance formula between variable $x$ and $y$,


$$
\text{Cov}(x,y) = E\left[\ (x-E[x])\ (y-E[y])\ \right]
$$


![image-20220205160543840](https://chqwer2.github.io/img/Typora/image-20220205160543840.png)

![image-20220213171530998](https://chqwer2.github.io/img/Typora/image-20220213171530998.png)

[pdf](file:///C:/Users/calvchen/Downloads/408jointdiscrete(1).pdf)

You should have something like:
$$
\begin{array}{c}
E\left(|X-Y|^{a}\right)=\iint_{x>y}(x-y)^{a} d x d y+ \\
\iint_{y>x}(y-x)^{a} d x d y=2 \iint_{x>y}(x-y)^{a} d x d y
\end{array}
$$
Now:
$$
\begin{array}{c}
\iint_{x>y}(x-y)^{a} d x d y=\int_{y=0}^{1} \int_{x=y}^{1}(x-y)^{a} d x d y \\
=\frac{1}{(a+1)(a+2)}
\end{array}
$$

So:

$$
\begin{array}{c}
E\left(|X-Y|^{a}\right)=2 \iint_{x>y}(x-y)^{a} d x d y \\
=\frac{2}{(a+1)(a+2)}
\end{array}
$$

##### Covariance of Gaussians

Recall that the **covariance** of two random variables $X$ and $Y$ denoted by $\text{Cov} (X,Y)$ is defined as:
$$
\text{Cov} (X,Y) = \text E[\ (X-\text E[X])\ (Y-\text E[Y])\ ]\\
\text{Cov} (X,Y) = \text E[XY]\cdot\text E[X]\text E[Y])\ ]
$$


 **Var[X+Y] = Var[X] + Var[Y] + 2∙Cov[X,Y]** 

$$
\begin{aligned}
\operatorname{Var}(X Y) &=\operatorname{Var}[\mathrm{E}(X Y \mid X)]+\mathrm{E}[\operatorname{Var}(X Y \mid X)] \\
&=\operatorname{Var}[X \mathrm{E}(Y \mid X)]+E\left[X^{2} \operatorname{Var}(Y \mid X)\right] \\
&=\operatorname{Var}[X \mathrm{E}(Y)]+E\left[X^{2} \operatorname{Var}(Y)\right] \\
&=E(Y)^{2} \operatorname{Var}(X)+\operatorname{Var}(Y) E\left(X^{2}\right)
\end{aligned}
$$


If the covariance between two random variables is 0, then they are independent?

False, the criterion for **independence** is $F(x,y)=F_X(x)F_Y(y)$

**variance of ln function**

![image-20220216223016542](https://chqwer2.github.io/img/Typora/image-20220216223016542.png)

**Var[X] is known, how to calculate Var[$\frac{1}{x}$]:**

Using Delta Method,

You can use [Taylor series](https://en.wikipedia.org/wiki/Taylor_expansions_for_the_moments_of_functions_of_random_variables) to get an approximation of the low order  moments of a transformed random variable. If the distribution is fairly  'tight' around the mean (in a particular sense), the approximation can  be pretty good.
$$
g(X)=g(μ)+(X−μ)g′(μ)+(X−μ)22g′′(μ)+…
$$
SO
$$
\begin{aligned}
\operatorname{Var}[g(X)]=& \operatorname{Var}\left[g(\mu)+(X-\mu) g^{\prime}(\mu)+\frac{(X-\mu)^{2}}{2} g^{\prime \prime}(\mu)+\ldots\right] \\
=& \operatorname{Var}\left[(X-\mu) g^{\prime}(\mu)+\frac{(X-\mu)^{2}}{2} g^{\prime \prime}(\mu)+\ldots\right] \\
=& g^{\prime}(\mu)^{2} \operatorname{Var}[(X-\mu)]+2 g^{\prime}(\mu) \operatorname{Cov}\left[(X-\mu), \frac{(X-\mu)^{2}}{2} g^{\prime \prime}(\mu)+\ldots\right] \\
&+\operatorname{Var}\left[\frac{(X-\mu)^{2}}{2} g^{\prime \prime}(\mu)+\ldots\right]
\end{aligned}
$$
often only the first term is taken
$$
\operatorname{Var}[g(X)] \approx g^{\prime}(\mu)^{2} \operatorname{Var}(X)
$$
In this case (assuming I didn't make a mistake), with $g(X)=\frac{1}{X}, \operatorname{Var}\left[\frac{1}{X}\right] \approx \frac{1}{\mu^{4}} \operatorname{Var}(X)$.



### The Property of Maximum

Given the IID r.v. $X\sim \text{Uni}(0,1)$, we have $M_n=\max(x_1,\cdots,x_n)$,

Then, because $X_n$ are i.i.d. :

$$
P(M_n<t) = P(\cap^n_{i=1}\{x_i \leq t \})=\prod^n_{i=q}P(x_i \leq t)  \longrightarrow F_X(t)^n 
$$

where$F_X(\cdot)$ is the CDF of distribution.

$$
\begin{aligned}
P\left(n\left(1-M_{n}\right) \leq t\right) &={P}\left(1-M_{n} \leq \frac{t}{n}\right)\\
&={P}\left(M_{n} \geq 1-\frac{t}{n}\right) \\
&=1-{P}\left(M_{n}<1-\frac{t}{n}\right)\\
&=1-\left(1-\frac{t}{n}\right)^{n} \stackrel{n \rightarrow \infty}{\longrightarrow} 1-\mathbf{e}^{-t} .
\end{aligned}
$$


### Limitations

for  anyconstant $c$:  
$$
\lim_{n\to\infin}\left( 1-\frac{c}{n} \right)^n \to e^{-c}
$$



$$
\sum^\infin_{i=1}\alpha^i=\frac{\alpha}{1-\alpha}, iff\ |\alpha|<1
$$

*Food for thought:*



[What is the variance of the maximum of a sample?](https://stats.stackexchange.com/questions/15970/what-is-the-variance-of-the-maximum-of-a-sample)



##### Maximum of uniform random variables

$M_n$

b = - (2*barX_n + 1.6448^2/n) 

(2*barX_n + 1.6448^2/n + sqrt((2*barX_n + 1.6448^2/n) &2-4*barX_n^2) )/2

### Mode of Convergence Examples

**Example of a.s.** 

Let $U\sim \text{Uni}(0,1)$, $X_n = U + U^n$ (raised to the power of $n$)

Claim: $X_n\overset{\text{a.s}} \longrightarrow U$

Proof:

With law of total probability, for any event $A$,  
$$
P(A)=P\left(A \mid S_{1}\right) P\left(S_{1}\right)+P\left(A \mid S_{2}\right) P\left(S_{2}\right)
$$

$$
\left\{\begin{array}{ll}
X_n \underset{n \rightarrow \infty}{\longrightarrow} U   & \text { if } U\in(0,1) \\
X_n \underset{n \rightarrow \infty}{\longrightarrow} 2  & \text { if } U=1
\end{array}\right.
$$

So we have  
$$
P(X_n \underset{n \rightarrow \infty}{\longrightarrow} U )=P(X_n \longrightarrow U ) P(U<1) +0 = 1
$$

**Example 1 of $\mathbb P$ ,**

Let $X_n \overset{iid}\sim Ber(\frac{1}{n})$ and $\epsilon \in (0,1)$, we have   
$$
\mathbb P(X_n>\epsilon)=\mathbb P(X_n=1)=\frac{1}{n}\underset{n\to\infty}\longrightarrow 0
$$

**Example 2 of $\mathbb P$ ,**

Let $U\sim \text{Uni}(0,1)$, $X_i = \min X_i$ 

Claim:$X_{(1)} \stackrel{p}{\rightarrow} O$,

**Proof:**

Fix $\varepsilon>0$,  
$$
\begin{aligned}
P\left(\left|X_{(1)}-0\right|>\varepsilon\right) &=P\left(X_{(1)}>\varepsilon\right) \\
&=P\left(X_{i}>\varepsilon, \forall i\right) \\
&=\left(P\left(X_{1}>\varepsilon\right)\right)^{n} \\
&=\left(S_{\varepsilon}^{1} \mid  d x\right)^{n} \\
&=(1-\varepsilon)^{n} \underset{n \rightarrow \infty}{\rightarrow} 0
\end{aligned}
$$

**Example of complying $\mathbb P$ but not with a.s.**

Let $U\sim \text{Uni}(0,1)$, $x$ is more and more subdivided segmentation functions between [0, 1]:
$$
\require{cancel}
\require{enclose}
\begin{array}{l}
x_{1}=U+\mathbb{1}(U \in[0,1])=U+1 \\
x_{2}=U+\mathbb 1\left(U \in\left[0, 1/2\right]\right) \\
x_{3}=U+\mathbb{1}(U \in[1 / 2,1]) \\
x_{4}=U+\mathbb1(U \in[0,1 / 3]) \\
x_{5}=U+\mathbb{1}(U \in[1 / 3,2 / 3]) \\
x_{6}=U+\mathbb{1}(U \in[2 / 3,1])
\end{array}
$$
Claim 1: $x_{n} \stackrel{p}{\rightarrow} U: \text{Fix}\  0<\varepsilon<1$
$$
\begin{array}{l}
P\left(\left|x_{n}-U\right|>\varepsilon \right)&=P\left(U \in\left[a_{n}, b_{n}\right]\right)\\
&=b_n - a_n \underset{n \rightarrow \infty}{\rightarrow} 0
\end{array}
$$
Claim 2: $x_{n}  \enclose{downdiagonalstrike} {\stackrel{\text{a.s.}}{\rightarrow}} U$:
$$
P\left(x_{n} \rightarrow x\right) \neq 1 \text {, } x_{n} {\text { has not limis}}
$$
Quadratic equation

![image-20220307210646804](https://chqwer2.github.io/img/Typora/image-20220307210646804.png)
