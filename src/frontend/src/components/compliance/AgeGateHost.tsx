import {
  AGE_GATE_EVENT,
  type AgeGateRequestDetail,
  isAgeBlocked,
  saveAgeAllowed,
  saveAgeBlocked,
} from "@/lib/age-attestation";
import { useEffect, useRef, useState } from "react";
import { AgeAttestModal } from "./AgeAttestModal";

export function AgeGateHost() {
  const [open, setOpen] = useState(false);
  const [blockedView, setBlockedView] = useState(false);
  const pendingRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<AgeGateRequestDetail>).detail;
      if (isAgeBlocked()) {
        setBlockedView(true);
        setOpen(true);
        return;
      }
      pendingRef.current = detail?.onAllowed ?? null;
      setBlockedView(false);
      setOpen(true);
    };
    window.addEventListener(AGE_GATE_EVENT, onRequest);
    return () => window.removeEventListener(AGE_GATE_EVENT, onRequest);
  }, []);

  const finishAllowed = () => {
    saveAgeAllowed();
    setOpen(false);
    const fn = pendingRef.current;
    pendingRef.current = null;
    fn?.();
  };

  const finishUnder13 = () => {
    saveAgeBlocked();
    pendingRef.current = null;
    setBlockedView(true);
  };

  return (
    <AgeAttestModal
      open={open}
      onOpenChange={setOpen}
      onConfirm13Plus={finishAllowed}
      onUnder13={finishUnder13}
      blockedView={blockedView}
    />
  );
}
