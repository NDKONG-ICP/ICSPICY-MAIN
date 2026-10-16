/**
 * Hedera HTS + mirror node helpers for Captain Capsaicin drops.
 *
 * Requires @hashgraph/sdk and a funded operator key (env or data file).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const HEDERA_DATA_DIR = join(HERE, "..", "..", "data", "hedera");
export const CAPTAIN_HEDERA_KEY_PATH = join(HEDERA_DATA_DIR, "captain-ed25519.json");

const DEFAULT_MIRROR_MAINNET = "https://mainnet-public.mirrornode.hedera.com";
const DEFAULT_MIRROR_TESTNET = "https://testnet.mirrornode.hedera.com";

export function mirrorBase(network = "mainnet") {
  if (network === "testnet") return DEFAULT_MIRROR_TESTNET;
  return process.env.HEDERA_MIRROR?.trim() || DEFAULT_MIRROR_MAINNET;
}

export function formatEvmAddress(raw) {
  const hex = String(raw).replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(hex)) {
    throw new Error("invalid Hedera EVM address");
  }
  return `0x${hex}`;
}

export async function resolveAccountForPublicKey(publicKeyDerHex, network = "mainnet") {
  const base = mirrorBase(network);
  const url = `${base}/api/v1/accounts?account.publickey=${publicKeyDerHex}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const acc = json.accounts?.[0];
  return acc?.account ?? null;
}

export async function resolveAccountForEvmAddress(evmAddress, network = "mainnet") {
  const base = mirrorBase(network);
  const id = formatEvmAddress(evmAddress);
  const res = await fetch(`${base}/api/v1/accounts/${id}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json.account ?? null;
}

export async function fetchAccountBalanceHbar(accountId, network = "mainnet") {
  const base = mirrorBase(network);
  const res = await fetch(`${base}/api/v1/accounts/${accountId}`);
  if (!res.ok) return null;
  const json = await res.json();
  const tiny = json.balance?.balance ?? json.balance?.balances?.[0]?.balance;
  if (tiny == null) return null;
  return Number(tiny) / 1e8;
}

/**
 * Load or create Captain's Hedera key (gitignored).
 * New keys are ECDSA so HashPack can fund them with a 0x EVM address.
 * An unfunded ED25519 key is archived and replaced; a funded key is left as-is.
 */
export async function loadOrCreateCaptainHederaKey() {
  mkdirSync(HEDERA_DATA_DIR, { recursive: true });
  if (existsSync(CAPTAIN_HEDERA_KEY_PATH)) {
    const existing = JSON.parse(readFileSync(CAPTAIN_HEDERA_KEY_PATH, "utf8"));
    if (existing.keyType === "secp256k1" && existing.evmAddress) return existing;
    if (existing.accountId) return existing;
    const backup = join(HEDERA_DATA_DIR, "captain-ed25519.unfunded.json");
    if (!existsSync(backup)) {
      writeFileSync(backup, `${JSON.stringify(existing, null, 2)}\n`, { mode: 0o600 });
    }
  }
  const { PrivateKey } = await import("@hashgraph/sdk");
  const pk = PrivateKey.generateECDSA();
  const record = {
    createdAt: new Date().toISOString(),
    keyType: "secp256k1",
    privateKey: pk.toString(),
    publicKey: pk.publicKey.toString(),
    publicKeyDer: pk.publicKey.toStringDer(),
    evmAddress: formatEvmAddress(pk.publicKey.toEvmAddress()),
    accountId: null,
    network: "mainnet",
  };
  writeFileSync(CAPTAIN_HEDERA_KEY_PATH, `${JSON.stringify(record, null, 2)}\n`, {
    mode: 0o600,
  });
  return record;
}

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.symbol
 * @param {number} opts.maxSupply
 * @param {string} opts.treasuryAccountId
 * @param {import('@hashgraph/sdk').PrivateKey} operatorKey
 * @param {string} opts.operatorId
 * @param {'mainnet'|'testnet'} opts.network
 */
export async function createHtsCollection(opts) {
  const {
    TokenCreateTransaction,
    TokenType,
    TokenSupplyType,
    PrivateKey,
    Client,
    Hbar,
  } = await import("@hashgraph/sdk");

  const client =
    opts.network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(opts.operatorId, opts.operatorKey);

  const supplyKey = PrivateKey.generateED25519();
  const adminKey = opts.operatorKey;

  const tx = await new TokenCreateTransaction()
    .setTokenName(opts.name)
    .setTokenSymbol(opts.symbol)
    .setTokenType(TokenType.NonFungibleUnique)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(opts.maxSupply)
    .setTreasuryAccountId(opts.treasuryAccountId)
    .setAdminKey(adminKey)
    .setSupplyKey(supplyKey)
    .setInitialSupply(0)
    .setMaxTransactionFee(new Hbar(20))
    .freezeWith(client);

  const signed = await tx.sign(adminKey);
  const sub = await signed.execute(client);
  const receipt = await sub.getReceipt(client);
  const tokenId = receipt.tokenId?.toString();
  if (!tokenId) throw new Error("TokenCreateTransaction: no tokenId in receipt");
  return { tokenId, supplyKey: supplyKey.toString() };
}

/**
 * Mint up to 10 serials per transaction (HTS limit).
 */
export async function mintHtsBatch({
  tokenId,
  metadataCids,
  supplyKeyStr,
  operatorId,
  operatorKey,
  network = "mainnet",
}) {
  const {
    TokenMintTransaction,
    PrivateKey,
    Client,
    Hbar,
  } = await import("@hashgraph/sdk");
  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(operatorId, PrivateKey.fromString(operatorKey));
  const supplyKey = PrivateKey.fromString(supplyKeyStr);

  const tx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata(metadataCids.map((m) => Buffer.from(m, "utf8")))
    .setMaxTransactionFee(new Hbar(5))
    .freezeWith(client);
  const signed = await tx.sign(supplyKey);
  const sub = await signed.execute(client);
  const receipt = await sub.getReceipt(client);
  return receipt.serials?.map((s) => s.toNumber()) ?? [];
}

/**
 * Replace the supply key on a token the Captain admin key already controls.
 * Used when a previous supply key was not retained.
 */
export async function rotateSupplyKey({ tokenId, operatorId, operatorKey, network = "mainnet" }) {
  const { TokenUpdateTransaction, PrivateKey, Client, Hbar } = await import("@hashgraph/sdk");
  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  const admin = typeof operatorKey === "string" ? PrivateKey.fromString(operatorKey) : operatorKey;
  client.setOperator(operatorId, admin);
  const supplyKey = PrivateKey.generateED25519();
  const tx = await new TokenUpdateTransaction()
    .setTokenId(tokenId)
    .setSupplyKey(supplyKey)
    .setMaxTransactionFee(new Hbar(5))
    .freezeWith(client);
  const signed = await tx.sign(admin);
  const receipt = await (await signed.execute(client)).getReceipt(client);
  if (receipt.status.toString() !== "SUCCESS") {
    throw new Error(`TokenUpdate ${tokenId}: ${receipt.status.toString()}`);
  }
  return supplyKey.toString();
}
