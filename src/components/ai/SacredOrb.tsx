import React, { useEffect, useRef } from 'react';

export type SacredOrbState = 'idle' | 'thinking' | 'streaming' | 'speaking';

interface SacredOrbProps {
  state?: SacredOrbState;
  size?: number;
  className?: string;
  onClick?: () => void;
}

interface Particle3D {
  theta: number; // Ângulo azimutal (0 a 2*PI)
  phi: number;   // Ângulo polar (0 a PI)
  baseRadius: number;
  pulsePhase: number;
}

export const SacredOrb: React.FC<SacredOrbProps> = ({
  state = 'idle',
  size = 120,
  className = '',
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    // Inicializa as partículas na superfície de uma esfera (distribuição uniforme Fibonacci/esférica)
    const PARTICLE_COUNT = 380;
    const particles: Particle3D[] = [];
    const sphereRadius = (size / 2) * 0.72;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Golden spiral distribution on sphere
      const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2; // de 1 a -1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = ((1 + Math.sqrt(5)) / 2) * i * 2 * Math.PI;
      const phi = Math.acos(Math.max(-1, Math.min(1, y)));

      particles.push({
        theta,
        phi,
        baseRadius: sphereRadius,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    let animationFrameId: number;
    let rotationAngleY = 0;
    let rotationAngleX = 0.35; // Ligeira inclinação elegante
    let time = 0;

    const render = () => {
      time += 0.025;

      // Velocidade de rotação de acordo com o estado
      let rotSpeed = 0.006;
      let waveFrequency = 3.5;
      let waveAmplitude = 5;
      let scaleModifier = 1;

      if (state === 'thinking') {
        rotSpeed = 0.024;
        waveFrequency = 7.0;
        waveAmplitude = 9;
        scaleModifier = 0.88 + Math.sin(time * 4) * 0.06; // pulso concêntrico de concentração
      } else if (state === 'speaking') {
        rotSpeed = 0.012;
        waveFrequency = 5.0;
        // Ressonância vocal: ondas orgânicas mais amplas simulando voz
        waveAmplitude = 8 + Math.sin(time * 6) * 6;
        scaleModifier = 1.02 + Math.sin(time * 3) * 0.04;
      } else if (state === 'streaming') {
        rotSpeed = 0.015;
        waveFrequency = 4.2;
        waveAmplitude = 7;
        scaleModifier = 1.0;
      } else {
        // Idle
        rotSpeed = 0.007;
        waveFrequency = 3.2;
        waveAmplitude = 4.5;
        scaleModifier = 0.98 + Math.sin(time * 1.5) * 0.03; // respiração suave
      }

      rotationAngleY += rotSpeed;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(dpr, dpr);

      const centerX = size / 2;
      const centerY = size / 2;

      // 1. Halo de Brilho Central (Aura Shekinah)
      const coreAura = ctx.createRadialGradient(
        centerX,
        centerY,
        2,
        centerX,
        centerY,
        sphereRadius * 1.15
      );
      if (state === 'thinking') {
        coreAura.addColorStop(0, 'rgba(245, 158, 11, 0.45)');
        coreAura.addColorStop(0.5, 'rgba(45, 122, 124, 0.2)');
        coreAura.addColorStop(1, 'rgba(45, 122, 124, 0)');
      } else if (state === 'speaking') {
        coreAura.addColorStop(0, 'rgba(251, 191, 36, 0.38)');
        coreAura.addColorStop(0.4, 'rgba(45, 212, 191, 0.28)');
        coreAura.addColorStop(1, 'rgba(45, 122, 124, 0)');
      } else {
        coreAura.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
        coreAura.addColorStop(0.5, 'rgba(45, 122, 124, 0.12)');
        coreAura.addColorStop(1, 'rgba(45, 122, 124, 0)');
      }
      ctx.fillStyle = coreAura;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      // 2. Projeção 3D dos pontos com deslocamento de onda senoidal ondulante
      const projected: Array<{
        x: number;
        y: number;
        z: number;
        radius: number;
        alpha: number;
        color: string;
      }> = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Deslocamento de onda topológica
        const wave =
          Math.sin(p.theta * waveFrequency + time) *
          Math.cos(p.phi * waveFrequency + time) *
          waveAmplitude;

        const currentRadius = (p.baseRadius + wave) * scaleModifier;

        // Coordenadas Cartesianas 3D
        let x = currentRadius * Math.sin(p.phi) * Math.cos(p.theta);
        let y = currentRadius * Math.cos(p.phi);
        let z = currentRadius * Math.sin(p.phi) * Math.sin(p.theta);

        // Rotação Y
        const cosY = Math.cos(rotationAngleY);
        const sinY = Math.sin(rotationAngleY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotação X
        const cosX = Math.cos(rotationAngleX);
        const sinX = Math.sin(rotationAngleX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspectiva de câmara (FOV)
        const cameraDistance = 240;
        const fov = cameraDistance / (cameraDistance - z2);

        const screenX = centerX + x1 * fov;
        const screenY = centerY + y2 * fov;

        // Profundidade Z (-sphereRadius a +sphereRadius) normalizada (0 a 1)
        const depthNorm = Math.max(0, Math.min(1, (z2 + sphereRadius) / (sphereRadius * 2)));

        // Tamanho e opacidade baseados na profundidade
        const pointRadius = Math.max(0.7, (0.8 + depthNorm * 1.4) * fov);
        const alpha = Math.max(0.15, Math.min(1, 0.2 + depthNorm * 0.8));

        // Gradiente Sagrado de Cores:
        // Topo / Frente: Esmeralda / Teal Sagrado (#2DD4BF)
        // Núcleo / Destaque: Ouro Radiante (#F59E0B / #FCD34D)
        // Profundidade / Fundo: Teal Profundo (#0F766E)
        let color = '';
        if (state === 'thinking') {
          // Mais dourado em momentos de reflexão teológica
          color = depthNorm > 0.6
            ? `rgba(251, 191, 36, ${alpha})`
            : `rgba(45, 212, 191, ${alpha * 0.85})`;
        } else if (state === 'speaking') {
          // Pulsação vibrante ouro/esmeralda
          color = depthNorm > 0.5
            ? `rgba(245, 158, 11, ${alpha})`
            : `rgba(45, 212, 191, ${alpha})`;
        } else {
          // Padrão canónico BiblIA
          if (y2 < -sphereRadius * 0.3) {
            color = `rgba(45, 212, 191, ${alpha})`; // topo esmeralda/teal
          } else if (depthNorm > 0.65) {
            color = `rgba(251, 191, 36, ${alpha})`; // destaques dourados na frente
          } else {
            color = `rgba(38, 166, 154, ${alpha})`; // teal sagrado
          }
        }

        projected.push({
          x: screenX,
          y: screenY,
          z: z2,
          radius: pointRadius,
          alpha,
          color,
        });
      }

      // 3. Ordena os pontos por Z (do mais distante para o mais próximo da tela)
      projected.sort((a, b) => a.z - b.z);

      // 4. Desenha as partículas
      for (let i = 0; i < projected.length; i++) {
        const pt = projected[i];
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();

        // Para os pontos mais brilhantes na frente, adiciona um micro brilho estelar
        if (pt.z > sphereRadius * 0.45 && i % 4 === 0) {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, pt.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${pt.alpha * 0.25})`;
          ctx.fill();
        }
      }

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state, size]);

  return (
    <div
      onClick={onClick}
      className={`relative flex items-center justify-center cursor-pointer select-none group transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
      style={{ width: size, height: size }}
      title="Orientador Espiritual Bíblico — Orbe Viva"
    >
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className="block pointer-events-none drop-shadow-[0_0_24px_rgba(45,122,124,0.35)] dark:drop-shadow-[0_0_30px_rgba(45,212,191,0.45)]"
      />
    </div>
  );
};
