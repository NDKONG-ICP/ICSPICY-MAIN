import { useEffect, useRef } from "react";
import type { GardenDesign } from "@/lib/garden-types";

export function AmbientSounds({ design }: { design: GardenDesign }) {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const hasWater = design.structures.some((s) => /pond|rain|water|swale/.test(s.structureType));
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i += 1) output[i] = Math.random() * 2 - 1;

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = "lowpass";
      windFilter.frequency.value = 400;
      const windGain = ctx.createGain();
      windGain.gain.value = 0.015;
      whiteNoise.connect(windFilter).connect(windGain).connect(ctx.destination);
      whiteNoise.start();

      const chirp = () => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = 2000 + Math.random() * 1500;
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(g).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      };
      const birdInterval = setInterval(chirp, 2500 + Math.random() * 3000);

      let waterInterval: ReturnType<typeof setInterval> | undefined;
      if (hasWater) {
        waterInterval = setInterval(() => {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.frequency.value = 80 + Math.random() * 40;
          g.gain.value = 0.008;
          osc.connect(g).connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.5);
        }, 800);
      }

      return () => {
        clearInterval(birdInterval);
        if (waterInterval) clearInterval(waterInterval);
        void ctx.close();
      };
    } catch {
      return;
    }
  }, [design.structures]);

  return null;
}
