"use client";

import { useEffect, useRef } from "react";

export function HoneyShader({ className = "", opacity = 1 }: { className?: string; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current as HTMLCanvasElement;
    if (!canvas) return;

    const gl = (canvas.getContext("webgl", { alpha: false, antialias: false })
      || canvas.getContext("experimental-webgl")) as WebGLRenderingContext;
    if (!gl) return;

    const vertexSource = `attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;
    const fragmentSource = `precision highp float;
varying vec2 v_texCoord;
uniform float u_time;
void main() {
  vec2 uv = v_texCoord;
  vec3 cream = vec3(1.0, 0.988, 0.941);
  vec3 honey = vec3(1.0, 0.761, 0.239);
  vec3 sand = vec3(0.976, 0.937, 0.886);
  float wave = sin(uv.x * 10.0 + u_time * 0.5) * 0.1;
  float path = smoothstep(0.012, 0.0, abs(uv.x - 0.5 + wave + sin(u_time * 0.2) * 0.2));
  path += smoothstep(0.012, 0.0, abs(uv.x - 0.2 + wave * 0.5 + cos(u_time * 0.3) * 0.1));
  path += smoothstep(0.012, 0.0, abs(uv.x - 0.8 + wave * 0.8 + sin(u_time * 0.4) * 0.15));
  float t = u_time * 0.1;
  vec2 shift = vec2(sin(t), cos(t)) * 0.2;
  float dist = length(uv - 0.5 + shift);
  vec3 color = mix(cream, sand, smoothstep(0.2, 0.8, dist));
  color = mix(color, honey, path * 0.16);
  float glow = 1.0 - smoothstep(0.0, 0.7, length(uv - 0.5));
  color += honey * glow * 0.055;
  gl_FragColor = vec4(color, 1.0);
}`;

    function compile(type: number, source: string) {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const timeUniform = gl.getUniformLocation(program, "u_time");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let running = true;

    function syncSize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
    }

    function draw(timestamp: number) {
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (timeUniform) gl.uniform1f(timeUniform, reduceMotion.matches ? 0 : timestamp * 0.001);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (running && !reduceMotion.matches && document.visibilityState === "visible") {
        frame = requestAnimationFrame(draw);
      }
    }

    function resume() {
      cancelAnimationFrame(frame);
      if (document.visibilityState === "visible") frame = requestAnimationFrame(draw);
    }

    const resizeObserver = new ResizeObserver(resume);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", resume);
    reduceMotion.addEventListener("change", resume);
    resume();

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", resume);
      reduceMotion.removeEventListener("change", resume);
      if (buffer) gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, []);

  return (
    <div className={`absolute inset-0 h-full w-full ${className}`} style={{ opacity }} aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
