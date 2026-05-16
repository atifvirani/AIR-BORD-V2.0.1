import React, { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useHandTracking } from "../hooks/useHandTracking";
import { detectGesture } from "../utils/gestureDetection";
import { useAppStore } from "../store/useAppStore";
import { GestureState } from "../types";
import {
  ArrowLeft,
  Hand,
  Eraser,
  Settings,
  Download,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";

interface Point {
  x: number;
  y: number;
}

export const AirBoard = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null); // For hand skeleton and UI overlay

  const {
    setAirBoardActive,
    currentGesture,
    setCurrentGesture,
    confidence,
    setConfidence,
    setFps,
    brushSettings,
    setBrushSettings,
  } = useAppStore();

  const { isLoaded, detectFrame } = useHandTracking(videoRef.current);

  const lastPointRef = useRef<Point | null>(null);
  const lastSmoothedRef = useRef<Point | null>(null);
  const lastGestureState = useRef<GestureState>(GestureState.NONE);
  const animationFrameId = useRef<number>(0);
  const lastFrameTime = useRef<number>(performance.now());
  const fpsFrameCount = useRef<number>(0);
  const currentColorIndex = useRef(0);

  const colors = ["#00f3ff", "#005eff", "#1a0545", "#ff00ff", "#ffffff"];

  // Start webcam
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: { facingMode: "user", width: 1280, height: 720 },
        })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing webcam:", err);
        });
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Resize canvas
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && overlayCanvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        overlayCanvasRef.current.width = window.innerWidth;
        overlayCanvasRef.current.height = window.innerHeight;
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const clearCanvas = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    p1: Point,
    p2: Point,
    color: string,
    size: number,
  ) => {
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Add glow
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    ctx.stroke();
    ctx.closePath();

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const erase = (
    ctx: CanvasRenderingContext2D,
    point: Point,
    radius: number,
  ) => {
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawSkeleton = (
    ctx: CanvasRenderingContext2D,
    landmarks: NormalizedLandmark[],
    width: number,
    height: number,
  ) => {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(34, 211, 238, 0.3)";
    ctx.lineWidth = 2;

    // Connect joints
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [13, 17],
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky and palm
    ];

    ctx.beginPath();
    connections.forEach(([i, j]) => {
      const lx = landmarks[i].x * width;
      const ly = landmarks[i].y * height;
      const nx = landmarks[j].x * width;
      const ny = landmarks[j].y * height;

      // Mirror x axis
      ctx.moveTo(width - lx, ly);
      ctx.lineTo(width - nx, ny);
    });
    ctx.stroke();

    // Draw joints
    landmarks.forEach((landmark, index) => {
      const x = width - landmark.x * width; // Mirror
      const y = landmark.y * height;

      ctx.beginPath();
      // Highlight fingertips
      const isTip = [4, 8, 12, 16, 20].includes(index);
      ctx.arc(x, y, isTip ? 4 : 2, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? "#22d3ee" : "rgba(255, 255, 255, 0.7)";

      if (isTip) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#22d3ee";
      }

      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Draw energy ring around active index finger if drawing
    if (
      currentGesture === GestureState.DRAW ||
      currentGesture === GestureState.ERASE_SMALL ||
      currentGesture === GestureState.ERASE_LARGE
    ) {
      const tx = width - landmarks[8].x * width;
      const ty = landmarks[8].y * height;
      ctx.beginPath();
      ctx.arc(tx, ty, 20 + Math.sin(Date.now() / 150) * 5, 0, 2 * Math.PI);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  // Main animation loop
  const renderLoop = useCallback(() => {
    const now = performance.now();
    fpsFrameCount.current++;
    if (now - lastFrameTime.current >= 1000) {
      setFps(fpsFrameCount.current);
      fpsFrameCount.current = 0;
      lastFrameTime.current = now;
    }

    if (
      isLoaded &&
      videoRef.current &&
      canvasRef.current &&
      overlayCanvasRef.current
    ) {
      const result = detectFrame();
      const ctx = canvasRef.current.getContext("2d");
      const octx = overlayCanvasRef.current.getContext("2d");

      const width = canvasRef.current.width;
      const height = canvasRef.current.height;

      if (octx) {
        octx.clearRect(0, 0, width, height); // Clear overlay
      }

      if (result && result.landmarks.length > 0) {
        const landmarks = result.landmarks[0]; // Process first hand
        const { state: gesture, confidence: conf } = detectGesture(landmarks);

        setCurrentGesture(gesture);
        setConfidence(conf);

        if (
          gesture === GestureState.THUMBS_UP &&
          lastGestureState.current !== GestureState.THUMBS_UP
        ) {
          saveCanvas();
          // Optional: flashy effect
          if (octx) {
            octx.fillStyle = "rgba(255, 255, 255, 0.5)";
            octx.fillRect(0, 0, width, height);
          }
        }

        if (
          gesture === GestureState.OPEN_PALM &&
          lastGestureState.current !== GestureState.OPEN_PALM
        ) {
          // You could trigger a menu here
        }

        lastGestureState.current = gesture;

        if (octx) {
          drawSkeleton(octx, landmarks, width, height);
        }

        // We use index tip (landmark 8) for pointer
        const indexTip = landmarks[8];
        const currentPoint: Point = {
          x: width - indexTip.x * width, // Mirror
          y: indexTip.y * height,
        };

        if (ctx) {
          // Drawing
          if (gesture === GestureState.DRAW && conf > 0.8) {
            // Initialize smoothing target
            if (!lastSmoothedRef.current) {
              lastSmoothedRef.current = currentPoint;
            } else {
              const alpha = 0.35; // Lower = smoother, higher = more responsive
              lastSmoothedRef.current = {
                x:
                  lastSmoothedRef.current.x +
                  (currentPoint.x - lastSmoothedRef.current.x) * alpha,
                y:
                  lastSmoothedRef.current.y +
                  (currentPoint.y - lastSmoothedRef.current.y) * alpha,
              };
            }

            if (lastPointRef.current) {
              const p1 = lastPointRef.current;
              const p2 = lastSmoothedRef.current;

              const dist = Math.sqrt(
                Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2),
              );
              // distance check avoids teleportation leaps
              if (dist < 200) {
                drawLine(ctx, p1, p2, brushSettings.color, brushSettings.size);
              }
            }
            lastPointRef.current = { ...lastSmoothedRef.current };

            // Draw hover indicator on overlay
            if (octx) {
              octx.beginPath();
              octx.arc(
                lastSmoothedRef.current.x,
                lastSmoothedRef.current.y,
                brushSettings.size / 2 + 2,
                0,
                Math.PI * 2,
              );
              octx.strokeStyle = brushSettings.color;
              octx.lineWidth = 2;
              octx.stroke();
            }
          } else {
            lastPointRef.current = null;
            lastSmoothedRef.current = null;
          }

          // Erasers
          if (
            gesture === GestureState.ERASE_SMALL ||
            gesture === GestureState.ERASE_LARGE
          ) {
            const radius = gesture === GestureState.ERASE_LARGE ? 60 : 30;
            erase(ctx, currentPoint, radius);

            // Eraser preview on overlay
            if (octx) {
              octx.beginPath();
              octx.arc(currentPoint.x, currentPoint.y, radius, 0, Math.PI * 2);
              octx.strokeStyle = "rgba(255, 255, 255, 0.5)";
              octx.fillStyle = "rgba(255, 255, 255, 0.1)";
              octx.fill();
              octx.stroke();
            }
          }

          // Color Change (Pinch & Move)
          if (gesture === GestureState.COLOR_CHANGE) {
            const pinchPoint = {
              x: width - landmarks[4].x * width,
              y: landmarks[4].y * height,
            };

            // Simple color switch based on x position
            const colorSector = Math.floor(landmarks[4].x * colors.length);
            const safeIndex = Math.max(
              0,
              Math.min(colors.length - 1, colorSector),
            );

            if (currentColorIndex.current !== safeIndex) {
              currentColorIndex.current = safeIndex;
              setBrushSettings({ color: colors[safeIndex] });
            }

            // Preview on overlay
            if (octx) {
              octx.beginPath();
              octx.arc(pinchPoint.x, pinchPoint.y, 15, 0, Math.PI * 2);
              octx.fillStyle = colors[safeIndex];
              octx.shadowBlur = 10;
              octx.shadowColor = colors[safeIndex];
              octx.fill();
              octx.shadowBlur = 0;
            }
          }
        }
      } else {
        lastPointRef.current = null;
        setCurrentGesture(GestureState.NONE);
        setConfidence(0);
      }
    }

    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [
    isLoaded,
    detectFrame,
    brushSettings,
    setConfidence,
    setCurrentGesture,
    setFps,
    setBrushSettings,
  ]);

  useEffect(() => {
    animationFrameId.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [renderLoop]);

  const saveCanvas = () => {
    if (canvasRef.current) {
      // Create a temporary canvas to composite with black background
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = canvasRef.current.width;
      tempCanvas.height = canvasRef.current.height;
      const ctx = tempCanvas.getContext("2d");
      
      if (ctx) {
        // Draw background
        ctx.fillStyle = "#0c0f1a"; // dark-navy roughly
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        // Draw strokes
        ctx.drawImage(canvasRef.current, 0, 0);
        
        const dataURL = tempCanvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataURL;
        a.download = "air-board-export.png";
        a.click();
      }
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-matte-black overflow-hidden font-sans text-slate-100 border-4 border-dark-navy flex flex-col">
      {/* Hidden video element for tracking */}
      <video ref={videoRef} className="hidden" playsInline autoPlay />

      {/* Main Drawing Canvas - Sophisticated Dark Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_var(--color-dark-navy)_0%,_var(--color-matte-black)_100%)]">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#fff 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full z-10"
        />
        {/* Overlay Canvas for skeleton and UI elements that don't persist */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full z-20 pointer-events-none"
        />
      </div>

      {/* HUD UI Elements */}
      <header className="absolute inset-x-0 top-0 h-16 border-b border-neon-cyan/20 bg-matte-black/80 backdrop-blur-md px-8 z-30 flex items-center justify-between pointer-events-auto">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setAirBoardActive(false)}
            className="w-10 h-10 rounded-full border border-white/5 bg-white/5 flex flex-col items-center justify-center hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>

          <div className="flex flex-col">
            <span className="text-lg font-black tracking-tighter leading-none">
              AIR BOARD <span className="text-neon-cyan">v2.0.1</span>
            </span>
            <span className="text-[10px] text-slate-500 tracking-[0.2em] font-bold uppercase">
              Advanced Gesture Intelligence
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
            <span className="text-xs font-mono text-slate-400">
              WEBCAM ACTIVE
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase font-bold">
              STATE
            </div>
            <div className="text-xs font-mono text-electric-blue">
              {currentGesture}
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-slate-500 uppercase font-bold">
              FPS
            </div>
            <div className="text-xs font-mono text-neon-cyan">
              {isLoaded ? useAppStore.getState().fps : "--"}
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <button
              onClick={clearCanvas}
              className="p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
              title="Clear Canvas"
            >
              <Trash2 className="w-4 h-4 text-slate-300" />
            </button>
            <button
              onClick={saveCanvas}
              className="p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
              title="Save PNG"
            >
              <Download className="w-4 h-4 text-neon-cyan" />
            </button>
          </div>
        </div>
      </header>

      {/* Floating Brush Selector Indicator */}
      <AnimatePresence>
        {currentGesture === GestureState.COLOR_CHANGE && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 glass-panel rounded-full p-2 flex gap-2 pointer-events-none"
          >
            {colors.map((c, i) => (
              <div
                key={c}
                className={cn(
                  "w-8 h-8 rounded-full transition-all duration-300",
                  brushSettings.color === c
                    ? "scale-125 border-2 border-white ring-2 ring-neon-cyan"
                    : "scale-100 opacity-60",
                )}
                style={{
                  backgroundColor: c,
                  boxShadow:
                    brushSettings.color === c ? `0 0 15px ${c}` : "none",
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Telemetry Aside */}
      <aside className="absolute left-6 top-24 w-64 flex flex-col gap-4 z-30 pointer-events-none hidden md:flex">
        <div className="bg-dark-navy/40 border border-white/5 p-4 rounded-xl backdrop-blur-xl flex-1 pointer-events-auto shadow-lg">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
            Status & Telemetry
          </h3>
          <div className="space-y-4">
            <div className="p-3 bg-white/5 rounded-lg border border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-slate-400">Confidence</span>
                <span className="text-xs font-mono text-neon-cyan">
                  {Math.round(confidence * 100)}%
                </span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-neon-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                  animate={{ width: `${Math.round(confidence * 100)}%` }}
                  transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                />
              </div>
            </div>

            <div className="p-3 bg-neon-cyan/10 rounded-lg border border-neon-cyan/30">
              <div className="text-[10px] text-neon-cyan font-bold mb-1">
                ACTIVE GESTURE
              </div>
              <div className="text-sm font-bold flex items-center gap-2 text-white/90">
                {currentGesture.replace("_", " ")}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Loading Overlay */}
      <AnimatePresence>
        {!isLoaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 bg-matte-black/95 z-50 flex flex-col items-center justify-center backdrop-blur-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="w-32 h-32 relative mb-8 flex items-center justify-center"
            >
              <div className="absolute inset-0 border-t-2 border-r-2 border-neon-cyan rounded-full opacity-50"></div>
              <div
                className="absolute inset-2 border-l-2 border-b-2 border-electric-blue rounded-full opacity-50"
                style={{ animationDirection: "reverse" }}
              ></div>
              <div className="w-8 h-8 bg-neon-cyan rounded-sm rotate-45 shadow-[0_0_20px_#22d3ee]"></div>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-2xl font-display font-black text-white tracking-[0.3em] uppercase mb-4"
            >
              Booting System
            </motion.h2>
            <div className="flex flex-col items-center gap-2">
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-neon-cyan shadow-[0_0_10px_#22d3ee]"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{
                    duration: 1.5,
                    ease: "circOut",
                    repeat: Infinity,
                  }}
                />
              </div>
              <p className="text-neon-cyan/50 text-[10px] uppercase tracking-widest font-mono">
                Initializing Neural Models...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
