'use client';

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Configuration parameters
const CONFIG = {
  particleCount: 120,
  particleSize: 0.06,
  boundarySize: 5,
  connectionThreshold: 1.8,
  connectionOpacity: 0.15,
  mouseRepulsionRadius: 1.2,
  mouseRepulsionStrength: 0.05,
  particleColor: '#89b4fa', // Matches your primary blue color
  lineColor: '#89b4fa',
  velocityFactor: 0.01,
  particleAlpha: 0.7
};

// Particle type definition
interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  originalVelocity: THREE.Vector3;
}

function ParticleSystem() {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const mousePosition = useRef(new THREE.Vector3(0, 0, 10));
  const [particles, setParticles] = useState<Particle[]>([]);

  // Initialize particles
  useEffect(() => {
    const newParticles = Array(CONFIG.particleCount).fill(0).map(() => {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * CONFIG.velocityFactor,
        (Math.random() - 0.5) * CONFIG.velocityFactor,
        (Math.random() - 0.5) * CONFIG.velocityFactor
      );
      
      return {
        position: new THREE.Vector3(
          (Math.random() - 0.5) * CONFIG.boundarySize * 2,
          (Math.random() - 0.5) * CONFIG.boundarySize * 2,
          (Math.random() - 0.5) * CONFIG.boundarySize * 2
        ),
        velocity: velocity.clone(),
        originalVelocity: velocity.clone()
      };
    });
    setParticles(newParticles);
  }, []);

  // Track mouse position for interaction
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Convert screen coordinates to normalized device coordinates (-1 to 1)
      mousePosition.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mousePosition.current.y = -((event.clientY / window.innerHeight) * 2 - 1);
      mousePosition.current.z = 0; // Keep on camera plane
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Positions for the Points component
  const positions = useMemo(() => {
    return new Float32Array(particles.map(p => 
      [p.position.x, p.position.y, p.position.z]).flat());
  }, [particles]);

  // Calculate lines between particles
  const updateConnections = () => {
    if (!linesRef.current || particles.length === 0) return;
    
    const lines: number[] = [];
    
    // Check pairs of particles for connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = particles[i].position.distanceTo(particles[j].position);
        
        if (distance < CONFIG.connectionThreshold) {
          // Calculate opacity based on distance - closer particles have more opaque connections
          const opacity = 1 - (distance / CONFIG.connectionThreshold);
          
          lines.push(
            particles[i].position.x, particles[i].position.y, particles[i].position.z,
            particles[j].position.x, particles[j].position.y, particles[j].position.z
          );
        }
      }
    }
    
    // Update line geometry
    const lineGeometry = new THREE.BufferGeometry();
    if (lines.length > 0) {
      lineGeometry.setAttribute(
        'position', 
        new THREE.Float32BufferAttribute(lines, 3)
      );
      
      if (linesRef.current.geometry) {
        linesRef.current.geometry.dispose();
      }
      linesRef.current.geometry = lineGeometry;
    }
  };

  // Animation loop
  useFrame(({ camera }) => {
    if (!pointsRef.current || particles.length === 0) return;
    
    // Convert 2D mouse position to 3D world position
    const vector = new THREE.Vector3(
      mousePosition.current.x, 
      mousePosition.current.y, 
      0.5
    );
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));
    
    // Update particle positions
    const positions = pointsRef.current.geometry.attributes.position.array as Float32Array;
    
    particles.forEach((particle, i) => {
      // Calculate distance to mouse position
      const distanceToMouse = particle.position.distanceTo(pos);
      
      // Apply mouse repulsion
      if (distanceToMouse < CONFIG.mouseRepulsionRadius) {
        const repulsionVector = new THREE.Vector3().subVectors(
          particle.position, 
          pos
        ).normalize();
        
        const repulsionStrength = CONFIG.mouseRepulsionStrength * 
          (1 - (distanceToMouse / CONFIG.mouseRepulsionRadius));
        
        // Move away from mouse
        particle.position.add(
          repulsionVector.multiplyScalar(repulsionStrength)
        );
        
        // Gradually return to original velocity
        particle.velocity.lerp(particle.originalVelocity, 0.02);
      }
      
      // Update position based on velocity
      particle.position.add(particle.velocity);
      
      // Apply boundary wrapping
      ['x', 'y', 'z'].forEach(axis => {
        if (particle.position[axis] < -CONFIG.boundarySize) {
          particle.position[axis] = CONFIG.boundarySize;
        } else if (particle.position[axis] > CONFIG.boundarySize) {
          particle.position[axis] = -CONFIG.boundarySize;
        }
      });
      
      // Update geometry positions
      const idx = i * 3;
      positions[idx] = particle.position.x;
      positions[idx + 1] = particle.position.y;
      positions[idx + 2] = particle.position.z;
    });
    
    // Flag geometry for update
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
    
    // Update connections
    updateConnections();
  });
  
  return (
    <>
      <Points ref={pointsRef} limit={CONFIG.particleCount}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <PointMaterial
          size={CONFIG.particleSize}
          color={CONFIG.particleColor}
          sizeAttenuation
          transparent
          depthWrite={false}
          opacity={CONFIG.particleAlpha}
        />
      </Points>
      
      {/* Lines connecting nearby particles */}
      <lineSegments ref={linesRef}>
        <bufferGeometry />
        <lineBasicMaterial
          color={CONFIG.lineColor}
          transparent
          opacity={CONFIG.connectionOpacity}
          depthWrite={false}
        />
      </lineSegments>
    </>
  );
}

export default function ParticleBackground() {
  // Automatically adjust camera position based on screen size
  const [cameraPosition, setCameraPosition] = useState([0, 0, 8]);
  
  useEffect(() => {
    const handleResize = () => {
      // Move camera further back on larger screens for better perspective
      const distance = Math.max(8, Math.min(12, window.innerWidth / 250));
      setCameraPosition([0, 0, distance]);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="particle-background">
      <Canvas camera={{ position: cameraPosition, fov: 60 }}>
        <color attach="background" args={['transparent']} />
        <fog attach="fog" args={['#000', 5, 20]} />
        <ParticleSystem />
      </Canvas>
    </div>
  );
}