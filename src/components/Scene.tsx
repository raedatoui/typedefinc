'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import FragmentShaderArt from './FragmentShaderArt';
import { useState, useRef, useMemo } from 'react';
import * as THREE from 'three';

function SceneContent() {
    // Track interaction state
    const [active, setActive] = useState(false);
    const controlsRef = useRef<any>(null);

    const initialTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);
    const spherical = useMemo(() => new THREE.Spherical(), []);
    const offset = useMemo(() => new THREE.Vector3(), []);

    useFrame((state, delta) => {
        if (!active && controlsRef.current) {
            const camera = state.camera;
            const target = controlsRef.current.target;

            // 1. Smoothly reset target to (0,0,0)
            target.lerp(initialTarget, delta * 2);

            // 2. Spherical interpolation for camera position (preserves zoom/radius)
            offset.copy(camera.position).sub(target);
            spherical.setFromVector3(offset);

            // Lerp angles towards front view (phi: PI/2, theta: 0)
            // Use simple damping for angles.
            // Note: lerping angles can be tricky with wrapping (0 vs 2PI), but for simple resets to 0 it's usually okay
            // provided we aren't crossing the singularity often.
            spherical.theta = THREE.MathUtils.lerp(spherical.theta, 0, delta * 2);
            spherical.phi = THREE.MathUtils.lerp(spherical.phi, Math.PI / 2, delta * 2);
            spherical.radius = THREE.MathUtils.lerp(spherical.radius, 5, delta * 2);

            // Reconstruct position
            offset.setFromSpherical(spherical);
            camera.position.copy(target).add(offset);

            camera.lookAt(target);
            controlsRef.current.update();
        } else if (active && controlsRef.current) {
            const camera = state.camera;
            const target = controlsRef.current.target;

            // Calculate direction from target to camera
            const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();

            // Zoom out a bit when active (from 4 to 12)
            const currentDist = camera.position.distanceTo(target);
            const targetDist = 14;
            const newDist = THREE.MathUtils.lerp(currentDist, targetDist, delta * 2);

            camera.position.copy(target).add(direction.multiplyScalar(newDist));
            controlsRef.current.update();
        }
    });

    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls
                ref={controlsRef}
                enableZoom={false}
                makeDefault
                minDistance={5}
                maxDistance={20}
                onStart={() => setActive(true)}
                onEnd={() => setActive(false)}
            />
            <FragmentShaderArt active={active} />
        </>
    );
}

export default function Scene() {
    return (
        <div className="w-full h-full min-h-[400px] bg-black">
            <Canvas>
                <SceneContent />
            </Canvas>
        </div>
    );
}
