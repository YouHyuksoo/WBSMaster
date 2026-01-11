"use client";

import React, { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial, Float, Stars, Torus, Box, Sphere, MeshDistortMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.cjs";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowRight, CheckCircle2, Layers, BarChart3, Zap, MousePointer2, Box as BoxIcon, Circle } from "lucide-react";
import Link from "next/link";

// ==========================================
// 🎨 Theme 1: "Stardust" (우주/입자)
// ==========================================
function Stardust(props: any) {
  const ref = useRef<any>();
  const [sphere] = useState(() =>
    random.inSphere(new Float32Array(5000), { radius: 1.5 })
  );

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 10;
      ref.current.rotation.y -= delta / 15;
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color="#a0c0ff"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
}

// ==========================================
// 🎨 Theme 2: "Network" (연결/구조)
// ==========================================
function NetworkShape() {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
      <mesh>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color="#4f46e5" wireframe transparent opacity={0.3} />
      </mesh>
      <mesh scale={0.5}>
        <icosahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#818cf8" wireframe transparent opacity={0.5} />
      </mesh>
    </Float>
  );
}

// ==========================================
// 🎨 Theme 3: "Cubes" (블록/데이터)
// ==========================================
function FloatingCubes() {
  const group = useRef<any>();
  
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.getElapsedTime() * 0.1;
    }
  });

  return (
    <group ref={group}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Float key={i} speed={1 + Math.random()} rotationIntensity={2} floatIntensity={2}>
          <Box position={[
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 5
          ]} args={[0.5, 0.5, 0.5]}>
            <meshStandardMaterial color={Math.random() > 0.5 ? "#3b82f6" : "#8b5cf6"} opacity={0.7} transparent />
          </Box>
        </Float>
      ))}
    </group>
  );
}

// ==========================================
// 🎨 Theme 4: "Fluid" (유연함/흐름)
// ==========================================
function FluidSphere() {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={0.5}>
      <Sphere args={[1, 64, 64]} scale={1.2}>
        <MeshDistortMaterial
          color="#1e1b4b"
          attach="material"
          distort={0.6}
          speed={1.5}
          roughness={0.2}
          metalness={0.8}
        />
      </Sphere>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 10]} color="#4f46e5" intensity={2} />
      <directionalLight position={[-10, -10, -5]} color="#ec4899" intensity={2} />
    </Float>
  );
}

// ==========================================
// 🎬 3D Scene Manager
// ==========================================
type ThemeType = "stardust" | "network" | "cubes" | "fluid";

function Scene({ theme }: { theme: ThemeType }) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {theme === "stardust" && (
        <>
          <Stardust />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        </>
      )}

      {theme === "network" && (
        <>
          <NetworkShape />
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
        </>
      )}

      {theme === "cubes" && <FloatingCubes />}

      {theme === "fluid" && <FluidSphere />}
    </>
  );
}

// ==========================================
// ⚡ Framer Motion Variants (애니메이션 정의)
// ==========================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2, // 자식 요소들이 0.2초 간격으로 순차 등장
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { y: 50, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 12 },
  },
};

const cardHoverVariants = {
  hover: { 
    y: -15, 
    scale: 1.05,
    boxShadow: "0px 20px 40px rgba(59, 130, 246, 0.2)",
    borderColor: "rgba(59, 130, 246, 0.5)",
    transition: { type: "spring", stiffness: 300 }
  }
};

// ==========================================
// 📄 Main Component
// ==========================================
export default function LandingPage3D() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>("stardust");
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  return (
    <div className="relative w-full min-h-screen bg-black text-white overflow-x-hidden selection:bg-blue-500/30">
      
      {/* 🚀 상단 스크롤 진행 바 */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* 1. 3D 배경 레이어 */}
      <div className="fixed inset-0 z-0 transition-opacity duration-1000 ease-in-out">
        <Canvas camera={{ position: [0, 0, 1] }}>
          <Suspense fallback={null}>
            <Scene theme={currentTheme} />
          </Suspense>
        </Canvas>
      </div>

      {/* 2. 테마 선택 컨트롤러 (업그레이드) */}
      <div className="fixed top-24 right-4 z-50 p-4 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
        <p className="text-xs text-gray-400 mb-3 font-bold uppercase tracking-wider">Select Theme</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "stardust", label: "Stardust", icon: <Stars size={14} /> },
            { id: "network", label: "Network", icon: <Layers size={14} /> },
            { id: "cubes", label: "Cubes", icon: <BoxIcon size={14} /> },
            { id: "fluid", label: "Fluid", icon: <Circle size={14} /> },
          ].map((theme) => (
            <button
              key={theme.id}
              onClick={() => setCurrentTheme(theme.id as ThemeType)}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
                currentTheme === theme.id 
                  ? "bg-white text-black shadow-lg scale-105" 
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 메인 콘텐츠 */}
      <div className="relative z-10">
        
        {/* 네비게이션 */}
        <nav className="flex items-center justify-between px-6 py-6 lg:px-12 backdrop-blur-sm sticky top-0 z-40 border-b border-white/5">
          <div className="text-2xl font-black tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            WBS Master
          </div>
          <div className="flex gap-4">
            <Link href="/auth/login" className="px-6 py-2.5 text-sm font-bold bg-white text-black rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]">
              시작하기
            </Link>
          </div>
        </nav>

        {/* Hero 섹션 */}
        <section className="min-h-screen flex flex-col justify-center items-center text-center px-4 -mt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="max-w-5xl space-y-8"
          >
            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-blue-300 text-sm font-medium mb-4 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              WBS Master 2.0 is here
            </motion.div>

            <motion.h1 
              variants={itemVariants}
              className="text-6xl md:text-8xl font-black tracking-tight leading-none"
            >
              Manage Projects <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                Like a Maestro
              </span>
            </motion.h1>

            <motion.p 
              variants={itemVariants}
              className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
            >
              복잡한 프로젝트도 예술처럼 관리하세요. <br/>
              AI 기반 자동화와 3D 시각화로 경험하는 압도적인 생산성.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
              <Link href="/dashboard" className="group px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-full text-lg font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(37,99,235,0.5)] hover:shadow-[0_0_60px_rgba(37,99,235,0.7)] hover:-translate-y-1">
                무료로 체험하기
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Features 섹션 */}
        <section className="py-40 px-6 lg:px-12 bg-gradient-to-b from-transparent via-black/50 to-black">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-24"
            >
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
                압도적인 기능
              </h2>
              <p className="text-xl text-gray-400">당신의 프로젝트를 성공으로 이끄는 핵심 도구들</p>
            </motion.div>

            <motion.div 
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <FeatureCard 
                icon={<Layers className="w-10 h-10 text-blue-400" />}
                title="AI WBS 생성"
                desc="프로젝트 목표만 입력하면 AI가 전체 작업 분류 체계를 1초 만에 설계합니다."
              />
              <FeatureCard 
                icon={<BarChart3 className="w-10 h-10 text-purple-400" />}
                title="스마트 대시보드"
                desc="모든 지표를 실시간으로 시각화하여 프로젝트의 건강 상태를 한눈에 파악하세요."
              />
              <FeatureCard 
                icon={<Zap className="w-10 h-10 text-pink-400" />}
                title="자동화 워크플로우"
                desc="반복되는 업무는 맡겨두세요. 스마트한 자동화 봇이 당신의 시간을 아껴줍니다."
              />
            </motion.div>
          </div>
        </section>

        {/* Detail Section */}
        <section className="py-32 relative overflow-hidden">
          {/* 배경 장식 */}
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2 pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              viewport={{ once: true }}
            >
              <h3 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                데이터가 <br />
                <span className="text-blue-400">살아 움직입니다</span>
              </h3>
              <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                정적인 엑셀 파일은 이제 그만. <br/>
                드래그 앤 드롭으로 관리하는 칸반 보드와
                실시간으로 연동되는 간트 차트를 경험해보세요.
              </p>
              <ul className="space-y-6">
                {[
                  "직관적인 제스처 컨트롤",
                  "엑셀/CSV 데이터 원클릭 마이그레이션",
                  "팀원별 업무 부하량 시각화",
                  "Slack/Jira 완벽 연동"
                ].map((item, idx) => (
                  <motion.li 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-4 text-gray-300 text-lg group cursor-default"
                  >
                    <div className="p-2 rounded-full bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-3xl blur-2xl opacity-30 animate-pulse" />
              <div className="relative bg-gray-900/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl">
                {/* Mockup UI */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="w-20 h-2 bg-white/10 rounded-full" />
                  </div>
                  
                  {[1, 2, 3].map((i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <div className="flex justify-between mb-2">
                        <div className="w-1/3 h-3 bg-white/20 rounded" />
                        <div className="w-6 h-6 rounded-full bg-blue-500/20" />
                      </div>
                      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 w-2/3" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-white/10 text-center relative z-10 bg-black">
          <p className="text-gray-500 text-sm">© 2026 WBS Master. Designed for builders.</p>
        </footer>
      </div>
    </div>
  );
}

// ✨ Upgraded Feature Card
function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover="hover"
      className="relative bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10 transition-all duration-300 group overflow-hidden"
    >
      <motion.div variants={cardHoverVariants} className="absolute inset-0 bg-transparent rounded-2xl pointer-events-none" />
      
      {/* Hover Glow Effect */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-all duration-500" />

      <div className="mb-6 p-4 bg-white/5 rounded-2xl w-fit group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 border border-white/5 group-hover:border-white/20">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-3 text-white group-hover:text-blue-400 transition-colors">{title}</h3>
      <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors">{desc}</p>
    </motion.div>
  );
}