# Wild Tigers — staking / $PAWS

## Status: research required

Captain needs the on-chain staking contract or documented Hedera contract call path.

## Next steps

1. Identify Wild Tigers HTS collection token ID on mainnet.
2. From SentX or project docs, locate staking contract ID and method selectors.
3. Wire `worker/src/clients/wild-tigers.js` with `@hashgraph/sdk` ContractExecuteTransaction.
4. Track $PAWS token ID for balance queries on mirror node.

Until wired, admin UI shows **manual stake** alert; Captain posts milestone copy when admin confirms stake tx.
