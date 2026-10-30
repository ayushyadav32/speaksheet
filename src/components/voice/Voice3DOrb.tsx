import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Voice3DOrbProps {
  isListening: boolean;
  isProcessing: boolean;
  audioLevel?: number;
  onClick?: () => void;
  size?: number;
}

export const Voice3DOrb: React.FC<Voice3DOrbProps> = ({
  isListening,
  isProcessing,
  audioLevel = 0,
  onClick,
  size = 140
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(isListening);
  const isProcessingRef = useRef(isProcessing);
  const audioLevelRef = useRef(audioLevel);

  isListeningRef.current = isListening;
  isProcessingRef.current = isProcessing;
  audioLevelRef.current = audioLevel;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 4.2;

    // 2. WebGL Renderer with Alpha
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Create Particle Sphere (Holographic Luxury Orb)
    const particleCount = 750;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    // Colors: Pressed Champagne Gold #D4A359 (R:0.83, G:0.64, B:0.35) and Terracotta #D95338 (R:0.85, G:0.32, B:0.22)
    const colorGold = new THREE.Color(0xd4a359);
    const colorCrimson = new THREE.Color(0xd95338);
    const colorAmbient = new THREE.Color(0xe5ddd0);

    const radius = 1.35;
    for (let i = 0; i < particleCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      // Gradient color interpolation between gold and crimson
      const mixRatio = (y + radius) / (2 * radius);
      const particleColor = new THREE.Color().lerpColors(colorCrimson, colorGold, mixRatio);
      if (Math.random() > 0.8) {
        particleColor.lerp(colorAmbient, 0.4);
      }

      colors[i * 3] = particleColor.r;
      colors[i * 3 + 1] = particleColor.g;
      colors[i * 3 + 2] = particleColor.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Material
    const pMaterial = new THREE.PointsMaterial({
      size: 0.058,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, pMaterial);
    scene.add(particles);

    // Inner glowing geometric core
    const coreGeo = new THREE.IcosahedronGeometry(0.85, 2);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0x2e2822,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Outer orbital rings
    const ringGeo = new THREE.RingGeometry(1.65, 1.68, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xd4a359,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 3;
    scene.add(ringMesh);

    // 4. Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const posArray = geometry.attributes.position.array as Float32Array;

      const listening = isListeningRef.current;
      const processing = isProcessingRef.current;
      const liveAudio = audioLevelRef.current;

      // Rotation speed depends on state
      const baseSpeed = listening ? 0.03 : processing ? 0.045 : 0.012;
      particles.rotation.y += baseSpeed;
      particles.rotation.x += baseSpeed * 0.4;
      coreMesh.rotation.y -= baseSpeed * 0.8;
      ringMesh.rotation.z += baseSpeed * 0.5;

      // Particle displacement wave
      for (let i = 0; i < particleCount; i++) {
        const ox = originalPositions[i * 3];
        const oy = originalPositions[i * 3 + 1];
        const oz = originalPositions[i * 3 + 2];

        let waveFactor = 1.0;
        if (listening) {
          const freq = 3.5;
          const amp = 0.18 + liveAudio * 0.35;
          waveFactor = 1 + amp * Math.sin(freq * ox + freq * oy + elapsedTime * 5);
        } else if (processing) {
          waveFactor = 1 + 0.15 * Math.sin(elapsedTime * 9 + i * 0.1);
        } else {
          // Subtle luxury idle breathing
          waveFactor = 1 + 0.04 * Math.sin(elapsedTime * 1.5 + oy);
        }

        posArray[i * 3] = ox * waveFactor;
        posArray[i * 3 + 1] = oy * waveFactor;
        posArray[i * 3 + 2] = oz * waveFactor;
      }
      geometry.attributes.position.needsUpdate = true;

      // Material reactive opacity & color shifts
      if (listening) {
        pMaterial.opacity = 0.95;
        pMaterial.size = 0.068 + liveAudio * 0.03;
        coreMat.opacity = 0.55;
        ringMat.opacity = 0.5;
      } else if (processing) {
        pMaterial.opacity = 0.85;
        pMaterial.size = 0.075;
      } else {
        pMaterial.opacity = 0.75;
        pMaterial.size = 0.055;
        coreMat.opacity = 0.25;
        ringMat.opacity = 0.2;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      pMaterial.dispose();
      coreGeo.dispose();
      coreMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer.dispose();
    };
  }, [size]);

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center select-none ${
        onClick ? 'cursor-pointer group' : 'cursor-default pointer-events-none'
      }`}
      style={{ width: size, height: size }}
      title={onClick ? (isListening ? "Click to stop listening" : "Click to speak voice command") : undefined}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 flex items-center justify-center pointer-events-none" />

      {/* Ambient Radial Glow Underlay */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none blur-xl ${
          isListening
            ? 'bg-terracotta/35 scale-110'
            : isProcessing
            ? 'bg-gold/30 scale-105'
            : 'bg-gold/10 scale-90 group-hover:bg-gold/25'
        }`}
      />

      {/* Center Interactive Icon Indicator */}
      <div
        className={`relative z-10 w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg ${
          isListening
            ? 'bg-terracotta text-white border-terracotta-light scale-110 shadow-terracotta/50'
            : isProcessing
            ? 'bg-gold text-charcoal border-gold-light animate-spin shadow-gold/50'
            : 'bg-stone-card/90 text-gold border-border-gold group-hover:border-gold group-hover:scale-105'
        }`}
      >
        {isListening ? (
          <span className="relative flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-white"></span>
          </span>
        ) : isProcessing ? (
          <div className="w-4 h-4 border-2 border-charcoal border-t-transparent rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>
    </div>
  );
};
