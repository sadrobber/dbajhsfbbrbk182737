"use client";

import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { useEffect, useRef, type ReactNode } from "react";
import { PMREMGenerator, type Texture } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SceneControls } from "../three-slot";

/** Neutral studio reflections generated in code (no downloaded HDR files). */
function createStudioEnvironment({ gl, scene }: RootState): Texture {
  const pmrem = new PMREMGenerator(gl);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = texture;
  scene.environmentIntensity = 0.55;
  return texture;
}

/** White studio light + electric-blue rim lights from behind the models. */
function Lights() {
  return (
    <>
      <hemisphereLight args={["#ffffff", "#dde4f0", 1.1]} />
      <directionalLight position={[3, 4, 6]} intensity={1.5} />
      {/* Electric-blue rim lights, from behind the models */}
      <directionalLight position={[-4, 2.5, -4]} intensity={7} color="#1f6fff" />
      <directionalLight position={[4, -1.5, -3.5]} intensity={5.5} color="#3d8bff" />
      <directionalLight position={[0, 5, -3]} intensity={3} color="#5aa9ff" />
    </>
  );
}

/**
 * Keeps things smooth: measures frame rate after a short warm-up; lowers the
 * resolution if needed, and gives up (static image) if even that is too slow.
 */
function PerformanceGuard({ onReady, onSlow }: Pick<SceneControls, "onReady" | "onSlow">) {
  const setDpr = useThree((state) => state.setDpr);
  const dpr = useThree((state) => state.viewport.dpr);
  const frames = useRef(0);
  const elapsed = useRef(0);
  const reported = useRef(false);
  const lowered = useRef(false);

  useFrame((_, delta) => {
    frames.current += 1;
    if (frames.current === 3 && !reported.current) {
      reported.current = true;
      onReady();
    }
    if (frames.current < 20) return; // warm-up: shader compilation, first uploads
    elapsed.current += Math.min(delta, 0.25);
    if (frames.current < 110) return;

    const fps = (frames.current - 20) / elapsed.current;
    frames.current = 0;
    elapsed.current = 0;
    if (fps >= 45) return;
    if (!lowered.current && dpr > 1) {
      lowered.current = true;
      setDpr(1);
    } else if (fps < 30) {
      onSlow();
    }
  });
  return null;
}

export function Stage({
  active,
  onReady,
  onSlow,
  children,
  cameraZ = 7,
  fov = 30,
}: SceneControls & { children: ReactNode; cameraZ?: number; fov?: number }) {
  const environment = useRef<Texture | null>(null);
  useEffect(() => () => environment.current?.dispose(), []);
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, cameraZ], fov }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      onCreated={(state) => {
        state.gl.setClearColor(0x000000, 0);
        environment.current = createStudioEnvironment(state);
      }}
    >
      <Lights />
      <PerformanceGuard onReady={onReady} onSlow={onSlow} />
      {children}
    </Canvas>
  );
}
