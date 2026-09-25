"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type RefObject } from "react";
import type { Group, MeshBasicMaterial, MeshPhysicalMaterial } from "three";
import { smoothstep } from "../support";
import type { SceneControls } from "../three-slot";
import { ChargingCable, Glow, Phone, PhoneCase, ScreenProtector, SoftShadow, WallCharger } from "./models";
import { Stage } from "./stage";
import { lerp, useSceneTextures } from "./textures";

type Vec = [number, number, number];

/** Where each accessory sits when attached, and where it floats in the exploded view. */
const PARTS: Record<"case" | "protector" | "charger" | "cable", { home: Vec; out: Vec; spin: number }> = {
  case: { home: [0, 0, 0], out: [-1.5, 0.2, -0.9], spin: 0.6 },
  protector: { home: [0, 0, 0.1], out: [0.3, 0.35, 1.3], spin: -0.25 },
  charger: { home: [0.2, -0.3, -0.5], out: [1.6, 0.6, 0.1], spin: 0.8 },
  cable: { home: [0, -0.4, -0.4], out: [1.35, -0.8, 0.3], spin: -0.4 },
};

/**
 * "More than just a phone", driven by scroll:
 * first the Max Protection accessories float out around the phone (exploded
 * view), then they settle back and the phone powers on (Ready-to-Use).
 */
function PackagesContent({ progress }: { progress: RefObject<number> }) {
  const textures = useSceneTextures();
  const width = useThree((state) => state.viewport.width);
  const phone = useRef<Group>(null);
  const caseRef = useRef<Group>(null);
  const protectorRef = useRef<Group>(null);
  const chargerRef = useRef<Group>(null);
  const cableRef = useRef<Group>(null);
  const screen = useRef<MeshPhysicalMaterial>(null);
  const glow = useRef<MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    const p = progress.current ?? 0;
    const explode = smoothstep(0.08, 0.4, p) * (1 - smoothstep(0.5, 0.7, p));
    const power = smoothstep(0.55, 0.8, p);
    const spread = Math.min(1.35, Math.max(0.62, width / 4.6)); // wider stage, wider explosion
    const t = clock.elapsedTime;

    if (phone.current) {
      phone.current.rotation.y = lerp(-0.5, -0.12, power) + Math.sin(t * 0.5) * 0.08;
      phone.current.rotation.x = -0.05 + Math.sin(t * 0.4) * 0.03;
      phone.current.position.y = Math.sin(t * 1.1) * 0.05;
    }
    const groups = { case: caseRef.current, protector: protectorRef.current, charger: chargerRef.current, cable: cableRef.current };
    for (const key of Object.keys(PARTS) as (keyof typeof PARTS)[]) {
      const group = groups[key];
      if (!group) continue;
      const { home, out, spin } = PARTS[key];
      group.position.set(lerp(home[0], out[0] * spread, explode), lerp(home[1], out[1], explode), lerp(home[2], out[2], explode));
      group.rotation.y = spin * explode + (key === "charger" || key === "cable" ? t * 0.3 * explode : 0);
      if (key === "charger" || key === "cable") group.scale.setScalar(Math.max(0.001, explode));
    }
    if (screen.current) screen.current.emissiveIntensity = 0.05 + power * 1.25;
    if (glow.current) glow.current.opacity = power * 0.85;
  });

  return (
    <>
      <Glow texture={textures.glow} materialRef={glow} position={[0, 0.1, -1.3]} scale={4.4} />
      <group ref={phone}>
        <Phone screenTexture={textures.screen} screenRef={screen} color="#23262f" screenOn={0.05} />
        <group ref={caseRef}>
          <PhoneCase />
        </group>
        <group ref={protectorRef}>
          <ScreenProtector />
        </group>
      </group>
      <group ref={chargerRef}>
        <WallCharger scale={1.1} />
      </group>
      <group ref={cableRef}>
        <ChargingCable scale={0.9} />
      </group>
      <SoftShadow texture={textures.shadow} position={[0, -1.3, 0]} scale={[2.2, 1, 1]} />
    </>
  );
}

export default function PackagesScene({ progress, ...controls }: SceneControls & { progress: RefObject<number> }) {
  return (
    <Stage {...controls} cameraZ={5.7}>
      <PackagesContent progress={progress} />
    </Stage>
  );
}
