import "dotenv/config";
import {
  loadCaptainIdentity,
  loadMnemonicFromEnv,
  loadWorkerIdentity,
} from "./identity.js";
import {
  buildWalletBook,
  canopyNeedsFunding,
  formatWalletBook,
} from "./lib/wallets.js";

const mnemonic = loadMnemonicFromEnv();
const worker = await loadWorkerIdentity(mnemonic);
const captain = await loadCaptainIdentity(mnemonic);

const book = buildWalletBook({
  workerPrincipal: worker.getPrincipal().toText(),
  captainPrincipal: captain.getPrincipal().toText(),
  secrets: {
    ambassador_sweep_principal: process.env.AMBASSADOR_SWEEP_PRINCIPAL,
    canopy_wallet_principal: process.env.CANOPY_WALLET_PRINCIPAL,
  },
});

console.log(formatWalletBook(book));
if (canopyNeedsFunding(book)) {
  console.log(
    "\n[wallets] ACTION: Canopy ≠ operating — fund the Canopy principal before Bonsai mint/CRM.",
  );
} else if (!book.find((w) => w.role === "canopy_bonsai")?.principal) {
  console.log(
    "\n[wallets] ACTION: Log Capsaicin into Bazaar/Canopy once, copy the plain principal, set CANOPY_WALLET_PRINCIPAL (or hub secret canopy_wallet_principal).",
  );
}
