/**
 * @file src/app/dashboard/components/pulse/usePulseColors.ts
 * @description 차트(echarts)에 쓸 색을 CSS 토큰에서 rgb 로 읽어 옵니다. 라이트 · 다크 전환을 따라 다시 읽습니다.
 *
 * 초보자 가이드:
 * - echarts 는 oklch 색을 못 읽으므로 캔버스로 rgb 문자열로 바꾼다
 * - html 의 class(dark) 가 바뀌면 다시 읽는다 (MutationObserver)
 */

"use client";

import { useEffect, useState } from "react";

export interface PulseColors {
  primary: string;
  info: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  muted: string;
  grid: string;
  track: string;
}

const FALLBACK: PulseColors = {
  primary: "rgb(232, 30, 140)", info: "rgb(59, 130, 246)", success: "rgb(34, 197, 94)", warning: "rgb(245, 158, 11)",
  error: "rgb(239, 68, 68)", text: "rgb(30, 30, 50)", muted: "rgb(120, 125, 140)", grid: "rgb(225, 228, 235)", track: "rgb(235, 237, 242)",
};

function toRgb(value: string, fallback: string): string {
  if (!value) return fallback;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return fallback;
  ctx.fillStyle = "#000";
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r}, ${g}, ${b})`;
}

function read(): PulseColors {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string, fb: string) => toRgb(css.getPropertyValue(name).trim(), fb);
  const dark = document.documentElement.classList.contains("dark");
  return {
    primary: v("--primary", FALLBACK.primary),
    info: v("--info", FALLBACK.info),
    success: v("--success", FALLBACK.success),
    warning: v("--warning", FALLBACK.warning),
    error: v("--error", FALLBACK.error),
    text: v("--foreground", FALLBACK.text),
    muted: v("--text-secondary", FALLBACK.muted),
    grid: v(dark ? "--border-dark" : "--border", FALLBACK.grid),
    track: v(dark ? "--surface" : "--surface", FALLBACK.track),
  };
}

export function usePulseColors(): PulseColors {
  const [colors, setColors] = useState<PulseColors>(FALLBACK);
  useEffect(() => {
    setColors(read());
    const observer = new MutationObserver(() => setColors(read()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return colors;
}
