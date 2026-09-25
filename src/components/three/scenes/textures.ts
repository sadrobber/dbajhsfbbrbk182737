"use client";

import { useEffect, useMemo } from "react";
import { createGlowTexture, createScreenTexture, createShadowTexture } from "./geometry";

/** Textures drawn in code for one canvas, freed when the scene unmounts. */
export function useSceneTextures() {
  const textures = useMemo(
    () => ({ screen: createScreenTexture(), shadow: createShadowTexture(), glow: createGlowTexture() }),
    [],
  );
  useEffect(
    () => () => {
      textures.screen.dispose();
      textures.shadow.dispose();
      textures.glow.dispose();
    },
    [textures],
  );
  return textures;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
