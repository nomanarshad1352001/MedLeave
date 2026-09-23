"use client";

import { useEffect, useRef } from "react";
import { clamp01 } from "@/lib/anim";

/**
 * The App-Zoo: a pointer-reactive animated backdrop for the entire app shell.
 * Parallax mesh blobs, drifting surgical arcs, sweeping gold filaments and
 * floating EMR particle fragments — always beneath the content, always moving.
 */
export function AppZoo({
  kind = "mesh",
  pointer,
  speed = 1,
  className = "",
}: {
  kind?: "mesh" | "roster" | "hero" | "calm";
  pointer?: { dx: number; dy: number };
  speed?: number;
  className?: string;
}) {
  const pmRef = useRef<HTMLDivElement>(null);
  const roRef = useRef<HTMLDivElement>(null);
  const heRef = useRef<HTMLDivElement>(null);
  const caRef = useRef<HTMLDivElement>(null);
  const gl = useRef<HTMLDivElement>(null);

  // Brushes
  const blobA = useRef<HTMLSpanElement>(null);
  const blobB = useRef<HTMLSpanElement>(null);
  const blobC = useRef<HTMLSpanElement>(null);
  const ribbonA = useRef<HTMLSpanElement>(null);
  const ribbonB = useRef<HTMLSpanElement>(null);

  const p0 = useRef<HTMLSpanElement>(null);
  const p1 = useRef<HTMLSpanElement>(null);
  const p2 = useRef<HTMLSpanElement>(null);
  const p3 = useRef<HTMLSpanElement>(null);
  const p4 = useRef<HTMLSpanElement>(null);
  const p5 = useRef<HTMLSpanElement>(null);

  // Arrow glyphs
  const aUp = useRef<SVGSVGElement>(null);
  const aDn = useRef<SVGSVGElement>(null);
  const aRt = useRef<SVGSVGElement>(null);
  const aLt = useRef<SVGSVGElement>(null);

  /* measure & fade in once mounted — avoids any first-frame jump */
  useEffect(() => {
    const fadeIn = (r: React.RefObject<HTMLDivElement | null>, delay: number) => {
      const el = r.current;
      if (!el) return;
      el.style.setProperty("--o", "0");
      requestAnimationFrame(() => {
        el.style.setProperty("--o", "1");
        el.style.transitionDelay = `${delay}ms`;
      });
    };
    fadeIn(pmRef, 0);
    fadeIn(roRef, 60);
    fadeIn(heRef, 90);
    fadeIn(caRef, 120);
    return () => {
      if (gl.current) gl.current = null;
    };
  }, []);

  /* pointer-reactive brush drift */
  useEffect(() => {
    const dx = pointer?.dx ?? 0;
    const dy = pointer?.dy ?? 0;
    const k = kind === "mesh" ? 1 : kind === "roster" ? 0.7 : kind === "hero" ? 1.3 : 0.45;
    const apply = (el: HTMLSpanElement | null, mx: number, my: number, extra = "") => {
      if (el) el.style.transform = `translate3d(${Math.round(dx * mx * k)}px, ${Math.round(dy * my * k)}px, 0)${extra}`;
    };
    apply(blobA.current, 26, 18);
    apply(blobB.current, -30, 24);
    apply(blobC.current, 18, -26);
    apply(ribbonA.current, 40, -14);
    apply(ribbonB.current, -36, 16);
    const seg = clamp01(dx / 220 + 0.5);
    const arrows: Array<[React.RefObject<SVGSVGElement | null>, number]> = [
      [aUp, seg], [aDn, seg], [aRt, seg], [aLt, seg],
    ];
    for (const [r, v] of arrows) {
      if (!r.current) continue;
      r.current.style.opacity = String(0.12 + Math.abs(v - 0.5) * 0.5);
    }
    // fragments drift slower & counter
    apply(p0.current, -12, 30);
    apply(p1.current, 20, -34);
    apply(p2.current, -24, -16);
    apply(p3.current, 14, 26);
    apply(p4.current, -18, -30);
    apply(p5.current, 26, 12);
  }, [pointer, kind]);

  const dur = (n: number) => `${Math.max(6, n / Math.max(0.3, speed))}s`;

  const Wrap = ({
    refn,
    children,
    inView = true,
    show,
  }: {
    refn: React.RefObject<HTMLDivElement | null>;
    children: React.ReactNode;
    inView?: boolean;
    show: boolean;
  }) => (
    <div
      ref={refn}
      aria-hidden
      className={className || "pointer-events-none absolute inset-0 overflow-hidden"}
      style={{
        opacity: show && inView ? "var(--o, 0)" : 0,
        transition: "opacity 1.1s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      {children}
    </div>
  );

  const glow = (
    <div aria-hidden className="absolute inset-0" style={{ mixBlendMode: "normal" }}>
      <div
        className="absolute -right-16 -top-16 h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(13,148,136,0.10), transparent 65%)" }}
      />
      <div
        className="absolute -left-24 bottom-10 h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(13,148,136,0.12), transparent 65%)" }}
      />
    </div>
  );

  if (kind === "calm") {
    return (
      <Wrap refn={caRef} show>
        {glow}
        <span
          ref={blobA}
          className="ent-item ghost absolute right-[9%] top-[14%] h-40 w-40 rounded-full bg-slate-200/40 blur-2xl"
          style={{ animation: `entrance-item .7s var(--ease) both, float-slow ${dur(11)} ease-in-out 1s infinite` }}
        />
      </Wrap>
    );
  }

  return (
    <>
      <Wrap refn={pmRef} show={kind === "mesh"}>
        {glow}
        {/* mesh blobs */}
        <span
          ref={blobA}
          className="ghost absolute left-[6%] top-[8%] h-[36vh] w-[26vw] rounded-[46%] bg-gradient-to-br from-slate-200/50 via-slate-100/40 to-transparent blur-3xl"
          style={{ animation: `float ${dur(9)} ease-in-out infinite` }}
        />
        <span
          ref={blobB}
          className="ghost absolute right-[4%] top-[30%] h-[30vh] w-[22vw] rounded-[48%] bg-gradient-to-tl from-teal-200/45 via-teal-100/35 to-transparent blur-3xl"
          style={{ animation: `float-slow ${dur(13)} ease-in-out infinite` }}
        />
        <span
          ref={blobC}
          className="ghost absolute bottom-[6%] left-[34%] h-[34vh] w-[30vw] rounded-[52%] bg-gradient-to-tr from-slate-100/55 to-transparent blur-3xl"
          style={{ animation: `float ${dur(16)} ease-in-out 0.6s infinite` }}
        />
        {/* filaments */}
        <span
          ref={ribbonA}
          className="ghost absolute left-[-8%] top-[46%] h-[540px] w-[130%] rotate-[-7deg] bg-gradient-to-r from-transparent via-slate-200/60 to-transparent blur-2xl"
          style={{ animation: `float-slow ${dur(18)} ease-in-out infinite` }}
        />
        <span
          ref={ribbonB}
          className="ghost absolute left-[-14%] top-[16%] h-[460px] w-[130%] rotate-[5deg] bg-gradient-to-r from-transparent via-teal-200/40 to-transparent blur-2xl"
          style={{ animation: `float ${dur(22)} ease-in-out 1.2s infinite` }}
        />
        {/* drifting fragments */}
        <span ref={p0} className="ghost absolute left-[18%] top-[20%] h-2 w-2 rounded-full bg-slate-500/50" style={{ animation: `float ${dur(7)} ease-in-out infinite` }} />
        <span ref={p1} className="ghost absolute right-[24%] top-[12%] h-1.5 w-1.5 rounded-full bg-teal-500/60" style={{ animation: `float ${dur(8)} ease-in-out 0.4s infinite` }} />
        <span ref={p2} className="ghost absolute left-[46%] top-[64%] h-1.5 w-8 rounded-full bg-slate-300/70" style={{ animation: `float-slow ${dur(10)} ease-in-out infinite` }} />
        <span ref={p3} className="ghost absolute right-[12%] bottom-[22%] h-2 w-2 rounded-full bg-slate-700/35" style={{ animation: `float ${dur(9)} ease-in-out 0.8s infinite` }} />
        <span ref={p4} className="ghost absolute left-[8%] bottom-[30%] h-1.5 w-1.5 rounded-full bg-rose-500/40" style={{ animation: `float ${dur(11)} ease-in-out 0.2s infinite` }} />
        <span ref={p5} className="ghost absolute right-[38%] bottom-[10%] h-1 w-6 rounded-full bg-teal-400/60" style={{ animation: `float-slow ${dur(8)} ease-in-out 1s infinite` }} />
        {/* pointer-following activity arrows */}
        <svg ref={aUp} viewBox="0 0 24 24" className="ghost absolute left-[26%] top-[34%] h-5 w-5 text-slate-700" style={{ transition: "opacity .5s" }}><path fill="currentColor" d="M12 4l7 9h-4v7h-6v-7H5z" /></svg>
        <svg ref={aDn} viewBox="0 0 24 24" className="ghost absolute right-[30%] top-[52%] h-5 w-5 text-rose-500" style={{ transition: "opacity .5s" }}><path fill="currentColor" d="M12 20l-7-9h4V4h6v7h4z" /></svg>
        <svg ref={aRt} viewBox="0 0 24 24" className="ghost absolute left-[60%] top-[18%] h-5 w-5 text-teal-600" style={{ transition: "opacity .5s" }}><path fill="currentColor" d="M20 12l-9 7v-4H4v-6h7V5z" /></svg>
        <svg ref={aLt} viewBox="0 0 24 24" className="ghost absolute left-[32%] bottom-[14%] h-5 w-5 text-slate-600" style={{ transition: "opacity .5s" }}><path fill="currentColor" d="M4 12l9-7v4h7v6h-7v4z" /></svg>
        {/* delicate rings */}
        <span className="ghost absolute right-[16%] top-[36%] h-28 w-28 rounded-full border border-slate-900/10" style={{ animation: `float ${dur(12)} ease-in-out infinite` }} />
        <span className="ghost absolute left-[52%] top-[8%] h-16 w-16 rounded-full border border-teal-500/25" style={{ animation: `float-slow ${dur(10)} ease-in-out 0.5s infinite` }} />
      </Wrap>

      <Wrap refn={roRef} show={kind === "roster"}>
        {glow}
        {/* staff-order horizon — a stave of roster ticks drifting upward */}
        <div className="absolute inset-x-0 top-0 h-full opacity-60">
          {[...Array(9)].map((_, i) => (
            <span
              key={i}
              className="ghost absolute h-[2px] rounded-full bg-slate-900/[0.08]"
              style={{
                top: `${8 + i * 11}%`,
                left: `${(i % 3) * 18}%`,
                width: `${30 + (i % 4) * 12}%`,
                animation: `float ${dur(14 + i * 2)} ease-in-out ${i * 0.35}s infinite`,
              }}
            />
          ))}
        </div>
        <span ref={blobA} className="ghost absolute right-[10%] top-[24%] h-[26vh] w-[20vw] rounded-full bg-slate-200/45 blur-3xl" style={{ animation: `float ${dur(11)} ease-in-out infinite` }} />
        <span ref={blobB} className="ghost absolute left-[8%] bottom-[14%] h-[22vh] w-[18vw] rounded-full bg-teal-200/40 blur-3xl" style={{ animation: `float-slow ${dur(13)} ease-in-out 0.4s infinite` }} />
      </Wrap>

      <Wrap refn={heRef} show={kind === "hero"}>
        {glow}
        <span
          ref={ribbonA}
          className="ghost absolute left-[-10%] top-[30%] h-[640px] w-[140%] rotate-[-9deg] bg-gradient-to-r from-transparent via-teal-300/30 to-transparent blur-3xl"
          style={{ animation: `float ${dur(14)} ease-in-out infinite` }}
        />
        <span
          ref={ribbonB}
          className="ghost absolute left-[-10%] top-[62%] h-[520px] w-[140%] rotate-[6deg] bg-gradient-to-r from-transparent via-paper/10 to-transparent blur-3xl"
          style={{ animation: `float-slow ${dur(19)} ease-in-out 0.8s infinite` }}
        />
        <span ref={blobA} className="ghost absolute left-[12%] top-[16%] h-[34vh] w-[24vw] rounded-full bg-slate-500/25 blur-[100px]" style={{ animation: `float ${dur(10)} ease-in-out infinite` }} />
        <span ref={blobB} className="ghost absolute right-[8%] top-[8%] h-[28vh] w-[20vw] rounded-full bg-teal-500/20 blur-[110px]" style={{ animation: `float ${dur(12)} ease-in-out 0.5s infinite` }} />
        <span ref={p0} className="ghost absolute left-[30%] top-[22%] h-2 w-2 rounded-full bg-teal-300/70" style={{ animation: `float ${dur(7)} ease-in-out infinite` }} />
        <span ref={p1} className="ghost absolute right-[26%] top-[48%] h-1.5 w-1.5 rounded-full bg-paper/40" style={{ animation: `float ${dur(9)} ease-in-out 0.3s infinite` }} />
        <span ref={p2} className="ghost absolute left-[48%] bottom-[18%] h-1.5 w-1.5 rounded-full bg-emerald-300/50" style={{ animation: `float ${dur(8)} ease-in-out 0.7s infinite` }} />
      </Wrap>

      {/* global ambiant glow always rendered for depth */}
      <div ref={gl} aria-hidden className="pointer-events-none absolute inset-0 -z-10" style={{ opacity: 0 }} />
    </>
  );
}
