"use client";

import { useFrame, type ThreeElements } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import {
  CatmullRomCurve3,
  ExtrudeGeometry,
  ShapeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshPhysicalMaterial,
  type Texture,
} from "three";
import { normalizeUVs, roundedRectShape } from "./geometry";

/** Creates a geometry once per component and frees its GPU memory on unmount. */
function useGeometry<T extends { dispose: () => void }>(factory: () => T): T {
  const [geometry] = useState(factory);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

const extrude = (w: number, h: number, r: number, depth: number, bevel: number) =>
  new ExtrudeGeometry(roundedRectShape(w, h, r), {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 14,
  });

type GroupProps = ThreeElements["group"];

// ---------------------------------------------------------------------------
// Generic smartphone (no real brand's shapes: plain slab, generic camera)
// ---------------------------------------------------------------------------

const MODERN = { w: 1, h: 2.08, r: 0.17, depth: 0.08, bevel: 0.035, screenW: 0.98, screenH: 2.02, screenR: 0.14 };
const CLASSIC = { w: 0.94, h: 1.86, r: 0.13, depth: 0.15, bevel: 0.03, screenW: 0.8, screenH: 1.32, screenR: 0.03 };

export function Phone({
  color = "#2a2d36",
  variant = "modern",
  screenTexture,
  screenRef,
  screenOn = 1,
  ...group
}: GroupProps & {
  color?: string;
  variant?: "modern" | "classic";
  screenTexture: Texture;
  /** To animate the screen glow from a parent (emissiveIntensity). */
  screenRef?: Ref<MeshPhysicalMaterial>;
  screenOn?: number;
}) {
  const d = variant === "modern" ? MODERN : CLASSIC;
  const front = d.depth / 2 + d.bevel;
  // The variant is fixed for the life of the component (give it a new key to change it).
  const body = useGeometry(() => extrude(d.w, d.h, d.r, d.depth, d.bevel));
  const screen = useGeometry(() => normalizeUVs(new ShapeGeometry(roundedRectShape(d.screenW, d.screenH, d.screenR), 12)));
  const cameraModule = useGeometry(() => extrude(0.42, 0.42, 0.12, 0.03, 0.015));

  return (
    <group {...group}>
      <mesh geometry={body} position-z={-d.depth / 2}>
        <meshPhysicalMaterial color={color} metalness={0.45} roughness={0.28} clearcoat={1} clearcoatRoughness={0.15} />
      </mesh>
      {/* Screen: black glass, glows when "on" */}
      <mesh geometry={screen} position={[0, variant === "classic" ? 0.02 : 0, front + 0.002]}>
        <meshPhysicalMaterial
          ref={screenRef}
          color="#05070c"
          roughness={0.12}
          metalness={0}
          clearcoat={1}
          emissive="#ffffff"
          emissiveMap={screenTexture}
          emissiveIntensity={screenOn}
        />
      </mesh>
      {variant === "modern" ? (
        <mesh position={[0, d.h / 2 - 0.1, front + 0.004]}>
          <circleGeometry args={[0.028, 16]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      ) : (
        <mesh position={[0, -d.h / 2 + 0.16, front + 0.003]}>
          <circleGeometry args={[0.07, 24]} />
          <meshPhysicalMaterial color="#1a1c22" roughness={0.4} />
        </mesh>
      )}
      {/* Back: generic camera module */}
      <group position={[-d.w / 2 + 0.3, d.h / 2 - 0.32, -front]} rotation-y={Math.PI}>
        {variant === "modern" && (
          <mesh geometry={cameraModule} position-z={-0.02}>
            <meshPhysicalMaterial color={color} metalness={0.5} roughness={0.22} clearcoat={1} />
          </mesh>
        )}
        {(variant === "modern" ? [[-0.09, 0.09], [0.09, -0.09]] : [[0, 0]]).map(([x, y]) => (
          <group key={`${x}${y}`} position={[x, y, variant === "modern" ? 0.05 : 0.02]}>
            <mesh rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.075, 0.075, 0.04, 24]} />
              <meshPhysicalMaterial color="#c7ccd6" metalness={1} roughness={0.25} />
            </mesh>
            <mesh position-z={0.021}>
              <circleGeometry args={[0.058, 24]} />
              <meshPhysicalMaterial color="#0a0f1c" metalness={0.3} roughness={0.05} clearcoat={1} />
            </mesh>
          </group>
        ))}
      </group>
      {/* Side buttons */}
      <mesh position={[d.w / 2 + d.bevel + 0.008, 0.45, 0]}>
        <boxGeometry args={[0.02, 0.28, 0.05]} />
        <meshPhysicalMaterial color={color} metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Accessories (Max Protection Package)
// ---------------------------------------------------------------------------

export function PhoneCase(props: GroupProps & { materialRef?: Ref<MeshPhysicalMaterial> }) {
  const { materialRef, ...group } = props;
  const back = useGeometry(() => extrude(1.16, 2.24, 0.22, 0.02, 0.015));
  const rim = useGeometry(() => {
    const outer = roundedRectShape(1.2, 2.28, 0.23);
    outer.holes.push(roundedRectShape(1.08, 2.16, 0.19));
    return new ExtrudeGeometry(outer, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 2, curveSegments: 14 });
  });
  return (
    <group {...group}>
      <mesh geometry={back} position-z={-0.14}>
        <meshPhysicalMaterial ref={materialRef} color="#0066ff" roughness={0.35} transparent opacity={0.55} clearcoat={0.6} />
      </mesh>
      <mesh geometry={rim} position-z={-0.12}>
        <meshPhysicalMaterial color="#0066ff" roughness={0.35} transparent opacity={0.55} clearcoat={0.6} />
      </mesh>
    </group>
  );
}

export function ScreenProtector(props: GroupProps) {
  const glass = useGeometry(() => extrude(0.98, 2.02, 0.14, 0.008, 0.004));
  return (
    <group {...props}>
      <mesh geometry={glass}>
        <meshPhysicalMaterial color="#dbe8ff" roughness={0.02} metalness={0} transparent opacity={0.4} clearcoat={1} />
      </mesh>
    </group>
  );
}

/** Generic European wall charger (two round pins, one USB-C port). */
export function WallCharger(props: GroupProps) {
  const body = useGeometry(() => extrude(0.5, 0.5, 0.1, 0.34, 0.04));
  return (
    <group {...props}>
      <mesh geometry={body} position-z={-0.17}>
        <meshPhysicalMaterial color="#f7f8fa" roughness={0.45} clearcoat={0.4} />
      </mesh>
      {[-0.1, 0.1].map((x) => (
        <mesh key={x} position={[x, 0, -0.34]} rotation-x={Math.PI / 2}>
          <cylinderGeometry args={[0.024, 0.024, 0.34, 12]} />
          <meshPhysicalMaterial color="#c7ccd6" metalness={1} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, -0.04, 0.215]}>
        <boxGeometry args={[0.14, 0.05, 0.02]} />
        <meshBasicMaterial color="#1a1c22" />
      </mesh>
      <mesh position={[0, 0.13, 0.212]}>
        <circleGeometry args={[0.02, 12]} />
        <meshBasicMaterial color="#0066ff" />
      </mesh>
    </group>
  );
}

export function ChargingCable(props: GroupProps) {
  const curve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(-0.7, 0.5, 0),
        new Vector3(-0.2, 0.7, 0.2),
        new Vector3(0.25, 0.25, -0.1),
        new Vector3(-0.1, -0.15, 0.15),
        new Vector3(0.35, -0.4, 0),
        new Vector3(0.75, -0.2, -0.1),
      ]),
    [],
  );
  const connector = (end: number) => {
    const point = curve.getPoint(end);
    const tangent = curve.getTangent(end);
    return (
      <mesh position={point} rotation-z={Math.atan2(tangent.y, tangent.x) - Math.PI / 2}>
        <boxGeometry args={[0.07, 0.16, 0.035]} />
        <meshPhysicalMaterial color="#f2f3f6" roughness={0.4} />
      </mesh>
    );
  };
  return (
    <group {...props}>
      <mesh>
        <tubeGeometry args={[curve, 80, 0.018, 8, false]} />
        <meshPhysicalMaterial color="#f7f8fa" roughness={0.5} />
      </mesh>
      {connector(0)}
      {connector(1)}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Small decorative parts
// ---------------------------------------------------------------------------

export function Chip(props: GroupProps) {
  return (
    <group {...props}>
      <mesh>
        <boxGeometry args={[0.36, 0.36, 0.05]} />
        <meshPhysicalMaterial color="#1c1f27" roughness={0.4} metalness={0.2} />
      </mesh>
      <mesh position-z={0.027}>
        <boxGeometry args={[0.16, 0.16, 0.005]} />
        <meshPhysicalMaterial color="#c7ccd6" metalness={1} roughness={0.2} />
      </mesh>
      {[-0.12, -0.04, 0.04, 0.12].flatMap((o) => [
        <mesh key={`l${o}`} position={[-0.2, o, 0]}><boxGeometry args={[0.06, 0.025, 0.01]} /><meshPhysicalMaterial color="#c7ccd6" metalness={1} roughness={0.3} /></mesh>,
        <mesh key={`r${o}`} position={[0.2, o, 0]}><boxGeometry args={[0.06, 0.025, 0.01]} /><meshPhysicalMaterial color="#c7ccd6" metalness={1} roughness={0.3} /></mesh>,
      ])}
    </group>
  );
}

export function Battery(props: GroupProps) {
  const body = useGeometry(() => extrude(0.36, 0.62, 0.06, 0.06, 0.02));
  return (
    <group {...props}>
      <mesh geometry={body} position-z={-0.03}>
        <meshPhysicalMaterial color="#2a2d36" roughness={0.35} metalness={0.3} clearcoat={0.5} />
      </mesh>
      <mesh position={[0, 0.12, 0.052]}>
        <planeGeometry args={[0.36, 0.1]} />
        <meshBasicMaterial color="#0066ff" />
      </mesh>
    </group>
  );
}

export function CameraModule(props: GroupProps) {
  const plate = useGeometry(() => extrude(0.4, 0.4, 0.1, 0.03, 0.015));
  return (
    <group {...props}>
      <mesh geometry={plate}>
        <meshPhysicalMaterial color="#c7ccd6" metalness={0.8} roughness={0.25} />
      </mesh>
      {[[-0.08, 0.08], [0.08, -0.08]].map(([x, y]) => (
        <mesh key={`${x}${y}`} position={[x, y, 0.05]}>
          <circleGeometry args={[0.06, 20]} />
          <meshPhysicalMaterial color="#0a0f1c" roughness={0.05} clearcoat={1} />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slow, endless drift for decorative parts (deterministic per seed). */
export function Drift({ seed, amplitude = 0.12, children, ...group }: GroupProps & { seed: number; amplitude?: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ clock }) => {
    const g = ref.current;
    if (!g) return;
    const t = clock.elapsedTime * 0.35 + seed * 10;
    g.position.y = Math.sin(t) * amplitude;
    g.position.x = Math.cos(t * 0.7) * amplitude * 0.5;
    g.rotation.x = Math.sin(t * 0.8) * 0.5 + seed;
    g.rotation.y = t * 0.4 + seed * 2;
  });
  return (
    <group {...group}>
      <group ref={ref}>{children}</group>
    </group>
  );
}

/** Soft shadow on an invisible floor under a floating model. */
export function SoftShadow({
  texture,
  meshRef,
  ...mesh
}: ThreeElements["mesh"] & { texture: Texture; meshRef?: Ref<Mesh> }) {
  return (
    <mesh ref={meshRef} rotation-x={-Math.PI / 2} {...mesh}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Camera-facing blue halo (glow that reads on white). */
export function Glow({
  texture,
  materialRef,
  ...mesh
}: ThreeElements["mesh"] & { texture: Texture; materialRef?: Ref<MeshBasicMaterial> }) {
  return (
    <mesh {...mesh}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
