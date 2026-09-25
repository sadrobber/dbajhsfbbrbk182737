"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { Group, Mesh, MeshBasicMaterial } from "three";
import type { SceneControls } from "../three-slot";
import { Battery, CameraModule, ChargingCable, Chip, Drift, Glow, Phone, SoftShadow } from "./models";
import { Stage } from "./stage";
import { useSceneTextures } from "./textures";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Hero: a generic phone floating and slowly turning, electric-blue rim light on
 * white. Turns further as the page scrolls; follows the mouse on computers and
 * the finger or the phone's tilt on mobile (no permission prompts).
 */
function HeroContent() {
  const textures = useSceneTextures();
  const phone = useRef<Group>(null);
  const shadow = useRef<Mesh>(null);
  const glow = useRef<MeshBasicMaterial>(null);
  const input = useRef({ x: 0, y: 0 });
  const eased = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const fromPoint = (clientX: number, clientY: number) => {
      input.current.y = (clientX / window.innerWidth - 0.5) * 0.7;
      input.current.x = (clientY / window.innerHeight - 0.5) * 0.3;
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType === "mouse") fromPoint(e.clientX, e.clientY);
    };
    const onTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) fromPoint(touch.clientX, touch.clientY);
    };
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      input.current.x = clamp((e.beta - 45) / 90, -0.3, 0.3);
      input.current.y = clamp(e.gamma / 45, -0.6, 0.6);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("deviceorientation", onTilt, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("deviceorientation", onTilt);
    };
  }, []);

  useFrame(({ clock }, delta) => {
    const g = phone.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const scroll = clamp(window.scrollY / window.innerHeight, 0, 1.2);
    const follow = Math.min(1, delta * 3);
    eased.current.x += (input.current.x - eased.current.x) * follow;
    eased.current.y += (input.current.y - eased.current.y) * follow;

    const bob = Math.sin(t * 1.1) * 0.08;
    g.position.y = 0.15 + bob + scroll * 0.3;
    g.rotation.y = -0.55 + t * 0.3 + scroll * 1.8 + eased.current.y;
    g.rotation.x = -0.06 + eased.current.x + scroll * 0.12;
    g.rotation.z = 0.07 + Math.sin(t * 0.6) * 0.02;

    if (shadow.current) {
      const s = 1.9 - bob * 1.5;
      shadow.current.scale.set(s, s * 0.45, 1);
      (shadow.current.material as MeshBasicMaterial).opacity = 0.85 - bob * 2;
    }
    if (glow.current) glow.current.opacity = 0.55 + Math.sin(t * 0.9) * 0.1;
  });

  return (
    <>
      <Glow texture={textures.glow} materialRef={glow} position={[0.1, 0.25, -1.4]} scale={3.6} />
      <group ref={phone}>
        <Phone screenTexture={textures.screen} color="#23262f" screenOn={1.15} />
      </group>
      <SoftShadow texture={textures.shadow} meshRef={shadow} position={[0, -1.3, 0]} />
      <Drift seed={0.2} position={[-1.2, 0.95, -0.8]} scale={0.7}>
        <Chip />
      </Drift>
      <Drift seed={0.55} position={[1.25, -0.55, -0.6]} scale={0.62}>
        <Battery />
      </Drift>
      <Drift seed={0.8} position={[1.15, 1.05, -1]} scale={0.66}>
        <CameraModule />
      </Drift>
      <Drift seed={0.35} position={[-1.2, -0.85, -0.4]} scale={0.32} amplitude={0.16}>
        <ChargingCable />
      </Drift>
    </>
  );
}

export default function HeroScene(controls: SceneControls) {
  return (
    <Stage {...controls} cameraZ={6.1}>
      <HeroContent />
    </Stage>
  );
}
