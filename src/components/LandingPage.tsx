import React, { useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import {
  Hand,
  Eraser,
  Palette,
  Zap,
  Cpu,
  Sparkles,
  Move3d,
} from "lucide-react";
import { cn } from "../lib/utils";

// Particle Background Component
const ParticleBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      originX: number;
      originY: number;
    }[] = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        originX: Math.random() * width,
        originY: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 0.5,
      });
    }

    let animationFrame: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(34, 211, 238, 0.15)"; // neon cyan

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt(
            Math.pow(p.x - p2.x, 2) + Math.pow(p.y - p2.y, 2),
          );
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(34, 211, 238, ${0.1 - (dist / 150) * 0.1})`;
            ctx.stroke();
          }
        }
      });
      animationFrame = requestAnimationFrame(render);
    };
    render();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 pointer-events-none opacity-50"
    />
  );
};

export const LandingPage = () => {
  const { setAirBoardActive } = useAppStore();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);

  const features = [
    {
      title: "Air Writing",
      desc: "Write smoothly with just your index finger.",
      icon: <Hand className="w-6 h-6 text-neon-cyan" />,
    },
    {
      title: "Smart Eraser",
      desc: "3 fingers for large area, 2 for precision.",
      icon: <Eraser className="w-6 h-6 text-electric-blue" />,
    },
    {
      title: "Dynamic Brush",
      desc: "Pinch to spawn the floating color palette.",
      icon: <Palette className="w-6 h-6 text-purple-400" />,
    },
    {
      title: "AI Tracking",
      desc: "Powered by deep neural hand landmarker models.",
      icon: <Cpu className="w-6 h-6 text-yellow-400" />,
    },
    {
      title: "Bezier Smoothing",
      desc: "Adaptive velocity-based interpolation.",
      icon: <Zap className="w-6 h-6 text-green-400" />,
    },
    {
      title: "Spatial HUD",
      desc: "Immersive futuristic telemetry interface.",
      icon: <Move3d className="w-6 h-6 text-pink-400" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,_var(--color-dark-navy)_0%,_var(--color-matte-black)_100%)] text-slate-100 font-sans overflow-x-hidden selection:bg-neon-cyan selection:text-black border-x-4 border-dark-navy flex flex-col relative">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: "radial-gradient(#fff 1px, transparent 0)",
          backgroundSize: "32px 32px",
        }}
      />
      <ParticleBackground />

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 h-[72px] border-b border-neon-cyan/10 bg-matte-black/60 backdrop-blur-xl px-8 flex items-center justify-between shrink-0">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-electric-blue flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
          </div>
          <div className="flex flex-col ml-2">
            <span className="text-xl font-display font-black tracking-tighter leading-none text-white mt-1">
              AIR BOARD
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden md:flex gap-8 text-xs font-bold text-white/50 tracking-widest uppercase"
        >
          <a
            href="#features"
            className="hover:text-neon-cyan transition-colors"
          >
            Features
          </a>
          <a href="#tech" className="hover:text-neon-cyan transition-colors">
            Technology
          </a>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden z-10 pt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] aspect-square bg-neon-cyan/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="max-w-6xl z-10 w-full"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{
              duration: 0.8,
              ease: [0.16, 1, 0.3, 1],
              staggerChildren: 0.1,
            }}
            className="flex flex-col items-center justify-center w-full"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-2 rounded-full border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan text-xs font-bold tracking-widest uppercase mb-8 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> v2.1 Cinematic Upgrade Live
            </motion.div>

            <h1 className="text-[12vw] sm:text-[10vw] md:text-[8vw] font-display font-black tracking-tighter leading-[0.85] mb-6 w-full text-center bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-white/40 drop-shadow-2xl">
              AIR BOARD
            </h1>
            <p className="text-xl md:text-3xl text-white/60 mb-12 font-medium max-w-3xl mx-auto tracking-tight">
              Write in the air.{" "}
              <span className="text-neon-cyan">Control the impossible.</span>
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setAirBoardActive(true)}
              className="group relative px-10 py-5 bg-white text-black rounded-full font-bold text-lg tracking-wide overflow-hidden shadow-[0_0_40px_rgba(34,211,238,0.2)] hover:shadow-[0_0_60px_rgba(34,211,238,0.4)] transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-neon-cyan to-electric-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative z-10 group-hover:text-white transition-colors flex items-center gap-2">
                Launch Experience
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Showcase */}
      <section className="py-32 px-6 relative z-10" id="features">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight">
              Spatial Protocol
            </h2>
            <p className="text-xl text-white/50 font-light max-w-2xl mx-auto">
              Next-generation features engineered for maximum fluidity and
              predictive responsiveness.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                whileHover={{ y: -10, rotateX: 5, rotateY: 5 }}
                key={f.title}
                className="group relative p-8 rounded-3xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all backdrop-blur-sm overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center mb-8 shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-neon-cyan/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  {f.icon}
                </div>
                <h4 className="text-2xl font-bold mb-3 tracking-tight">
                  {f.title}
                </h4>
                <p className="text-white/50 leading-relaxed font-light">
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Cinematic Footer - Antigravity Style */}
      <footer className="relative bg-dark-navy pt-32 pb-12 overflow-hidden mt-20 border-t border-neon-cyan/10 z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-electric-blue)_0%,_transparent_70%)] opacity-10 pointer-events-none" />

        {/* Massive Background Text */}
        <div className="absolute bottom-[-10%] sm:bottom-[-15%] md:bottom-[-20%] left-0 w-full overflow-hidden flex justify-center pointer-events-none select-none z-0">
          <h1 className="text-[20vw] font-display font-black leading-none text-white/[0.02] whitespace-nowrap tracking-tighter">
            AIR BOARD
          </h1>
        </div>

        <div className="max-w-7xl mx-auto px-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-electric-blue flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                  <div className="w-4 h-4 border-2 border-white rounded-sm rotate-45"></div>
                </div>
                <span className="text-2xl font-display font-black tracking-tighter">
                  AIR BOARD <span className="text-neon-cyan">v2.1</span>
                </span>
              </div>
              <p className="text-white/40 max-w-sm mb-8 leading-relaxed">
                The most advanced neural hand tracking web experience ever
                created. Designed for the spatial computing era.
              </p>
            </div>

            <div className="flex gap-16 md:justify-end">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">
                  Platform
                </span>
                <a
                  href="#"
                  className="text-white/40 hover:text-neon-cyan transition-colors text-sm"
                >
                  Technology
                </a>
                <a
                  href="#"
                  className="text-white/40 hover:text-neon-cyan transition-colors text-sm"
                >
                  Features
                </a>
                <a
                  href="#"
                  className="text-white/40 hover:text-neon-cyan transition-colors text-sm"
                >
                  Documentation
                </a>
              </div>
              <div className="flex flex-col gap-4">
                <span className="text-xs font-bold text-white/80 uppercase tracking-widest mb-2">
                  Legal
                </span>
                <a
                  href="#"
                  className="text-white/40 hover:text-white transition-colors text-sm"
                >
                  Privacy Policy
                </a>
                <a
                  href="#"
                  className="text-white/40 hover:text-white transition-colors text-sm"
                >
                  Terms of Service
                </a>
                <a
                  href="#"
                  className="text-white/40 hover:text-white transition-colors text-sm"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-white/30 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
              <span>Built with AI Gesture Technology</span>
            </div>
            <div>Copyright © {new Date().getFullYear()} Mohammed Atif</div>
            <div className="flex gap-4">
              <span>Stable FPS: 60</span>
              <span>Latency: &lt;15ms</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
