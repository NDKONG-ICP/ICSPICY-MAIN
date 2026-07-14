import { useCallback, useEffect, useRef, type RefObject } from "react";

/**
 * Size a game canvas only after the play surface is mounted and laid out.
 * The title-screen gate unmounts the canvas on first paint — measuring on
 * initial mount yields 0×0 or stale dimensions and stretches the default
 * 300×150 buffer across the full playfield.
 */
export function useGameCanvasFit(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  active: boolean,
  onFit?: (w: number, h: number, dpr: number) => void,
) {
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !active) return false;
    const parent = canvas.parentElement;
    if (!parent) return false;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (w <= 0 || h <= 0) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    onFitRef.current?.(w, h, dpr);
    return true;
  }, [active, canvasRef]);

  useEffect(() => {
    if (!active) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      fitCanvas();
      raf2 = requestAnimationFrame(fitCanvas);
    });

    const ro = new ResizeObserver(() => {
      fitCanvas();
    });

    const observe = () => {
      const parent = canvasRef.current?.parentElement;
      if (parent) ro.observe(parent);
    };
    observe();

    const mo = new MutationObserver(observe);
    if (canvasRef.current?.parentElement) {
      mo.observe(canvasRef.current.parentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
      });
    }

    const onOrient = () => {
      requestAnimationFrame(fitCanvas);
    };
    window.addEventListener("orientationchange", onOrient);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("orientationchange", onOrient);
    };
  }, [active, fitCanvas, canvasRef]);

  return fitCanvas;
}
