import "@nfid/identitykit/react/styles.css";
import {
  IdentityKitProvider,
  IdentityKitTheme,
} from "@nfid/identitykit/react";
import type { ReactNode } from "react";
import { getBackendCanisterId } from "../lib/canister-ids";

interface Props {
  children: ReactNode;
}

/**
 * IdentityKit root provider — DELEGATION auth with backend canister as delegation target
 * (ICRC-25 / ICRC-28 trusted origins on backend).
 */
export function ICSpicyIdentityKitProvider({ children }: Props) {
  const targets = [getBackendCanisterId()];

  return (
    <IdentityKitProvider
      authType="DELEGATION"
      theme={IdentityKitTheme.DARK}
      signerClientOptions={{
        targets,
        idleOptions: {
          disableIdle: true,
          disableDefaultIdleCallback: true,
        },
      }}
    >
      {children}
    </IdentityKitProvider>
  );
}
