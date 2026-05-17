/**
 * @slide-computer/signer-transport-stoic deep-imports PartialIdentity from an internal
 * path not listed in the `@dfinity/identity` package "exports" (Vite fails without this).
 * Re-export from the package root entry.
 */
export { PartialIdentity } from "@dfinity/identity";
