---
layout:     post
title:      "Statistics MIT 18.6501x"
subtitle:   " \"STAT is Fun!\""
date:       2022-02-08 12:00:00
author:     "Calvchen"
header-img: "img/post-bg-infinity.jpg"
catalog: true
tags:
    - Math
    - Statistics
    - Course


---

> “Machine Learning, Deep Learning, Data Science, etc. are all in the same nexus – which is the bacically Probability plus Statistics. ”



# Statistics, MIT 18.6501x

A useful [book]( https://onlinestatbook.com/2/sampling_distributions/samp_dist_mean.html) and a [probability refer link](https://bookdown.org/probability/beta/r.html).

## Where will be covered:

- [Theorems and Tools](#Theorems and Tools)

  - [LLN](#Law of Large Numbers (LLN)) & [CLT](#Central Limit Theorem (CLT)), [CMT](#Continuous Mapping Theorem (CMT))
  - Hoeffding's Inequality, Chebyshev Inequality
  - [Slutsky's theorem](#Slutsky’s theorem)
  - Asymptotic normality
  - Delta ($\Delta$) method

- [Distribution Functions](#Distribution)

- Mode of Convergence

- Estimator

- Probability Redux

  



## Theorems and Tools

**i.i.d.**  stands for **independent and identically distributed** . 

**r.v.** denotes **random variable**

### Law of Large Numbers (LLN)

According to the law, the average of the results obtained from performing the same experiment a large number of times should be close to the **expectation value**, and tend to be closer when n is even greater.

Let $X, X_{1}, X_{2}, \ldots, X_{n}$ be i.i.d. 
Laws (weak and strong) of large numbers (LLN):

$$
\bar{X}_{n}:=\frac{1}{n} \sum_{i=1}^{n} X_{i} \underset{n \rightarrow \infty}{\stackrel{\text { P }, \text { a.s. }}{\longrightarrow}} \mu .
$$

### Central Limit Theorem (CLT)

CLT establishes that when independent random variables summed up, their properly normalized sum tends toward a **normal distribution** even if the original variables themselves are not normally distributed,


$$
\sqrt{n} \frac{\bar{X}_{n}-\mu}{\sigma} \underset{n \rightarrow \infty}{\xrightarrow{ {(d)}}} \mathcal{N}(0,1)
$$

where  $\stackrel{(d)}{\rightarrow}$ denotes convergence in distribution. 

Standard Gaussian means that this quantity will be a number between (-3, 3) with overwhelming probability, we have $\lvert \overline X_n - \mu\rvert =\frac{3\sigma}{\sqrt{n}}$. 

$\bar X_n$ is close to $\mu$ at some deviations that are of order 1 over square root of sample size  ($\sim \frac{1}{n}$).

**Rule of thumb to apply CLT** - normally, we require $n\geq30$.

**Asymptotic normality**

Assuming the sequence $\{X_{n}\}$ is an i.i.d sequence with finite mean and variance. Therefore, it satisfies the conditions of Central Limit Theorem. 

Hence, the sample mean $\bar X_{n}$ in the above equlity is asymptotically normal. In other words, the sample mean $X_{n}$ converges in distribution to a normal random variable with mean $\mu$ and variance $\large \frac{\sigma^{2}}{n}$.
$$
\sqrt(n)\left(\frac{\bar X_n-\mu}{\sigma}\right) \overset d\to Z
$$


### Continuous Mapping Theorem (CMT)

CMT states that continuous functions preserve limits even if their arguments are sequences of random variables. A continuous function $f(\cdot)$​ is such a function that maps convergent sequences into another convergent sequen,

$$
T_{n}  \underset{n \rightarrow \infty}{\xrightarrow{ {\text { a.s. } / \mathbf{P} /(d)}} }   T \Rightarrow f\left(T_{n}\right) \underset{n \rightarrow \infty}{\xrightarrow{\text { a.s. } / \mathbf{P} /(d)}} f(T)
$$

It applies to $d,\ p$ and $a.s.$ convergence respectively.

But how close is $f(T_n)$ to $f(T)$? The Delta ($\Delta$) method.

### Hoeffding's Inequality

What if $n$ is **not large enough** to apply CLT?

For bounded random variable, this is still **Hoeffding’s Inequality** we can say for any n.
Let $n$ be a positive integer and $X_i \in[a, b]\ $($a<b$ are given numbers)
Then this holds even for small sample sizes $n$:  

$$
\mathbb{P}\left[\left|\bar{X}_{n}-\mu\right| \geq \varepsilon\right] \leq 2 e^{\large-\frac{2 n \varepsilon^{2}}{(b-a)^{2}}} . \quad \forall \varepsilon>0
$$

Here I need that my random variables are actfually **almost surely bounded**, which rules out like Gaussians and Exponential Random Variables.

**How to choose $\varepsilon$ ?**

So let's parse this for a second… , if when $\varepsilon = \large\frac{c}{\sqrt{n}}$:


$$
X_i \overset{iid}{\sim}Ber(p)\\
\mathbb{P}(| \bar{X} - \mu| \geq \frac{c}{\sqrt{n}}) \leq 2e^{-2c^2/1}
$$

The square root of $n$ qualitative behavior happens at any n.

So the conclusion is the average is a good replacement

**Is this tight?** That's the annoying thing about inequalities.

The above inequality could actually be e to the minus exponential of n ($e^{-n}$), which could be much, much smaller than that, so it is loose.

### Chebyshev Inequality & Markov Inequality

These two inequalities guarentees that upper bounds on $\mathbf{P}(X \geq t)$ based on the mean and variance of $X$.

**Markov inequality**

For a random variable $X \geq 0$ with mean $\mu>0$, and any number $t>0$ :


$$
\mathbf{P}(X \geq t) \leq \frac{\mu}{t}
$$

Note that the Markov inequality is restricted to **non-negative random variables**.

**Chebyshev inequality**

For a random variable $X$ with (finite) mean $\mu$ and variance $\sigma^{2}$, and for any number $t>0$,  


$$
\mathbf{P}(|X-\mu| \geq t) \leq \frac{\sigma^{2}}{t^{2}}
$$

**Remark:**
When Markov inequality is applied to $(X-\mu)^{2}$, we obtain Chebyshev's inequality. Markov inequality is also used in the proof of Hoeffding's inequality.

**Triangle Inequality**
$$
|\alpha\ \pm\ \beta| \leq |\alpha| + |\beta|
$$


### Slutsky’s Theorem

Slutsky's Theorem will be our main tool for **convergence in distribution**.

Let $T_{n},U_{n}$​ be two sequences of r.v., such that:   
$$
T_{n} \stackrel{\text { (d)}}{\underset{n \rightarrow \infty}{\longrightarrow}} T \quad \text { and } \quad U_{n} \stackrel{\mathbf{P}}{\underset{n \rightarrow \infty}{\longrightarrow}} U
$$

Then,

- $T_{n}+U_{n} \stackrel{(d)}{\underset{n \rightarrow \infty}{\longrightarrow}} T+U$,
- $T_{n} U_{n} \stackrel{(d)}{\underset{n \rightarrow \infty}{\longrightarrow}} T U$
- If in addition, $u \neq 0$, then $\large \frac{T_{n}}{U_{n}} \stackrel{(d)}{\underset{n \rightarrow \infty}{\longrightarrow}} \frac{T}{U}$.

### Delta ($\Delta$) method

https://en.wikipedia.org/wiki/Delta_method

##  Distribution

Discrete: Probability mass function

- Bernoulli, Uniform, Binomial, Geometric

### Gaussian Distribution

Notation: $X\sim\mathcal{N}(\mu, \sigma^2) $

Mean and Variance: $\mu,\ \sigma^2$

Probability Density Function: 


$$
\frac{1}{\sigma\sqrt{2\pi}}e^{-\frac{1}{2}\left( \frac{x-\mu}{\sigma}  \right)^2}
$$

<img src="https://chqwer2.github.io/img/Typora/image-20220205100840395.png" alt="image-20220205100840395" style="zoom:67%;" />

**Cumulative Distribution Function:**

$$
\Phi(x) = \mathbb P(X\leq x) = \frac{1}{2}\left[1+ \text{erf} \left(  \frac{x-\mu}{\sqrt{2}\sigma }\right)\right]
$$

$\text{erf}(\cdot)$ is the exponential response formula.

<img src="https://chqwer2.github.io/img/Typora/image-20220205100857657.png" alt="image-20220205100857657" style="zoom:67%;" />

**Why we use Gaussian Distribution so frequently?**

Normally, we use sample mean as our estimator. And the reason is because the Gaussian distribution is the thing that shows up as the limit of the CLT as the minute you start talking about averages.

Of the universe type of results, that says that if you take average of enough things, then it's going to go to a Gaussian.

**The extreme value?**

The value field of a Gaussian is $(-\infty, \infty)$, but when we use it in mapping real distribution, namely the height, we will never achieve negative value, why we do Gaussian?

Yes, there exists extreme value, but they never really come into play. Because of the exponential can get really, really small. The Gaussian actually almost in a bounded interval.

**Gaussian Probability Tables**

A Gaussian CDF (z-score) [calculator](https://www.calculator.net/z-score-calculator.html?c1raw=400&c1mean=-33.33&c1sd=58.92556&calctype=zscore&x=99&y=20).

![image-20220219230424092](https://chqwer2.github.io/img/Typora/image-20220219230424092.png)

**Quantiles**

| $\alpha$   | 2.5% | 5%   | 10%  |
| ---------- | ---- | ---- | ---- |
| $q_\alpha$ | 1.96 | 1.65 | 1.28 |



### Poisson Distribution

The advantage of using poisson distribution is that n or p do not need to be known! This can make assumptions much easier.

Notation: $X\sim\text{Poi}(\lambda),\ \lambda \in (0, \infty)$

Mean and Variance: $\lambda,\ \lambda$:  

$$
E(X^2) = Var(X) + E(x)^2 =  \lambda + \lambda^2
$$


![image-20220206111006698](https://chqwer2.github.io/img/Typora/image-20220206111006698.png)

Pre-require 0! = 1

**Probability Mass Function:**   

$$
\mathbb{P}(x=k) = \frac{\lambda^k}{k!} e^{-\lambda}, \ k=0,1,2,\cdots \\
$$

<img src="https://chqwer2.github.io/img/Typora/image-20220205102615493.png" alt="image-20220205102615493" style="zoom:50%;" />

**Cumulative distribution function:**

<img src="https://chqwer2.github.io/img/Typora/image-20220205102652730.png" alt="image-20220205102652730" style="zoom:50%;" />

### Exponential Distribution

sample space:  $x\in [0, \infty)$

Mean and Variance: $\large \frac{1}{\lambda},\frac{1}{\lambda^2} $

**Probability Mass Function:**   

$$
\lambda e^{-\lambda x}
$$
![pdf](https://upload.wikimedia.org/wikipedia/commons/0/02/Exponential_probability_density.svg)

**Cumulative distribution function:**  

$$
1-e^{-\lambda x}
$$
![cdf](https://upload.wikimedia.org/wikipedia/commons/b/ba/Exponential_cdf.svg)

<img src="https://chqwer2.github.io/img/Typora/image-20220205172337486.png" alt="image-20220205172337486" style="zoom: 50%;" />

<img src="https://chqwer2.github.io/img/Typora/image-20220205172726369.png" alt="image-20220205172726369" style="zoom: 50%;" />







### Gamma Distribution

Notation: $X\sim\text{Gamma}(\alpha,\beta)\text{ or } \Gamma(\alpha, \lambda) ,\lambda = \large \frac{1}{\beta} $

Parameters: $\alpha, \lambda \in (0,\infty)$

Mean and Variance: $\large \frac{\alpha}{\lambda},\ \frac{\alpha}{\lambda^2}$

**Gamma Function:**  

$$
\Gamma(s) = \int^\infty_0x^{s-1}e^{-x}dx
$$

$$
\left\{\begin{array}{ll}
\Gamma(\alpha)=(\alpha-1) ! & \text { if } \alpha \text { is } \mathbb{Z}^{+} \\
\Gamma(\alpha)=(\alpha-1) \Gamma(\alpha-1) & \text { if } \alpha \text { is } \mathbb{R}^{+} \\
\Gamma\left(\frac{1}{2}\right)=\sqrt{\pi} &
\end{array}\right.
$$

**Probability Mass Function:**   

$$
f(x)=\frac{x^{(\alpha-1)} \lambda^{\alpha} e^{(-\lambda x)}}{\Gamma(\alpha)}=\frac{x^{(\alpha-1)} e^{\left(-\frac{1}{\beta} x\right)}}{\beta^{\alpha} \Gamma(\alpha)}, \mathrm{x}>0
$$



<img src="https://upload.wikimedia.org/wikipedia/commons/f/fc/Gamma_distribution_pdf.png" alt="https://upload.wikimedia.org/wikipedia/commons/f/fc/Gamma_distribution_pdf.png" style="zoom:50%;" />

**Cumulative distribution function: ** 

$$
{\frac {\gamma (\alpha,\lambda x )}{\Gamma (\alpha)}}\,\!
$$

<img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Gamma_distribution_cdf.png" alt="https://upload.wikimedia.org/wikipedia/commons/a/a9/Gamma_distribution_cdf.png" style="zoom:50%;" />

![image-20220217094728373](https://chqwer2.github.io/img/Typora/image-20220217094728373.png)

### Geometric Distribution

Such as : number of trials until a success

Geometric Distribution is either one of below two distribution:

- The probability distribution of the number $X$ of Bernoulli trials needed to get one success, supported on the set $\{1,2,3, \ldots\}$;
- The probability distribution of the number $Y=X-1$ of failures before the first success, supported on the set $\{0,1,2, \ldots\}$.



Notation: $X\sim\text{Gemo}(p)\ \text{ or }\ Y\sim\text{Gemo}(p)$

Mean and Variance: $\large \frac{1}{p} \small\text{ or }\large \frac{1-p}{p} ,\ \frac{1-p}{p^2}$

**Probability Mass Function:**   

$$
(1-p)^{k-1}p\ \text{ or }\ (1-p)^{k}p
$$

![Geometric pmf.svg](https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Geometric_pmf.svg/1024px-Geometric_pmf.svg.png)

**Cumulative distribution function:**    

$$
1-(1-p)^k\ \text{ or }\  1-(1-p)^{k+1}
$$


![img](https://upload.wikimedia.org/wikipedia/commons/6/6f/Geometric_cdf.svg)

![image-20220228105357946](C:\Users\calvchen\PycharmProjects\chqwer2.github.io\_posts\Math\image-20220228105357946.png)

### Binomial Distribution

Notation: $B(n,p)$, n is number of trials and p is success probability of each trial

**Mean and Variance:** $np$, $\sum^n_{k=1} \sigma^2 = np(1-p)$

**Probability Mass Function:**    

$$
P(k)= \left(\begin{array}{l}

n \\
k
\end{array}\right) p^{k} q^{n-k}=\frac{n!}{k!(n-k)!}p^{k} q^{n-k}
$$

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Binomial_distribution_pmf.svg/300px-Binomial_distribution_pmf.svg.png" alt="Probability mass function for the binomial distribution" style="zoom:100%;" />

**Cumulative Distribution Function:**  

$$
I_{q}(n-k, 1+k)
$$

<img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Binomial_distribution_cdf.svg/300px-Binomial_distribution_cdf.svg.png" alt="Cumulative distribution function for the binomial distribution" style="zoom:100%;" />

In other words, there are a finite amount of events in a binomial distribution, but an infinite number in a normal distribution.

### Bernoulli Distribution

Notation: $X\sim Ber(p)$

Mean and Variance: $p$, $p(1-p)$ 

PMF pmfs

![{\displaystyle p^{k}(1-p)^{1-k}}](https://wikimedia.org/api/rest_v1/media/math/render/svg/834d4502075ca9a13696f56681b53edfa0cf2a6e)



### Indicator Function

The indicator function of a subset $A$ of a set $X$ is a function
$$
{\mathbf{1}}_{A}: X \rightarrow\{0,1\}
$$
defined as
$$
\mathbf{1}_{A}(x):=\left\{\begin{array}{ll}
1 & \text { if } x \in A \\
0 & \text { if } x \notin A
\end{array}\right.
$$
**Derivative of indicator function**

I have an indicator function $I(D\leq Q)$,

$$
\pdv DI(D\leq Q) = -\delta(D-Q)
$$
*δ* is symmetric.  *δ* can be thought of as the derivative of the Heaviside function *H*(*x*)=1 for *x*>0, 0 for *x*<0. 

### Moment Generation Function (MGF)

https://en.wikipedia.org/wiki/Moment-generating_function



expectation of moment generating function

![image-20220209101247516](https://chqwer2.github.io/img/Typora/image-20220209101247516.png)

![image-20220209101551026](https://chqwer2.github.io/img/Typora/image-20220209101551026.png)

https://online.stat.psu.edu/stat414/book/export/html/676

![image-20220209101722845](https://chqwer2.github.io/img/Typora/image-20220209101722845.png)

[mixture distribution moment generating function](https://math.stackexchange.com/questions/2051583/mixture-distribution-moment-generating-function)

Useful…

https://www.google.com/url?sa=t&rct=j&q=&esrc=s&source=web&cd=&ved=2ahUKEwitz--mtvL1AhXeQEEAHSmoAI8QFnoECDwQAQ&url=https%3A%2F%2Fwww.le.ac.uk%2Fusers%2Fdsgp1%2FCOURSES%2FMATHSTAT%2F6normgf.pdf&usg=AOvVaw3QHSFjpCFrBgTFBxRwGAnK---





### Property of Distribution

We take Gaussian $X\sim\mathcal N(\mu, \sigma^2)$as an example.

**Affine Transformation:**  

$$
\alpha \cdot X + \beta \sim\mathcal N(\alpha\mu + \beta, \alpha^2\sigma^2)
$$

**Standardization:**

According to CLT, we assume $Z = \frac{X-\mu}{\sigma}$,   

$$
\mathbb P(u<X<v) = \mathbb P(\frac{u-\mu}{\sigma}<Z<\frac{v-\mu}{\sigma})
$$

**Symmetry:**  

$$
\mathbb P(|X|>x) = \mathbb P(X>x) + \mathbb P(-X>x)=2\mathbb P(X>x)
$$

## Mode of Convergence

Three types of convergence, going from strong to weak.
- $\left(T_{n}\right)_{n \geq 1}$ is a sequence of random variables
- $T$ is a random variable ( $T$ may be deterministic).
- Some examples are shown [here]

### Almost surely (a.s.) convergence

So I created two sequences, and I want this to converge.   

$$
T_{n} \underset{n \rightarrow \infty}{
\overset{\text{ a.s. }}{\longrightarrow} } T \quad \text { iff } \quad \mathbb{P}\left[\left\{\omega: T_{n}(\omega) \underset{n \rightarrow \infty}{\longrightarrow} T(\omega)\right\}\right]=1
$$

### Convergence in probability

The probability that they depart from each other by something is going to be going to 0 as $n$  goes to infinity.  

$$
T_{n} \underset{n \rightarrow \infty}{\stackrel{\mathbb{P}}{\longrightarrow}} T \quad \text { iff } \quad \mathbb{P}\left[\left|T_{n}-T\right| \geq \varepsilon\right] \underset{n \rightarrow \infty}{\longrightarrow} \mathcal{O}, \quad \forall \varepsilon>0 .
$$

### Convergence in distribution

This just saying I'm going to measure something about this random variable, maybe it is distribution. For all continuous and bounded function $f$, using **CLT**:  
$$
T_{n} \stackrel{(d)}{n \rightarrow \infty} T \quad \text { iff } \quad \mathbb{E}\left[f\left(T_{n}\right)\right] \underset{n \rightarrow \infty}{\longrightarrow} \mathbb{E}[f(T)]
$$

I'm just saying that its distribution is converging. My random variable is going to become  the same as the probabilities for the second guy as $n$ goes to infinity.

### Properties

- If $\left(T_{n}\right)_{n \geq 1}$ converges **a.s.**, then it also converges in **probability**, and the two limits are equal a.s.

- If $\left(T_{n}\right)_{n \geq 1}$ converges in **probability**, then it also converges in **distribution**

Convergence in distribution implies convergence of probabilities if the limit has a density (e.g. Gaussian):  
$$
T_{n} \underset{n \rightarrow \infty}{\stackrel{(d)}{\longrightarrow}} T \quad \Rightarrow \quad \mathbb{P}\left(a \leq T_{n} \leq b\right) \underset{n \rightarrow \infty}{\longrightarrow} \mathbb{P}(a \leq T \leq b)
$$

**Addition, Multiplication and Division**
Assume,  
$$
T_{n} \stackrel{\text { a.s. } / \mathbf{P}}{\underset{n \rightarrow \infty}{\longrightarrow}} T \quad \text { and } \quad U_{n} \stackrel{\text { a.s. } / \mathbf{P}}{\underset{n \rightarrow \infty}{\longrightarrow}} U
$$

Then,  

- $T_{n}+U_{n} \stackrel{\text { a.s./P }}{\underset{n \rightarrow \infty}{\longrightarrow}} T+U$,

- $T_{n} U_{n} \stackrel{\text { a.s. } / \mathrm{P}}{\underset{n \rightarrow \infty}{\longrightarrow}} T U$,
- If in addition, $U \neq 0$ a.s., then $\large\frac{T_{n}}{U_{n}} \stackrel{\text { a.s. } / \mathbf{P}}{\longrightarrow} \frac{T}{U \rightarrow \infty}$.

Warning: In general, these rules do not apply to convergence in distribution $(d)$.



## Estimator

Normally, we have two estimator:

- Compute the expectation of your random variable
- Using Delta method

How can we decide how many samples ($n$) we need to draw our conclusion? **What is the cutoff**, namely if 60 is enough, how about 59 and 58?

Now we have our first estimator of $p$ of *Kissing Example*, we put a hat on everything that’s the estimator of something.

- For $i=1, \ldots, n$, define $R\sim Ber(p)$, $R_{i}= 1$ if the $i$ th couple turns to the right RIGHT, $R_{i}=0$ otherwise.

- Our first estimator of $p$ is the sample averge:  

$$
\hat{p}=\overline{R_{n}}=\frac{1}{n} \sum^{n} R_{i}
$$

And averages of random variables are essentially controlled by two major tools: They are LLN and CLT.

**What is the accuracy of this estimator?**

**What is the probability that $\hat p$ is away from $p$ by more than 10%.**

We don’t even know the trueandard and the observation $\hat{p}$ is from random variables fluctuates. We need a method to measure its fluctuation.

Modelling Assumptions:

- Each r.v. and i.i.d $R_i$ is Bernoulli (p) 
- 

### Measures of Distance

If we want to estimate **mean** of a Gaussian and we can compute the expectation, but not it doesn’t work for the the variance.

You can go into example and compute the variance, which is actually coming from the method of moments.

But it turns our we have a much more powerful method called the maximum likelihood method, but it is far non-trivial.

