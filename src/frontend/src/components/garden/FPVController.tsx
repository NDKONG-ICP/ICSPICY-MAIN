import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

export type Collider = { x: number; z: number; radius: number };
export type PlantRef = { id: number; x: number; z: number };
export type ReticleHit = { x: number; z: number; plantId: number | null };

/** Screen-space (canvas-relative px) visual state for an on-screen joystick. */
export type StickVisual = {
  active: boolean;
  ox: number;
  oy: number;
  kx: number;
  ky: number;
};
export type TouchVisualState = { move: StickVisual; look: StickVisual };
export type ReticleState = {
  x: number;
  z: number;
  plantId: number | null;
  valid: boolean;
};

type Props = {
  mode: "walk" | "build";
  enabled: boolean;
  isTouch: boolean;
  widthMeters: number;
  depthMeters: number;
  colliders: Collider[];
  plants: PlantRef[];
  /** Imperatively positioned ghost group (build mode) — avoids per-frame React state. */
  ghostRef?: React.RefObject<THREE.Group | null>;
  /** Joystick visual state, written here, read by the overlay's rAF loop (touch). */
  touchVisualRef?: React.RefObject<TouchVisualState>;
  /** Current reticle hit, read by the mobile place/remove buttons (touch). */
  reticleRef?: React.RefObject<ReticleState | null>;
  /** Fires only when the plant under the reticle changes (cheap state update). */
  onTargetChange?: (plantId: number | null) => void;
  /** Fires only when reticle ground-validity flips (cheap state update). */
  onReticleValidChange?: (valid: boolean) => void;
  onPlaceAtReticle?: (x: number, z: number) => void;
  onRemoveAtReticle?: (plantId: number) => void;
};

const WALK_SPEED = 2.5;
const SPRINT_SPEED = 5;
const EYE_HEIGHT = 1.7;
const LOOK_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 3;
const REMOVE_RADIUS = 0.6;
const STICK_RADIUS = 50; // px — max thumb travel before clamp
const TOUCH_LOOK_RATE = 0.02; // radians per joystick unit per 60fps frame

export function FPVController({
  mode,
  enabled,
  isTouch,
  widthMeters,
  depthMeters,
  colliders,
  plants,
  ghostRef,
  touchVisualRef,
  reticleRef,
  onTargetChange,
  onReticleValidChange,
  onPlaceAtReticle,
  onRemoveAtReticle,
}: Props) {
  const { camera, gl } = useThree();

  // --- Shared input state (filled by either keyboard/mouse or touch) ---------
  const keys = useRef<Record<string, boolean>>({});
  const yaw = useRef(0);
  const pitch = useRef(0);
  const locked = useRef(false);
  const reticle = useRef<ReticleHit | null>(null);
  const lastTarget = useRef<number | null>(null);
  const lastValid = useRef<boolean | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const groundPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Touch joystick input (held-position joysticks → continuous rate).
  const moveVec = useRef({ x: 0, y: 0 });
  const lookVec = useRef({ x: 0, y: 0 });

  // Keep latest props in refs for the imperative DOM handlers.
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const plantsRef = useRef(plants);
  plantsRef.current = plants;
  const collidersRef = useRef(colliders);
  collidersRef.current = colliders;
  const placeRef = useRef(onPlaceAtReticle);
  placeRef.current = onPlaceAtReticle;
  const removeRef = useRef(onRemoveAtReticle);
  removeRef.current = onRemoveAtReticle;

  // Position the camera when entering FPV.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run only on enable
  useEffect(() => {
    if (!enabled) return;
    const cx = widthMeters / 2;
    const cz = depthMeters / 2;
    camera.position.set(cx, EYE_HEIGHT, cz + Math.max(depthMeters * 0.4, 3));
    camera.rotation.order = "YXZ";
    yaw.current = Math.PI; // face toward -Z (into the plot)
    pitch.current = -0.1;
  }, [enabled]);

  // --- Desktop input: pointer-lock + mouse-look + WASD (unchanged) -----------
  useEffect(() => {
    if (!enabled || isTouch) return;
    const dom = gl.domElement;

    const onClickCanvas = () => {
      if (!locked.current) {
        dom.requestPointerLock();
      } else if (modeRef.current === "build") {
        const hit = reticle.current;
        if (hit) placeRef.current?.(hit.x, hit.z);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!locked.current) return;
      yaw.current -= e.movementX * LOOK_SENSITIVITY;
      pitch.current -= e.movementY * LOOK_SENSITIVITY;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    };

    const onLockChange = () => {
      locked.current = document.pointerLockElement === dom;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (!locked.current || modeRef.current !== "build") return;
      e.preventDefault();
      const target = reticle.current?.plantId;
      if (target != null) removeRef.current?.(target);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (
        e.code === "KeyX" &&
        locked.current &&
        modeRef.current === "build"
      ) {
        const target = reticle.current?.plantId;
        if (target != null) removeRef.current?.(target);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    dom.addEventListener("click", onClickCanvas);
    dom.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      dom.removeEventListener("click", onClickCanvas);
      dom.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (document.pointerLockElement === dom) document.exitPointerLock();
      keys.current = {};
    };
  }, [enabled, isTouch, gl]);

  // --- Touch input: dual dynamic joysticks (no pointer lock) -----------------
  useEffect(() => {
    if (!enabled || !isTouch) return;
    const dom = gl.domElement;
    const prevTouchAction = dom.style.touchAction;
    dom.style.touchAction = "none";

    // identifier → which stick; identifier → origin (canvas-relative px)
    const assigned = new Map<number, "move" | "look">();
    const origins = new Map<number, { x: number; y: number }>();
    let moveId: number | null = null;
    let lookId: number | null = null;

    const writeVisual = (
      stick: "move" | "look",
      active: boolean,
      ox: number,
      oy: number,
      kx: number,
      ky: number,
    ) => {
      const tv = touchVisualRef?.current;
      if (!tv) return;
      tv[stick] = { active, ox, oy, kx, ky };
    };

    const onTouchStart = (e: TouchEvent) => {
      const rect = dom.getBoundingClientRect();
      for (const t of Array.from(e.changedTouches)) {
        const lx = t.clientX - rect.left;
        const ly = t.clientY - rect.top;
        const wantLook = lx > rect.width / 2;
        if (!wantLook && moveId === null) {
          moveId = t.identifier;
          assigned.set(t.identifier, "move");
          origins.set(t.identifier, { x: lx, y: ly });
          moveVec.current = { x: 0, y: 0 };
          writeVisual("move", true, lx, ly, lx, ly);
        } else if (wantLook && lookId === null) {
          lookId = t.identifier;
          assigned.set(t.identifier, "look");
          origins.set(t.identifier, { x: lx, y: ly });
          lookVec.current = { x: 0, y: 0 };
          writeVisual("look", true, lx, ly, lx, ly);
        }
      }
      e.preventDefault();
    };

    const onTouchMove = (e: TouchEvent) => {
      const rect = dom.getBoundingClientRect();
      for (const t of Array.from(e.changedTouches)) {
        const stick = assigned.get(t.identifier);
        const origin = origins.get(t.identifier);
        if (!stick || !origin) continue;
        let dx = t.clientX - rect.left - origin.x;
        let dy = t.clientY - rect.top - origin.y;
        const dist = Math.hypot(dx, dy);
        if (dist > STICK_RADIUS) {
          dx = (dx / dist) * STICK_RADIUS;
          dy = (dy / dist) * STICK_RADIUS;
        }
        const nx = dx / STICK_RADIUS;
        const ny = dy / STICK_RADIUS;
        if (stick === "move") moveVec.current = { x: nx, y: ny };
        else lookVec.current = { x: nx, y: ny };
        writeVisual(stick, true, origin.x, origin.y, origin.x + dx, origin.y + dy);
      }
      e.preventDefault();
    };

    const endTouch = (e: TouchEvent) => {
      for (const t of Array.from(e.changedTouches)) {
        const stick = assigned.get(t.identifier);
        if (!stick) continue;
        assigned.delete(t.identifier);
        origins.delete(t.identifier);
        if (stick === "move") {
          moveId = null;
          moveVec.current = { x: 0, y: 0 };
          writeVisual("move", false, 0, 0, 0, 0);
        } else {
          lookId = null;
          lookVec.current = { x: 0, y: 0 };
          writeVisual("look", false, 0, 0, 0, 0);
        }
      }
    };

    dom.addEventListener("touchstart", onTouchStart, { passive: false });
    dom.addEventListener("touchmove", onTouchMove, { passive: false });
    dom.addEventListener("touchend", endTouch);
    dom.addEventListener("touchcancel", endTouch);

    return () => {
      dom.removeEventListener("touchstart", onTouchStart);
      dom.removeEventListener("touchmove", onTouchMove);
      dom.removeEventListener("touchend", endTouch);
      dom.removeEventListener("touchcancel", endTouch);
      dom.style.touchAction = prevTouchAction;
      moveVec.current = { x: 0, y: 0 };
      lookVec.current = { x: 0, y: 0 };
      writeVisual("move", false, 0, 0, 0, 0);
      writeVisual("look", false, 0, 0, 0, 0);
    };
  }, [enabled, isTouch, gl, touchVisualRef]);

  const tmpForward = useRef(new THREE.Vector3());
  const tmpRight = useRef(new THREE.Vector3());
  const tmpMove = useRef(new THREE.Vector3());
  const tmpHit = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    if (!enabled) return;
    const dtFactor = Math.min(delta * 60, 3);

    // Look — touch applies a continuous turn rate; desktop yaw/pitch are already
    // updated by the mousemove handler (only while pointer-locked).
    if (isTouch) {
      const lv = lookVec.current;
      yaw.current -= lv.x * TOUCH_LOOK_RATE * dtFactor;
      pitch.current -= lv.y * TOUCH_LOOK_RATE * dtFactor;
      pitch.current = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, pitch.current));
    }
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    // Movement — gather direction + speed from the active input source.
    let fwdAmt = 0;
    let strafeAmt = 0;
    let speed = 0;
    const canMove = isTouch || locked.current;
    if (canMove) {
      if (isTouch) {
        const mv = moveVec.current;
        const mag = Math.min(1, Math.hypot(mv.x, mv.y));
        if (mag > 0.08) {
          fwdAmt = -mv.y; // push up = forward
          strafeAmt = mv.x; // push right = strafe right
          speed = SPRINT_SPEED * mag; // light push = slow, full push = sprint
        }
      } else {
        const k = keys.current;
        if (k.KeyW || k.ArrowUp) fwdAmt += 1;
        if (k.KeyS || k.ArrowDown) fwdAmt -= 1;
        if (k.KeyD || k.ArrowRight) strafeAmt += 1;
        if (k.KeyA || k.ArrowLeft) strafeAmt -= 1;
        speed = k.ShiftLeft ? SPRINT_SPEED : WALK_SPEED;
      }
    }

    if (fwdAmt !== 0 || strafeAmt !== 0) {
      tmpForward.current.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
      tmpRight.current.set(Math.cos(yaw.current), 0, -Math.sin(yaw.current));
      tmpMove.current
        .set(0, 0, 0)
        .addScaledVector(tmpForward.current, fwdAmt)
        .addScaledVector(tmpRight.current, strafeAmt)
        .normalize()
        .multiplyScalar(speed * delta);

      const nextX = camera.position.x + tmpMove.current.x;
      const nextZ = camera.position.z + tmpMove.current.z;

      // Plant collision — skip the move if it lands inside a collider.
      let blocked = false;
      for (const c of collidersRef.current) {
        const dx = nextX - c.x;
        const dz = nextZ - c.z;
        const rr = c.radius + 0.3;
        if (dx * dx + dz * dz < rr * rr) {
          blocked = true;
          break;
        }
      }
      if (!blocked) {
        camera.position.x = nextX;
        camera.position.z = nextZ;
      }
    }

    // Boundary clamp + fixed eye height.
    camera.position.x = Math.max(-3, Math.min(widthMeters + 3, camera.position.x));
    camera.position.z = Math.max(-3, Math.min(depthMeters + 3, camera.position.z));
    camera.position.y = EYE_HEIGHT;

    // Build-mode reticle: raycast camera centre against the ground plane.
    if (modeRef.current === "build") {
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const hitPoint = raycaster.current.ray.intersectPlane(
        groundPlane.current,
        tmpHit.current,
      );
      if (hitPoint) {
        const hx = hitPoint.x;
        const hz = hitPoint.z;
        // Nearest plant within removal radius (under-reticle target).
        let targetId: number | null = null;
        let best = REMOVE_RADIUS * REMOVE_RADIUS;
        for (const p of plantsRef.current) {
          const dx = hx - p.x;
          const dz = hz - p.z;
          const d2 = dx * dx + dz * dz;
          if (d2 < best) {
            best = d2;
            targetId = p.id;
          }
        }
        reticle.current = { x: hx, z: hz, plantId: targetId };
        if (reticleRef) reticleRef.current = { x: hx, z: hz, plantId: targetId, valid: true };

        if (ghostRef?.current) {
          ghostRef.current.position.set(hx, 0, hz);
          ghostRef.current.visible = targetId == null;
        }
        if (targetId !== lastTarget.current) {
          lastTarget.current = targetId;
          onTargetChange?.(targetId);
        }
        if (lastValid.current !== true) {
          lastValid.current = true;
          onReticleValidChange?.(true);
        }
      } else {
        reticle.current = null;
        if (reticleRef) reticleRef.current = { x: 0, z: 0, plantId: null, valid: false };
        if (ghostRef?.current) ghostRef.current.visible = false;
        if (lastValid.current !== false) {
          lastValid.current = false;
          onReticleValidChange?.(false);
        }
      }
    } else if (ghostRef?.current) {
      ghostRef.current.visible = false;
    }
  });

  return null;
}
