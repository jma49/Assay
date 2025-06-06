'use client';

import React, { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originalX: number;
  originalY: number;
}

const SimpleParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });

  const initializeParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        originalX: x,
        originalY: y
      });
    }

    particlesRef.current = particles;
    console.log(`🎨 简单粒子背景：初始化了 ${particleCount} 个粒子`);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // 清空画布
    ctx.clearRect(0, 0, width, height);

    // 更新和绘制粒子
    particlesRef.current.forEach((particle, i) => {
      // 鼠标排斥效果
      const dx = particle.x - mouseRef.current.x;
      const dy = particle.y - mouseRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.vx += (dx / distance) * force * 0.02;
        particle.vy += (dy / distance) * force * 0.02;
      }

      // 回归原位的力
      const returnForceX = (particle.originalX - particle.x) * 0.001;
      const returnForceY = (particle.originalY - particle.y) * 0.001;
      particle.vx += returnForceX;
      particle.vy += returnForceY;

      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 阻尼
      particle.vx *= 0.99;
      particle.vy *= 0.99;

      // 边界处理
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      // 绘制粒子
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
      ctx.fill();

      // 绘制连接线
      particlesRef.current.forEach((otherParticle, j) => {
        if (i >= j) return;

        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          const opacity = (100 - distance) / 100 * 0.3;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.strokeStyle = `rgba(59, 130, 246, ${opacity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    });

    animationRef.current = requestAnimationFrame(animate);
  }, []);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }, []);

  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    initializeParticles(canvas.width, canvas.height);
  }, [initializeParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 设置画布大小
    handleResize();

    // 开始动画
    animate();

    // 添加事件监听器
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    console.log('🎨 简单粒子背景已启动');

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [animate, handleResize, handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default SimpleParticleBackground; 