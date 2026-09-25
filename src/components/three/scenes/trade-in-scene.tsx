"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, Mesh, MeshPhysicalMaterial } from "three";
import { smoothstep } from "../support";
import type { SceneControls } from "../three-slot";
import { Battery, Chip, Drift, Glow, Phone, SoftShadow } from "./models";
import { Stage } from "./stage";
import { lerp, useSceneTextures } from "./textures";

const CYCLE = 6; // seconds

/** Trade-in: an old phone floats over to a new one and is swapped for it, on a loop. */
function TradeInContent() {
  const textures = useSceneTextures();
  const oldPhone = useRef<Group>(null);
  const newPhone = useRef<Group>(null);
  const newScreen = useRef<MeshPhysicalMaterial>(null);
  const dot = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const u = (t % CYCLE) / CYCLE;
    const appear = smoothstep(0, 0.12, u);
    const travel = smoothstep(0.12, 0.62, u);
    const vanish = smoothstep(0.45, 0.62, u);
    const received = smoothstep(0.55, 0.7, u) * (1 - smoothstep(0.85, 1, u));

    if (oldPhone.current) {
      const g = oldPhone.current;
      g.position.set(lerp(-1.05, 0.45, travel), -0.05 + Math.sin(travel * Math.PI) * 0.35, lerp(0, -0.3, travel));
      g.rotation.set(0.05, lerp(0.55, -0.4, travel), lerp(-0.12, 0.2, travel));
      g.scale.setScalar(Math.max(0.001, 0.72 * appear * (1 - vanish)));
    }
    if (newPhone.current) {
      newPhone.current.rotation.y = -0.4 + Math.sin(t * 0.6) * 0.08;
      newPhone.current.position.y = Math.sin(t * 1.1) * 0.05;
      newPhone.current.scale.setScalar(0.86 + received * 0.06);
    }
    if (newScreen.current) newScreen.current.emissiveIntensity = 0.35 + received * 0.95;
    if (dot.current) {
      const a = Math.PI * (0.92 - 0.84 * travel);
      dot.current.position.set(Math.cos(a) * 1.05 - 0.05, Math.sin(a) * 0.45 + 0.95, 0.2);
      dot.current.scale.setScalar(1 - vanish * 0.6);
    }
  });

  return (
    <>
      <Glow texture={textures.glow} position={[0.9, 0.1, -1.2]} scale={2.8} />
      <group ref={oldPhone}>
        <Phone variant="classic" color="#8b909b" screenTexture={textures.screen} screenOn={0.18} />
      </group>
      <group ref={newPhone} position-x={0.95}>
        <Phone screenTexture={textures.screen} screenRef={newScreen} color="#1f5fd6" screenOn={0.35} />
      </group>
      <mesh ref={dot}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshPhysicalMaterial color="#5aa9ff" emissive="#0a5cff" emissiveIntensity={1.2} />
      </mesh>
      <SoftShadow texture={textures.shadow} position={[0.95, -1.12, 0]} scale={[1.6, 0.7, 1]} />
      <SoftShadow texture={textures.shadow} position={[-0.5, -1.12, 0]} scale={[1.3, 0.5, 1]} />
      <Drift seed={0.4} position={[-1.55, 0.95, -1]} scale={0.5}>
        <Chip />
      </Drift>
      <Drift seed={0.7} position={[1.75, -0.85, -0.9]} scale={0.45}>
        <Battery />
      </Drift>
    </>
  );
}

export default function TradeInScene(controls: SceneControls) {
  return (
    <Stage {...controls} cameraZ={5.4}>
      <TradeInContent />
    </Stage>
  );
}
