import "dotenv/config";
import { loadMnemonicFromEnv, loadWorkerIdentity } from "./identity.js";

const identity = await loadWorkerIdentity(loadMnemonicFromEnv());
console.log("Worker principal (register in Admin → Agent Swarm → Worker principals):");
console.log(identity.getPrincipal().toText());
