import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { runWithAgeGate } from "@/lib/age-attestation";
import { HashConnect } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";

type HederaWalletState = {
  accountId: string | null;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  /** Send HBAR from the connected HashPack account. Returns transaction id. */
  sendHbar: (toAccountId: string, amountHbar: number) => Promise<string>;
  /** Sign a UTF-8 message. Returns the raw signature as base64. */
  signMessage: (message: string) => Promise<string>;
  /** Call from the click handler, before any await, so the phone can open HashPack. */
  prepareHashPackSign: () => void;
};

const HederaWalletContext = createContext<HederaWalletState | null>(null);

const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim() ?? "";
const HASHPACK_LINK = "https://link.hashpack.app";

function dappOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.PROD ? "https://icspicy.app" : "http://localhost:5173";
}

/** Phone and tablet browsers should hand off to the HashPack app. */
function shouldOpenHashPackApp(): boolean {
  const ua = navigator.userAgent;
  if (/Android|iPhone|iPad|iPod/i.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) return true;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return narrow && coarse;
}

function hashPackLaunchUrl(pairingString: string): string {
  return `${HASHPACK_LINK}/wc?uri=${encodeURIComponent(pairingString)}`;
}

function hashPackAppUrl(pairingString: string): string {
  return `hashpack://wc?uri=${encodeURIComponent(pairingString)}`;
}

/** Open the installed HashPack app. If it stays in the browser, use the https handoff. */
function openHashPackApp(pairingString: string) {
  const started = Date.now();
  window.location.assign(hashPackAppUrl(pairingString));
  window.setTimeout(() => {
    if (document.visibilityState !== "visible") return;
    if (Date.now() - started > 2500) return;
    window.location.assign(hashPackLaunchUrl(pairingString));
  }, 1200);
}

const HASHPACK_SIGN_URL = "hashpack://wc";
let approvalWindow: Window | null = null;

function closeApprovalWindow() {
  const popup = approvalWindow;
  approvalWindow = null;
  if (!popup || popup.closed) return;
  try {
    popup.close();
  } catch {
    /* ignore — some WebViews block close() */
  }
}

/** Must run in the Generate click, before any await, or iOS blocks the later open. */
function prepareHashPackSign() {
  closeApprovalWindow();
  if (!shouldOpenHashPackApp()) return;
  approvalWindow = window.open("about:blank", "hashpack-approve");
}

function wakeHashPackForApproval() {
  if (!shouldOpenHashPackApp()) return;
  const popup = approvalWindow;
  if (popup && !popup.closed) {
    try {
      popup.location.replace(HASHPACK_SIGN_URL);
    } catch {
      try {
        popup.location.href = HASHPACK_SIGN_URL;
      } catch {
        /* popup may be cross-origin after handoff */
      }
    }
    return;
  }
  approvalWindow = null;
  window.location.assign(HASHPACK_SIGN_URL);
}

/** Blank approval tab stays open after hashpack:// handoff; close when user returns. */
function watchApprovalWindowWhileSigning(onReturn: () => void) {
  if (!shouldOpenHashPackApp()) return () => {};
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    onReturn();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", onVisible);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", onVisible);
  };
}

function extensionInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === "hashconnect-query-extension-response") {
        cleanup();
        resolve(true);
      }
    };
    const timer = window.setTimeout(() => {
      cleanup();
      resolve(false);
    }, 700);
    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ type: "hashconnect-query-extension" }, "*");
  });
}

export function HederaWalletProvider({ children }: { children: ReactNode }) {
  const [accountId, setAccountId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem("hedera_account_id");
    } catch {
      return null;
    }
  });
  const [connecting, setConnecting] = useState(false);
  const hcRef = useRef<HashConnect | null>(null);
  const initRef = useRef<Promise<void> | null>(null);

  const rememberAccount = useCallback((id: string) => {
    setAccountId(id);
    try {
      sessionStorage.setItem("hedera_account_id", id);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!PROJECT_ID) return;
    const origin = dappOrigin();
    const metadata = {
      name: "IC SPICY",
      description: "IC SPICY dapp",
      url: origin,
      icons: [`${origin}/favicon.ico`],
      redirect: { native: origin, universal: `${origin}/drop` },
    };
    const hc = new HashConnect(
      LedgerId.MAINNET,
      PROJECT_ID,
      metadata as unknown as ConstructorParameters<typeof HashConnect>[2],
      false,
    );
    hcRef.current = hc;
    const sync = () => {
      const id = hc.connectedAccountIds[0]?.toString();
      if (id) rememberAccount(id);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    initRef.current = hc.init().then(() => {
      hc.pairingEvent.on((data) => {
        const id = data.accountIds?.[0] ?? null;
        if (id) rememberAccount(id);
      });
      hc.disconnectionEvent.on(() => {
        setAccountId(null);
        try {
          sessionStorage.removeItem("hedera_account_id");
        } catch {
          /* ignore */
        }
      });
      sync();
      document.addEventListener("visibilitychange", onVisible);
      window.addEventListener("pageshow", sync);
    });
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", sync);
    };
  }, [rememberAccount]);

  const connectInner = useCallback(async () => {
    if (!PROJECT_ID) {
      throw new Error("Set VITE_WALLETCONNECT_PROJECT_ID for HashPack connect");
    }
    const started = Date.now();
    let hc = hcRef.current;
    while (!hc && Date.now() - started < 4000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      hc = hcRef.current;
    }
    if (!hc) throw new Error("HashPack is still starting. Try again.");
    setConnecting(true);
    try {
      await initRef.current;
      const existing = hc.connectedAccountIds[0]?.toString();
      if (existing) {
        rememberAccount(existing);
        return;
      }
      const uri = hc.pairingString;
      if (!uri) throw new Error("HashPack is not ready yet. Try again.");
      const launchUrl = hashPackLaunchUrl(uri);
      if (shouldOpenHashPackApp()) {
        openHashPackApp(uri);
        return;
      }
      if (await extensionInstalled()) {
        await (
          hc as unknown as { connectToExtension: () => Promise<void> }
        ).connectToExtension();
        return;
      }
      const popup = window.open(
        launchUrl,
        "hashpack",
        "popup,width=420,height=720",
      );
      if (!popup) window.location.assign(launchUrl);
    } finally {
      setConnecting(false);
    }
  }, [rememberAccount]);

  const connect = useCallback(async () => {
    await new Promise<void>((resolve, reject) => {
      runWithAgeGate(() => {
        connectInner().then(() => resolve()).catch(reject);
      });
    });
  }, [connectInner]);

  const disconnect = useCallback(() => {
    void hcRef.current?.disconnect();
    setAccountId(null);
    try {
      sessionStorage.removeItem("hedera_account_id");
    } catch {
      /* ignore */
    }
  }, []);

  const sendHbar = useCallback(
    async (toAccountId: string, amountHbar: number) => {
      const hc = hcRef.current;
      if (!hc || !accountId) {
        throw new Error("Connect HashPack first");
      }
      if (!Number.isFinite(amountHbar) || amountHbar <= 0) {
        throw new Error("Invalid HBAR amount");
      }
      const { TransferTransaction, Hbar, AccountId } = await import(
        "@hashgraph/sdk"
      );
      const from = AccountId.fromString(accountId);
      const signer = hc.getSigner(from);
      const tx = await new TransferTransaction()
        .addHbarTransfer(from, new Hbar(-amountHbar))
        .addHbarTransfer(AccountId.fromString(toAccountId), new Hbar(amountHbar))
        .freezeWithSigner(signer as never);
      const resp = await tx.executeWithSigner(signer as never);
      return resp.transactionId?.toString() ?? "";
    },
    [accountId],
  );

  const signMessage = useCallback(
    async (message: string) => {
      const hc = hcRef.current;
      if (!hc || !accountId) throw new Error("Connect HashPack first");
      const { AccountId } = await import("@hashgraph/sdk");
      const pending = hc.signMessages(AccountId.fromString(accountId), message);
      wakeHashPackForApproval();
      const unwatch = watchApprovalWindowWhileSigning(() => {
        window.setTimeout(() => closeApprovalWindow(), 150);
      });
      try {
        const sigs = await Promise.race([
          pending,
          new Promise<never>((_, reject) => {
            window.setTimeout(
              () =>
                reject(
                  new Error(
                    "HashPack did not approve. Open HashPack, approve the signature, then return here.",
                  ),
                ),
              90_000,
            );
          }),
        ]);
        const raw = sigs?.[0]?.signature;
        if (!raw) throw new Error("HashPack did not return a signature");
        const bytes = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        let bin = "";
        bytes.forEach((byte) => {
          bin += String.fromCharCode(byte);
        });
        return btoa(bin);
      } finally {
        unwatch();
        closeApprovalWindow();
      }
    },
    [accountId],
  );

  const value = useMemo(
    () => ({
      accountId,
      connecting,
      connect,
      disconnect,
      sendHbar,
      signMessage,
      prepareHashPackSign,
    }),
    [accountId, connecting, connect, disconnect, sendHbar, signMessage],
  );

  return (
    <HederaWalletContext.Provider value={value}>
      {children}
    </HederaWalletContext.Provider>
  );
}

export function useHederaWallet() {
  const ctx = useContext(HederaWalletContext);
  if (!ctx) {
    throw new Error("useHederaWallet must be used within HederaWalletProvider");
  }
  return ctx;
}
