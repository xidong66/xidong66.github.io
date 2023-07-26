---
layout:     post
title:      "Game Theory - Stanford"
subtitle:   " \"Hello Game Theory\""
date:       2022-01-22 00:05:00
author:     "Calvchen"
header-img: "img/post-bg-re-vs-ng2.jpg"
catalog: true
tags:
    - Game Theory
    - Starter
    - Course



---

> “Let’s go Game Theory. ”

### In the Very Beginning

I remember once Prof. Cheng (My psychological professor, 程乐华教授) played a game in his course:

> Choose a number $n$ between 0 and 100. Your final score will be the:  
>
> $$100-abs(n_{your} - \frac{2}{3}mean(\sum^n_{i=0} n_i))$$
>
> Which number will you choose?

It will so much fun after deeping into it.

This gives me a initial thought about what game theory looks like.

If you would like to make better choice when playing boardgames, chest game or even practical negotiation, game theory will absolutely satisfy the need. 



# Game Theory

Beyond what we call “games” in common language, such as chess, poker,  soccer, etc., 

**Modern Game Theory** began with the idea of mixed-strategy equilibria in two-person zero-sum game, normally includes the modeling of conflict among what we called rational self-interested  agents, such as nations,  political campaigns, competition among firms, and trading behavior in  markets. 

## What will be covered?

- Definitions of Game Theory
  - The normal form, payoffs, strategies
  - Pure strategy Nash equilibrium
  - Dominant strategies.

- Mixed-Strategy

  - Pure and mixed strategy Nash equilibria. 

- Alternate Solution Concepts

  - Iterative removal of strictly dominated strategies
  - Minimax  strategies and minimax theorem for zero-sum game, correlated  equilibria.

  - Extensive-Form Games

- Perfect information games:
  - Trees, players assigned to nodes and payoffs  
  - Backward Induction
  - Subgame perfect equilibrium
  - Imperfect-information games 
  - Mixed versus behavioral strategies

- Repeated Games
  - Repeated prisoners dilemma
  - Finite and infinite repeated games
  - Limited-average versus future-discounted reward, folk theorems
  - Stochastic games and learning
- Bayesian Games
  - General definitions
  - Ex ante/interim Bayesian Nash equilibrium.

- Coalitional Games
  - Transferable utility cooperative games
  - Shapley value
  - Core and applications

It is time for us to play some games.

## Definitions of Game Theory

#### TCP Backoff Game

In TCP, some computers are overwhelming that may throw messages away. Should we use TCP with backoff mechanism inside it? Or using a defective implementation (which doesn't)?



Thinking about how interactions should be structured in **TCP Backoff Game**?



This problem is an example of what we call a two-player game:

- both use a correct implementation: both get 1 ms delay
- one correct, one defective: 4 ms for correct, 0 ms for defective
- both defective: both get a 3 ms delay.

We now some questions toward this game, which will be addressed after:

- What action should a player of the game take
- Would all users behave the same in this scenario
- What global behavior patterns should a system designer expect?
- For what changes to the numbers would behavior be the same?
- What effect would communication have?
- Repetitions? (finite? infinite?)
- Does it matter if I believe that my opponent is rational?

### Component of the Game

Each game contains multiple players or we call **Self-Interested Agents** in game theory. That is because they has their own description of the states of the outside world and act accordingly, and they not only care about themselves or want to harm others.

The action-payoff mapping is called **Utility**.

That is to say, agents with different preferences and utilities. And according to the Decision-theoretic rationality, they will act to maximize expected utility.







and Utility Theory