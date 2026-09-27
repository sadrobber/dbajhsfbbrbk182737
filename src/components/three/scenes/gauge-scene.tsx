"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { TorusGeometry, type Group, type Mesh } from "three";
import type { SceneControls } from "../three-slot";
import { SoftShadow } from "./models";
import { Stage } from "./stage";
import { useSceneTextures } from "./textures";

const RADIUS = 1.32;
const TUBE = 0.13;
const SWEEP = Math.PI * 1.5; // 270° gauge, opening at the bottom, like the static version

/**
 * The Gauge as a glowing electric-blue tube that fills up to the current %.
 * `value` goes from 0 to the configured percent when the section comes into
 * view; the tube eases towards it.
 */
function GaugeContent({ value }: { value: number }) {
  const textures = useSceneTextures();
  const tilt = useRef<Group>(null);
  const fill = useRef<Mesh>(null);
  const halo = useRef<Mesh>(null);
  const cap = useRef<Mesh>(null);
  const shown = useRef(-1);
  const current = useRef(0);
  // Start almost empty; replaced as the value animates (never re-created on re-render).
  const start = useMemo(
    () => ({ fill: new TorusGeometry(RADIUS, TUBE, 18, 6, 0.01), halo: new TorusGeometry(RADIUS, TUBE * 2.1, 12, 6, 0.01) }),
    [],
  );

  useEffect(() => {
    const fillMesh = fill.current;
    const haloMesh = halo.current;
    return () => {
      fillMesh?.geometry.dispose();
      haloMesh?.geometry.dispose();
    };
  }, []);

  useFrame(({ clock }, delta) => {
    current.current += (value - current.current) * Math.min(1, delta * 2.2);
    const fraction = Math.max(0.002, Math.min(1, current.current / 100));
    // Rebuild the arc only when it visibly changed (a few times per animation).
    if (Math.abs(fraction - shown.current) > 0.003 && fill.current && halo.current) {
      shown.current = fraction;
      const arc = SWEEP * fraction;
      const segments = Math.max(6, Math.round(96 * fraction));
      fill.current.geometry.dispose();
      fill.current.geometry = new TorusGeometry(RADIUS, TUBE * 1.12, 18, segments, arc);
      halo.current.geometry.dispose();
      halo.current.geometry = new TorusGeometry(RADIUS, TUBE * 2.1, 12, segments, arc);
      cap.current?.position.set(Math.cos(arc) * RADIUS, Math.sin(arc) * RADIUS, 0);
    }
    if (tilt.current) {
      const t = clock.elapsedTime;
      tilt.current.rotation.x = -0.32 + Math.sin(t * 0.5) * 0.06;
      tilt.current.rotation.y = Math.sin(t * 0.35) * 0.12;
    }
  });

  return (
    <>
      <group ref={tilt}>
        {/* Mirror + rotate: starts bottom-left and fills clockwise over the top. */}
        <group scale={[-1, 1, 1]}>
          <group rotation-z={-Math.PI / 4}>
            <mesh>
              <torusGeometry args={[RADIUS, TUBE * 0.78, 18, 96, SWEEP]} />
              <meshPhysicalMaterial color="#e3e6ec" roughness={0.55} clearcoat={0.4} />
            </mesh>
            <mesh ref={fill} geometry={start.fill} scale={1.01}>
              <meshPhysicalMaterial
                color="#2a6ad0"
                emissive="#0047ff"
                emissiveIntensity={0.55}
                roughness={0.3}
                metalness={0.1}
                clearcoat={0.6}
                envMapIntensity={0.35}
                toneMapped={false}
              />
            </mesh>
            <mesh ref={halo} geometry={start.halo}>
              <meshBasicMaterial color="#4a86e0" transparent opacity={0.1} depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh ref={cap} position={[RADIUS, 0, 0]}>
              <sphereGeometry args={[TUBE * 1.35, 24, 16]} />
              <meshPhysicalMaterial color="#6ea8ec" emissive="#4a86e0" emissiveIntensity={1.4} roughness={0.2} />
            </mesh>
          </group>
        </group>
      </group>
      <SoftShadow texture={textures.shadow} position={[0, -1.75, -0.4]} scale={[3.4, 1.1, 1]} />
    </>
  );
}

export default function GaugeScene({ value, ...controls }: SceneControls & { value: number }) {
  return (
    <Stage {...controls} cameraZ={6.6}>
      <GaugeContent value={value} />
    </Stage>
  );
}
