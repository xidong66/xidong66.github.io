---
layout:     post
title:      "Probability - MIT 18.6501x"
subtitle:   " \"Probability is art of math!\""
date:       2022-02-08 12:00:00
author:     "Calvchen"
header-img: "img/post-bg-infinity.jpg"
catalog: true
tags:
    - Math
    - Statistics
    - Course

---

> “Machine Learning, Deep Learning, Data Science, etc. are all in the same nexus – which is the basically Probability plus Statistics. ”



# Probability - The Science of Uncertainty and Data

Let’s fact it: life is uncertain. But one thing is certain: We need a way to make predictions and make decisions under uncertainty.



## Where will be covered?

- [Basic Probability](#Basic probability)
- Conditional Probability
- [Probability Tools](#Probability Tools)
  - [De Morgon’s Laws](#De Morgon’s Laws)

- Bonferroni's inequality
- Discrete random variables
- Continuous random variables
- Further topics
- Bayesian inference
- Limit theorems and statistics
- Random arrival processes
- Markov chains



## Basic probability

### Sample space $\Omega$

- Describe possible outcomes

- Describe beliefs about likelihood of outcomes

- **Sets: ** A collection of distinct element
  $$
  \text{finite}: \{a, b, c,d\}\\
  \text{infinite}: x\in \mathbb{Re}
  $$


Namely, the elements should be **mutually exclusive** and **collectively exhaustive**.

**Mutually exclusive** means that,  two or more events that cannot happen simultaneously

Being **collectively exhaustive** means something else-- that, together, all of these elements of the set exhaust all the possibilities, which is $\sum p(x) = 1$.

### Probability Axioms (公理)

Event $A$ is a subset of $\Omega$, assigned with probability $P(A)$.

**Complement of A** : $A^c$, is the event that $A$ does not happened.

- Nonnegativity: $P(A)>0$
- Normalization: $P(\Omega)=1$

- Additivity of disjoint events (finite, countable set): $If \ A\cap B=\varnothing,\ then\ P(A\cap B) = P(A)+ P(B) $

### Probability Properties

Probability, at the minimum, gives us some rules for thinking systematically about uncertain situations.

- $B = A \cup(B\cap A^c)$

- Non-disjoint Events: $P(A\cup B) =P(A) + P(B) - P(A\cap B) $

  - More consequences:

    $P(A\cup B \cup C) =P(A) + P(A^c\cap B)+ P(A^c\cap B^c \cap C)$

- Union bound: $P(A\cup B) \leq P(A) + P(B)$

The probability of union $A_x$ is **not** equal to the sum of the $P(A_x)$, where $A$ can be uncountable sets.

Loosely speaking, probabilities can be interpreted as “**Frequency**” or “**Describing our beliefs**”.



## Conditional Probability

$P(A|B)$ = probability of event $A$, given that $B$ occurred.
$$
\mathbf{P}(A \mid B)=\frac{\mathbf{P}(A \cap B)}{\mathbf{P}(B)}\\
\text{define only when: }\mathbf{P}(B)>0)
$$
And if we had a partition of our sample space into an infinite sequence of event $A_i$, we also have **total probability theorem** or “weighted average”:
$$
P(B)=\sum_i P(B|A_i)
$$
**Example of total probability theorem**

Assume we have $n$ biased coin $i$ with probability $2^{-i}$ of being selected and probability $3^{-i}$ results in Head. The probability that the result is Head is:

Set event $A_i$ is that coin $i$ being selected and result in Head, $B$ is that we result in Head.

## Probability Tools

### De Morgon’s Laws

If we take the intersection of two sets and then take the complement of this intersection, what we obtain is the union of the complements of the two sets.
$$
S^c \cup T^c = (S\cap T)^c \\
S^c \cap T^c = (S\cup T)^c \\
$$

Or generally we have:
$$
(\underset{n}\cup S_n)^c = \underset{n}\cap S_n^c \\
(\underset{n}\cap S_n)^c = \underset{n}\cup S_n^c
$$
**Problem Solving Examples**
$$
P((A \cap B^c)\cup (A^c \cap B) ) = P(A) + P(B) -2 * P(A\cap B)
$$
Set in A not in B : $A \cap B^c$, 

Giving $P(A) = P(A \cap B^c)+P(A \cap B)$.

So the whole term equal to “**union - intersection**”.

### Bonferroni's inequality

Utilize to interpret the union bound.
$$
P(A_1 \cap A_2)\leq P(A_1)+ P(A_2)
$$
And Vise versa, now they are most:
$$
P(A_1 \cap A_2)\geq P(A_1)+ P(A_2) - 1
$$
(b) Generalize to the case of $n$ events $A_{1}, A_{2}, \ldots, A_{n}$, by showing that
$$
\mathbf{P}\left(A_{1} \cap A_{2} \cap \cdots \cap A_{n}\right) \geq \mathbf{P}\left(A_{1}\right)+\mathbf{P}\left(A_{2}\right)+\cdots+\mathbf{P}\left(A_{n}\right)-(n-1)
$$
Proof: $P\left(A_{1} \cap A_{2}\right) \geq P\left(A_{1}\right)+P\left(A_{2}\right)-1$
$$
\text{We have: } P\left(\left(A_{1} \cap A_{2}\right)^{c}\right)=P\left(A_{1}^{c} \cup A_{2}^{c}\right)  \leqslant P\left(A_{1}^{c}\right)+P\left(A_{2}^{c}\right) \\

P\left(\left(A_{1} \cap A_{2}\right)^{c}\right)= 1-P(A_1\cap A_2) \\

P\left(A_{1}^{c}\right)+P\left(A_{2}^{c}\right) = 1-P(A_1)+1-P(A_2)

$$

### Bayes’ Rule

We initial beliefs $\mathrm{P}\left(A_{i}\right)$ on possible causes of an observed event $B$

- **Model** of the world under each $A_{i}:$ $\mathrm{P}\left(B \mid A_{i}\right)$

  Under each particular situation, the model tells us how likely event $B$ is to occur.

- **Inference** to draw conclusions about causes:  $\mathrm{P}\left(A _i\mid B\right)$

  If we actually observe that B occurred, then we use that information to draw conclusions about the possible causes of $B$



## Probability Recitations

#### 1. Romeo and Juliet

- Romeo and Juliet arrive with a delay between 0 and 1 hour
- with all pairs of delays being  “equally likely," that is, according to a uniform probability law on the unit square. 
- The first to arrive will wait for 15 minutes and will  leave if the other has not arrived. 
- What is the probability that they  will meet?
- Draw with Uniform probabilities on a square.

<img src="C:\Users\calvchen\PycharmProjects\chqwer2.github.io\_posts\Math\image-20220301180157725.png" alt="image-20220301180157725" style="zoom:50%;" />

Geometric Demonstration just boils down to not a probability problem, but a problem in geometry - Calculate the area of the space.

Then you can ask, if he wants to have at least a 90% chance of meeting her, how long should he be willing to wait? ?
