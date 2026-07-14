#!/usr/bin/env node
/**
 * build-slicer-atlas.mjs — thin wrapper around build-game-atlas.mjs
 * Keeps existing `node scripts/build-slicer-atlas.mjs` invocations working.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const child = spawn(
  process.execPath,
  [path.join(here, "build-game-atlas.mjs"), "--game", "slicer"],
  { stdio: "inherit" },
);
child.on("exit", (code) => process.exit(code ?? 1));
