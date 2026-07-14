import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CarnivalBootTransition } from "./CarnivalBootTransition";
import { prefersReducedMotion, useCarnivalEntry } from "./useCarnivalEntry";

/** Title-screen gate + carnival boot transition when arriving from midway. */
export function useGameTitleFlow() {
  const [showTitle, setShowTitle] = useState(true);
  const [booting, setBooting] = useState(false);
  const [titleEntering, setTitleEntering] = useState(false);
  const { fromMidway, clearEntryFlag } = useCarnivalEntry();
  const navigate = useNavigate();

  useEffect(() => {
    if (!fromMidway) return;
    if (prefersReducedMotion()) {
      clearEntryFlag();
      return;
    }
    setBooting(true);
  }, [fromMidway, clearEntryFlag]);

  const onBootComplete = useCallback(() => {
    setBooting(false);
    setTitleEntering(true);
    clearEntryFlag();
    window.setTimeout(() => setTitleEntering(false), 400);
  }, [clearEntryFlag]);

  const enterGameplay = useCallback(() => setShowTitle(false), []);
  const returnToTitle = useCallback(() => setShowTitle(true), []);

  const backToMidway = useCallback(() => {
    void navigate({ to: "/games" });
  }, [navigate]);

  return {
    showTitle,
    booting,
    titleEntering,
    onBootComplete,
    enterGameplay,
    returnToTitle,
    backToMidway,
  };
}
