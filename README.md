# Cryptio Finance Technical Test

Your task is to implement a simple cost basis computation algorithm. You are
given a transaction history, stored in an SQL database. Some transactions are
deposits (money is received), and others are withdrawals (money is spent). All
transactions manipulate a single asset, which is a crypto-currency. Every time a
transaction happens, you are also given the rate of this crypto-currency,
against USD.

For each transaction, you should compute the following:

* Cost basis associated with the transaction (in USD)
* The gains / losses associated with the transaction (in USD)
* You are also required to store the "lots" associated with each
  computation (see below)

Here are a few terms explained:

* The **cost basis** is the original value / purchase price of an asset.
* The **gains / losses** are the difference between an asset's cost basis, and
  this same asset's fair market value.
* The **lots** somehow work as a *proof*, or *detail* for the cost basis
  computation. See the example below.

There are multiple cost basis methodologies. The one you are required to
implement here is the most common one, which is **first-in, first-out** (FIFO).

Let's see a FIFO cost basis example! Here is a very simple transaction history:

1. First, 1 BTC is acquired for 100 USD
2. Then, 1 BTC is acquired for 120 USD
3. Last, these 2 BTC are sold for 250 USD

And here is what's happening for each transaction:

1. Transaction is a deposit, we have 1 BTC aquired at a cost basis of 100 USD.
2. Transaction is a deposit as well, we have 1 BTC aquired at a cost basis of
   120 USD. We now have 2 BTC, for a total cost basis of 220 USD.
3. The 2 BTC we have in stock are sold for a total of 250 USD. Hence, the fair
   market value of a BTC is 125 USD when we sell. As we are using FIFO, we spend
   the first BTC that entered our history first (the one that cost us 100 USD). The
   difference between the fair market value (125 USD) and our cost basis (100 USD)
   is a positive 25 USD. Then we spend the second BTC. This one has a cost basis of
   120 USD, which gives a difference of positive 5 USD. We can now add both results
   to get a total gain of 30 USD for this transaction. This transaction is
   associated with two lots: one for the first BTC lot (the one at 100 USD),
   and another one for the second BTC lot (120 USD).

If you are confused, please contact us! You can do some research on your side
(these are very common accounting / finance notions, there are tons of resources
online), but you are also welcome to contact us. :-)


## Getting Started

You should have a look at the `templates/` folder. Pick **one** programming
language, and start coding! You may or may not use the proposed boilerplate.
Also, you should have a look at the `initial.sql` file.

Again, if you have any question, please reach out!


## Assessment

The goal of this technical test is to assess the following:

* Ability to write code in TypeScript, or in Rust
* Ability to design a simple SQL schema, and write SQL queries
* Ability to research a simple finance-related problem, and solve it using
  a programming language

You will be evaluated as such:

* Did you actually solve the task?
* How readable is the code written?
* How sensible is the overall design of the solution?


## Bonus

In case you find this task too easy, here are some bonus ideas:

* Re-implement the solution in another programming language (in case you have
  not already done it, Rust is preferred)
* Augment the system so that it's able to deal with multiple crypto-currencies
  instead of just one (multiple queues)
* Introduce a "big number" library
* Improve the performance of the system and introduce a benchmark system
* Introduce tests and report the coverage
