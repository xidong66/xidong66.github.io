---
layout:     post
title:      "Eigen of Matrix MIT 18.6501x"
subtitle:   " \"Matrix is Fun!\""
date:       2022-02-07 12:00:00
author:     "Calvchen"
header-img: "img/post-bg-infinity.jpg"
catalog: true
tags:
    - Math
    - Statistics
    - Course


---

> “They are common in many areas and quite important to solve problem.”



### Eigenvalues and Eigenvectors of a matrix 

In this section, we will work with the entire set of complex numbers, denoted by $\mathbb C$. Recall that the real numbers, $\mathbb R$ are contained in the complex numbers, so the discussions in this section apply to both real and complex numbers.

To illustrate the idea behind what will be discussed, consider the following example.
$$
A = \begin{bmatrix}
0 & 5 & -10\\
0 & 22 & 16 \\
0 & -9 & -2
\end{bmatrix}
$$
Compute $AX$ separately for
$$
X = \begin{bmatrix}
5 \\
-4\\
3
\end{bmatrix}, \ X = \begin{bmatrix}
1 \\
0\\
0
\end{bmatrix}
$$
What do you notice about $AX$ in each of these products?

**Notice **that for each, $AX = kX$ where $k$ is some scalar. When this equation holds for some $X$ and $k$, we call the scalar $k$ an **eigenvalue** of $A$. 

When $AX = kX$ for some $X \neq 0$, we call such $X$ an **eigenvector** of the matrix $A$.

#### Definition 7.1.1: Eigenvalues and Eigenvectors

Let *A* be an *n*×*n* matrix and let *X*∈C*n*

 be a **nonzero vector** for which
$$
AX= \lambda X
$$
 for some scalar *λ*. Then *λ* is called an **eigenvalue** of the matrix *A* and *X* is called an **eigenvector** of *A* associated with *λ*, or a *λ*-eigenvector of *A*.

The set of all eigenvalues of an *n*×*n*

 matrix *A* is denoted by *σ*(*A*) and is referred to as the **spectrum** of *A*.



### Haven’t Handled



### Matrix

Understand the concept of **eigenvalues**  and **eigenvectors**  of an  matrix. 

**inner product**  (also called the **dot product** ) 

![image-20220206124808639](https://ik.imagekit.io/haochen/Typora/image-20220206124808639.png)

![image-20220206124837016](https://ik.imagekit.io/haochen/Typora/image-20220206124837016.png)

![image-20220206125013763](https://ik.imagekit.io/haochen/Typora/image-20220206125013763.png)

**row rank** , column rank and normal rank

![image-20220206130007716](https://ik.imagekit.io/haochen/Typora/image-20220206130007716.png)

![image-20220206130132279](https://ik.imagekit.io/haochen/Typora/image-20220206130132279.png)



![image-20220206130125471](https://ik.imagekit.io/haochen/Typora/image-20220206130125471.png)



### Geometric Interpretation of Eigenvalues and Eigenvectors



### Determinant and Eigenvalues



### Trace and Eigenvalues



### Nullspace