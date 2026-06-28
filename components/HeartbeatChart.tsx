"use client";

import React, { useEffect, useState } from "react";

export function HeartbeatChart() {
  // We'll store 20 points for a smooth flowing chart
  const [points, setPoints] = useState<number[]>(Array(20).fill(50));

  useEffect(() => {
    const interval = setInterval(() => {
      setPoints((prev) => {
        const next = [...prev.slice(1)];
        const rand = Math.random();

        // Simulate a heartbeat/pulse pattern
        if (rand > 0.85) {
          next.push(10); // Sharp peak
        } else if (rand > 0.75) {
          next.push(90); // Sharp dip
        } else {
          // Normal variance around baseline 50
          next.push(50 + (Math.random() * 20 - 10));
        }
        return next;
      });
    }, 500); // update every 500ms

    return () => clearInterval(interval);
  }, []);

  // Map array points to SVG path commands
  const path = points
    .map((y, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * 400} ${y}`)
    .join(" ");

  return (
    <div className="w-full h-32 overflow-hidden rounded-xl border border-gray-100 bg-gray-50/80 flex flex-col items-center justify-center relative">
      {/* Live Indicator */}
      <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-emerald-600 font-semibold tracking-[0.12em] uppercase" style={{ fontFamily: "var(--font-inter, Inter, sans-serif)" }}>Live data stream</span>
      </div>

      <svg className="w-full h-full mt-4" viewBox="0 0 400 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0)" />
            <stop offset="20%" stopColor="rgba(16, 185, 129, 1)" />
            <stop offset="80%" stopColor="rgba(16, 185, 129, 1)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
          <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.18)" />
            <stop offset="100%" stopColor="rgba(16, 185, 129, 0)" />
          </linearGradient>
        </defs>

        {/* Fill Area */}
        <path
          d={`${path} L 400 100 L 0 100 Z`}
          fill="url(#fillGradient)"
          className="transition-all duration-500 ease-linear"
        />

        {/* Pulse Line */}
        <path
          d={path}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2.5"
          className="transition-all duration-500 ease-linear"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
