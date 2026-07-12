"use client";

import { motion, useReducedMotion } from "framer-motion";

export function HeroAgent() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.98),rgba(226,242,255,0.92)_42%,rgba(207,233,255,0.72)_68%,rgba(241,248,255,0.95))]">
      <div className="absolute inset-x-[13%] bottom-[9%] h-[17%] rounded-[50%] bg-[#006ee6]/10 blur-2xl" />
      <motion.div
        aria-hidden="true"
        className="absolute h-[74%] w-[74%] rounded-full border border-[#0084FF]/15"
        animate={reduceMotion ? undefined : { rotate: 360 }}
        transition={{ duration: 30, ease: "linear", repeat: Infinity }}
      >
        <span className="absolute left-1/2 top-[-5px] h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-[#0084FF] shadow-[0_0_18px_rgba(0,132,255,0.9)]" />
        <span className="absolute bottom-[14%] right-[4%] h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className="absolute h-[55%] w-[55%] rounded-full border border-dashed border-[#0084FF]/20"
        animate={reduceMotion ? undefined : { rotate: -360 }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      />

      <motion.div
        className="relative h-[82%] w-[82%]"
        animate={reduceMotion ? undefined : { y: [0, -8, 0], rotate: [0, 0.7, 0] }}
        transition={{ duration: 4.8, ease: "easeInOut", repeat: Infinity }}
      >
        <svg
          aria-label="ArcStream autonomous payment agent"
          className="h-full w-full overflow-visible drop-shadow-[0_24px_28px_rgba(15,73,132,0.22)]"
          role="img"
          viewBox="0 0 500 500"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="hero-agent-shell" x1="85" y1="70" x2="390" y2="430" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EAF7FF" />
              <stop offset="0.45" stopColor="#A9DAFF" />
              <stop offset="1" stopColor="#3A9BF3" />
            </linearGradient>
            <linearGradient id="hero-agent-blue" x1="145" y1="140" x2="355" y2="380" gradientUnits="userSpaceOnUse">
              <stop stopColor="#27A8FF" />
              <stop offset="0.5" stopColor="#0084FF" />
              <stop offset="1" stopColor="#0059C9" />
            </linearGradient>
            <linearGradient id="hero-agent-visor" x1="153" y1="151" x2="343" y2="254" gradientUnits="userSpaceOnUse">
              <stop stopColor="#103A69" />
              <stop offset="0.5" stopColor="#08203D" />
              <stop offset="1" stopColor="#020D1B" />
            </linearGradient>
            <radialGradient id="hero-agent-core">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.35" stopColor="#9DEBFF" />
              <stop offset="0.72" stopColor="#14B8FF" />
              <stop offset="1" stopColor="#0075E8" />
            </radialGradient>
            <filter id="hero-agent-glow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="10" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <ellipse cx="250" cy="448" rx="105" ry="18" fill="#1167B1" opacity="0.12" />

          <g opacity="0.8">
            <path d="M92 178C55 211 54 270 86 306" fill="none" stroke="#75C7FF" strokeLinecap="round" strokeWidth="7" />
            <circle cx="88" cy="176" r="9" fill="#DDF5FF" stroke="#0084FF" strokeWidth="4" />
            <path d="M408 178C445 211 446 270 414 306" fill="none" stroke="#75C7FF" strokeLinecap="round" strokeWidth="7" />
            <circle cx="412" cy="176" r="9" fill="#DDF5FF" stroke="#0084FF" strokeWidth="4" />
          </g>

          <g>
            <path d="M172 295C122 292 104 322 107 359C109 386 127 405 151 407C169 409 184 396 185 378L190 322C191 307 185 297 172 295Z" fill="url(#hero-agent-shell)" stroke="#4DAAF5" strokeWidth="5" />
            <circle cx="139" cy="365" r="24" fill="#EAF8FF" stroke="#77C5FF" strokeWidth="5" />
            <path d="M328 295C378 292 396 322 393 359C391 386 373 405 349 407C331 409 316 396 315 378L310 322C309 307 315 297 328 295Z" fill="url(#hero-agent-shell)" stroke="#4DAAF5" strokeWidth="5" />
            <circle cx="361" cy="365" r="24" fill="#EAF8FF" stroke="#77C5FF" strokeWidth="5" />
          </g>

          <path d="M157 283C157 249 184 222 218 222H282C316 222 343 249 343 283V375C343 412 313 442 276 442H224C187 442 157 412 157 375V283Z" fill="url(#hero-agent-blue)" stroke="#C8EBFF" strokeWidth="7" />
          <path d="M179 291C179 270 196 253 217 253H283C304 253 321 270 321 291V372C321 399 299 421 272 421H228C201 421 179 399 179 372V291Z" fill="#0077E8" opacity="0.4" />
          <path d="M194 262C215 247 284 247 306 262" fill="none" stroke="#DDF5FF" strokeLinecap="round" strokeWidth="8" opacity="0.55" />

          <g filter="url(#hero-agent-glow)">
            <circle cx="250" cy="333" r="48" fill="#003E8F" opacity="0.5" />
            <circle cx="250" cy="333" r="39" fill="url(#hero-agent-core)" stroke="#C9F5FF" strokeWidth="5" />
            <path d="M250 308C236 308 226 318 226 332C226 349 239 358 250 363C261 358 274 349 274 332C274 318 264 308 250 308Z" fill="#FFFFFF" opacity="0.93" />
            <path d="M250 316V353M238 326H262" stroke="#0084FF" strokeLinecap="round" strokeWidth="6" />
          </g>

          <rect x="236" y="77" width="28" height="40" rx="14" fill="#52B6FF" />
          <motion.circle
            cx="250"
            cy="72"
            fill="#8EE8FF"
            r="15"
            stroke="#E8FCFF"
            strokeWidth="5"
            animate={reduceMotion ? undefined : { opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          />
          <rect x="123" y="101" width="254" height="176" rx="74" fill="url(#hero-agent-shell)" stroke="#F5FCFF" strokeWidth="8" />
          <path d="M144 145C168 108 214 102 252 104" fill="none" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="16" opacity="0.55" />
          <rect x="149" y="139" width="202" height="112" rx="52" fill="url(#hero-agent-visor)" stroke="#58B7FF" strokeWidth="6" />
          <path d="M171 166C204 145 285 145 321 164" fill="none" stroke="#5CCBFF" strokeLinecap="round" strokeWidth="7" opacity="0.22" />

          <motion.g
            animate={reduceMotion ? undefined : { scaleY: [1, 1, 0.12, 1, 1] }}
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
            transition={{ duration: 4.5, times: [0, 0.44, 0.48, 0.52, 1], repeat: Infinity }}
          >
            <ellipse cx="208" cy="195" rx="23" ry="27" fill="#64E7FF" />
            <ellipse cx="292" cy="195" rx="23" ry="27" fill="#64E7FF" />
            <circle cx="215" cy="186" r="7" fill="#FFFFFF" />
            <circle cx="299" cy="186" r="7" fill="#FFFFFF" />
          </motion.g>
          <path d="M218 226C238 238 262 238 282 226" fill="none" stroke="#6DE9FF" strokeLinecap="round" strokeWidth="7" />

          <g>
            <rect x="192" y="432" width="38" height="20" rx="10" fill="#005FCB" />
            <rect x="270" y="432" width="38" height="20" rx="10" fill="#005FCB" />
          </g>
        </svg>
      </motion.div>

      <div className="absolute left-5 top-5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#0075E8] shadow-sm backdrop-blur-md">
        Agent online
      </div>
      <div className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
        Arc Testnet
      </div>
    </div>
  );
}
