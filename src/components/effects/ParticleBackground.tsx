'use client';

import React, { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// 粒子系统组件
function ParticleSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { size, mouse } = useThree();
  
  // 粒子配置
  const particleCount = 150;
  const connectionDistance = 100;
  const mouseInfluenceRadius = 80;
  const mouseRepulsionStrength = 30;
  
  // 初始化粒子数据
  const particles = useMemo(() => {
    const particleArray = [];
    
    for (let i = 0; i < particleCount; i++) {
      particleArray.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * size.width * 0.8,
          (Math.random() - 0.5) * size.height * 0.8,
          (Math.random() - 0.5) * 200
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ),
        originalPosition: new THREE.Vector3(),
        id: i
      });
    }
    
    // 保存原始位置
    particleArray.forEach(particle => {
      particle.originalPosition.copy(particle.position);
    });
    
    console.log(`🎨 初始化了 ${particleCount} 个粒子`, {
      sampleParticle: particleArray[0],
      canvasSize: size
    });
    
    return particleArray;
  }, [size.width, size.height]);

  // 初始化实例化矩阵
  React.useEffect(() => {
    if (meshRef.current) {
      particles.forEach((particle, i) => {
        const matrix = new THREE.Matrix4();
        matrix.setPosition(particle.position);
        meshRef.current?.setMatrixAt(i, matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      console.log('🎨 粒子实例化矩阵已初始化');
    }
  }, [particles]);

  // 更新粒子位置的函数
  const updateParticles = useCallback(() => {
    if (!meshRef.current) return;

    // 鼠标位置转换为3D坐标
    const mouseX = (mouse.x * size.width) / 2;
    const mouseY = -(mouse.y * size.height) / 2;
         const mousePos = new THREE.Vector3(mouseX, mouseY, 0);

    particles.forEach((particle, i) => {
      // 计算与鼠标的距离
      const distanceToMouse = particle.position.distanceTo(mousePos);
      
      if (distanceToMouse < mouseInfluenceRadius) {
        // 鼠标排斥效果
        const repulsionDirection = particle.position.clone().sub(mousePos).normalize();
        const repulsionForce = (mouseInfluenceRadius - distanceToMouse) / mouseInfluenceRadius;
        particle.velocity.add(repulsionDirection.multiplyScalar(repulsionForce * mouseRepulsionStrength * 0.01));
      } else {
        // 缓慢回归原始轨迹
        const returnDirection = particle.originalPosition.clone().sub(particle.position);
        particle.velocity.add(returnDirection.multiplyScalar(0.001));
      }
      
      // 应用速度
      particle.position.add(particle.velocity);
      
      // 速度阻尼
      particle.velocity.multiplyScalar(0.98);
      
      // 边界检测 - 循环边界
      const halfWidth = size.width * 0.5;
      const halfHeight = size.height * 0.5;
      
      if (particle.position.x > halfWidth) {
        particle.position.x = -halfWidth;
        particle.originalPosition.x = -halfWidth;
      } else if (particle.position.x < -halfWidth) {
        particle.position.x = halfWidth;
        particle.originalPosition.x = halfWidth;
      }
      
      if (particle.position.y > halfHeight) {
        particle.position.y = -halfHeight;
        particle.originalPosition.y = -halfHeight;
      } else if (particle.position.y < -halfHeight) {
        particle.position.y = halfHeight;
        particle.originalPosition.y = halfHeight;
      }
      
      if (particle.position.z > 100) {
        particle.position.z = -100;
      } else if (particle.position.z < -100) {
        particle.position.z = 100;
      }

      // 更新实例化网格的位置
      const matrix = new THREE.Matrix4();
      matrix.setPosition(particle.position);
      meshRef.current?.setMatrixAt(i, matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [particles, mouse, size]);

  // 生成连线
  const generateConnections = useCallback(() => {
    if (!linesRef.current) return;

    const positions = [];
    const colors = [];
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = particles[i].position.distanceTo(particles[j].position);
        
        if (distance < connectionDistance) {
          // 添加线条
          positions.push(
            particles[i].position.x, particles[i].position.y, particles[i].position.z,
            particles[j].position.x, particles[j].position.y, particles[j].position.z
          );
          
          // 根据距离计算透明度
          const opacity = Math.max(0, 1 - distance / connectionDistance) * 0.6;
          colors.push(0.2, 0.5, 1, opacity); // 更明显的蓝色
          colors.push(0.2, 0.5, 1, opacity);
        }
      }
    }

    const geometry = linesRef.current.geometry;
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [particles]);

  // 动画循环
  useFrame(() => {
    updateParticles();
    generateConnections();
  });

  return (
    <>
      {/* 粒子点 */}
      <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.9} />
      </instancedMesh>
      
      {/* 连接线 */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial transparent vertexColors />
      </lineSegments>
    </>
  );
}

// 主要的粒子背景组件
export default function ParticleBackground() {
  // 添加调试信息
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🎨 粒子背景组件已挂载');
    }
  }, []);

  return (
    <div className="particle-background">
      <Canvas
        camera={{ 
          position: [0, 0, 300], 
          fov: 75,
          near: 1,
          far: 1000
        }}
        gl={{ 
          alpha: true, 
          antialias: true,
          powerPreference: "high-performance"
        }}
        onCreated={(state) => {
          console.log('🎨 Three.js Canvas 已创建:', state.gl.domElement);
          console.log('🎨 Canvas尺寸:', state.size);
        }}
      >
        <ambientLight intensity={0.5} />
        <ParticleSystem />
      </Canvas>
    </div>
  );
}