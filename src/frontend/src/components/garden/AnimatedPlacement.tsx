import { useSpring, animated } from "@react-spring/three";
import type { ReactNode } from "react";

export function AnimatedPlacement({
  children,
  animateIn = true,
}: {
  children: ReactNode;
  animateIn?: boolean;
}) {
  const { scale } = useSpring({
    from: { scale: animateIn ? 0 : 1 },
    to: { scale: 1 },
    config: { tension: 300, friction: 10 },
  });

  return <animated.group scale={scale}>{children}</animated.group>;
}
