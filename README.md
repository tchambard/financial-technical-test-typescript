# Simple cost basis computation algorithm (FIFO)

## How to test ?

### Installation

```shell
# Install dependencies
yarn install
# Transpile code
yarn run clean-compile
# Run unit tests
yarn run test
```

### Start postgresql with docker-compose

**note**: Docker and docker compose must be installed

```shell
# copy .env file and configure variables
cp docker/compose/.env.example docker/compose/.env
# start postgres
docker-compose -f postgresql.yml up -d
# stop postgres
docker-compose -f postgresql.yml down
```

### Run commands

#### Reset database
```shell
yarn start reset_database
```

#### Import transactions
```shell
yarn start import_transactions
```
Output:
```text
============== TRANSACTIONS ===============
┌─────────┬────┬────────────────────────────┬───────────┬────────┬───────┐
│ (index) │ id │            date            │ direction │ volume │ rate  │
├─────────┼────┼────────────────────────────┼───────────┼────────┼───────┤
│    0    │ 1  │ '2021-01-01T00:00:00.000Z' │   'in'    │  '4'   │ '100' │
│    1    │ 2  │ '2021-01-01T00:00:00.000Z' │   'out'   │  '1'   │ '90'  │
│    2    │ 3  │ '2021-01-02T00:00:00.000Z' │   'in'    │  '1'   │ '80'  │
│    3    │ 4  │ '2021-01-03T00:00:00.000Z' │   'out'   │  '1'   │ '120' │
│    4    │ 5  │ '2021-02-03T00:00:00.000Z' │   'out'   │  '3'   │ '130' │
└─────────┴────┴────────────────────────────┴───────────┴────────┴───────┘
```

#### Compute cost basis
```shell
yarn start compute_cost_basis
```
Output:
```text
============== COST BASIS ===============
┌─────────┬──────┬─────────────┬──────────────┬───────┐
│ (index) │ txId │ totalVolume │ totalCostUsd │ txPnl │
├─────────┼──────┼─────────────┼──────────────┼───────┤
│    0    │  1   │     '4'     │    '400'     │  '0'  │
│    1    │  2   │     '3'     │    '300'     │ '-10' │
│    2    │  3   │     '4'     │    '380'     │  '0'  │
│    3    │  4   │     '3'     │    '280'     │ '20'  │
│    4    │  5   │     '0'     │     '0'      │ '110' │
└─────────┴──────┴─────────────┴──────────────┴───────┘
============== COST BASIS LOTS ===============
┌─────────┬─────────┬────────┬────────────┬──────────┬───────┐
│ (index) │ txOutId │ txInId │ txInVolume │ txInCost │  pnl  │
├─────────┼─────────┼────────┼────────────┼──────────┼───────┤
│    0    │    2    │   1    │    '1'     │  '100'   │ '-10' │
│    1    │    4    │   1    │    '1'     │  '100'   │ '20'  │
│    2    │    5    │   1    │    '2'     │  '200'   │ '60'  │
│    3    │    5    │   3    │    '1'     │   '80'   │ '50'  │
└─────────┴─────────┴────────┴────────────┴──────────┴───────┘
============== COST BASIS COMPUTED FROM LOTS ===============
┌─────────┬──────┬─────────────┬──────────────┬───────┐
│ (index) │ txId │ totalVolume │ totalCostUsd │ txPnl │
├─────────┼──────┼─────────────┼──────────────┼───────┤
│    0    │  1   │     '4'     │    '400'     │  '0'  │
│    1    │  2   │     '3'     │    '300'     │ '-10' │
│    2    │  3   │     '4'     │    '380'     │  '0'  │
│    3    │  4   │     '3'     │    '280'     │ '20'  │
│    4    │  5   │     '0'     │     '0'      │ '110' │
└─────────┴──────┴─────────────┴──────────────┴───────┘
```
