import { Buffer } from "buffer";

const root = globalThis as typeof globalThis & {
  Buffer?: typeof Buffer;
  global?: typeof globalThis;
};

root.Buffer = Buffer;
root.global = root;
