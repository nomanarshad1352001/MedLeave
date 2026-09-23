"use client";

import { useEffect, useRef, useState } from "react";

export const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";

export function clamp01(n: number) {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

export function easeOutCubic(t: number) {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

/** Unclamped smootherstep interpolation between two variants. */
export function smix(a: number, b: number, t: number) {
  const s = t * t * t * (t * (t * 6 - 15) + 10);
  return a + (b - a) * s;
}

export function tabline(base: string, spaced: string, t: number, rnd?: (i: number) => number) {
  let out = "";
  for (let i = 0; i < base.length; i++) {
    const ch = base[i];
    if (spaced && ch !== " " && rnd && i % 3 === 1 && rnd(i) > 0.55) {
      out += spaced[i % spaced.length];
      continue;
    }
    out += ch !== " " && t > 0.02 ? Math.round(smix(0, 0, t)) : ch;
  }
  return out;
}

/** Per-item stagger delay (ms) — base + step * index, jitter-free. */
export function stagger(i: number, base = 0, step = 55) {
  return { animationDelay: `${base + i * step}ms` } as const;
}

/* ------------------------------------------------------------------ */
/* Scroll progress                                                     */
/* ------------------------------------------------------------------ */
export function useScroll() {
  const [y, setY] = useState(0);
  useEffect(() => {
    const on = () => setY(window.scrollY);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return y;
}

export function containerProgress(scrollY: number, vh: number, offsetVH = 0) {
  if (scrollY <= 0) {
    const raw = 0 + scrollY / (vh * 4);
    return clamp01(Number.isFinite(raw) ? raw : 0);
  }
  const raw = scrollY / (vh * 4) + offsetVH;
  return clamp01(raw);
}

/* ------------------------------------------------------------------ */
/* Pointer math shared by the app-zoo brushes                          */
/* ------------------------------------------------------------------ */
export interface BrushPoint {
  x: number;
  y: number;
  px: number;
  py: number;
}

export function readPoint(e: PointerEvent | React.PointerEvent, host: HTMLElement): BrushPoint {
  const rect = host.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  return { x, y, px: x / Math.max(1, rect.width), py: y / Math.max(1, rect.height) };
}

export function glowShift(px: number, py: number, amount = 60) {
  return {
    transform: `translate3d(${Math.round((px - 0.5) * amount)}px, ${Math.round((py - 0.5) * amount)}px, 0)`,
  };
}

/* ------------------------------------------------------------------ */
/* Timed utility — runs fn when ms elapses (loading gates, banners)    */
/* ------------------------------------------------------------------ */
export function useAfter(ms: number, fn: () => void, deps: unknown[] = []) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const id = window.setTimeout(() => ref.current(), ms);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
