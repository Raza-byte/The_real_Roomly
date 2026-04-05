import { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// Individual wall component
const Wall = ({ position, rotation, width, height, color }) => {
    return (
        <mesh position={position} rotation={rotation} receiveShadow castShadow>
            <planeGeometry args={[width, height]} />
            <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} metalness={0.05} />
        </mesh>
    );
};

// Floor component
const Floor = ({ width, length, color }) => {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[width, length]} />
            <meshStandardMaterial color={color} roughness={0.9} metalness={0.0} />
        </mesh>
    );
};

// Ceiling component
const Ceiling = ({ width, length, color }) => {
    return (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[width, length]} />
            <meshStandardMaterial color={color} roughness={1.0} metalness={0.0} />
        </mesh>
    );
};

// The complete room box
const Room3D = ({ dimensions, wallColor, floorColor, ceilingColor }) => {
    const { width, length, height } = dimensions;
    const hw = width / 2;   // half width
    const hl = length / 2;  // half length
    const hh = height / 2;  // half height

    return (
        <group>
            {/* Floor */}
            <Floor width={width} length={length} color={floorColor} />

            {/* Ceiling */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color={ceilingColor} roughness={1.0} side={THREE.DoubleSide} />
            </mesh>

            {/* Back wall (far Z) */}
            <Wall
                position={[0, hh, -hl]}
                rotation={[0, 0, 0]}
                width={width}
                height={height}
                color={wallColor}
            />

            {/* Front wall (near Z) */}
            <Wall
                position={[0, hh, hl]}
                rotation={[0, Math.PI, 0]}
                width={width}
                height={height}
                color={wallColor}
            />

            {/* Left wall */}
            <Wall
                position={[-hw, hh, 0]}
                rotation={[0, Math.PI / 2, 0]}
                width={length}
                height={height}
                color={wallColor}
            />

            {/* Right wall */}
            <Wall
                position={[hw, hh, 0]}
                rotation={[0, -Math.PI / 2, 0]}
                width={length}
                height={height}
                color={wallColor}
            />

            {/* Edge lines for definition */}
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(width, height, length)]} />
                <lineBasicMaterial color="#3D2B1F" transparent opacity={0.08} />
            </lineSegments>
        </group>
    );
};

// Lighting setup
const Lighting = ({ roomHeight }) => {
    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight
                position={[5, 8, 5]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />
            {/* Ceiling light simulation */}
            <pointLight
                position={[0, roomHeight - 0.1, 0]}
                intensity={0.8}
                distance={20}
                color="#fff8e7"
            />
        </>
    );
};

// Main 3D canvas export
const RoomCanvas = ({ room, viewMode = '3d' }) => {
    const { dimensions, wallColor, floorColor, ceilingColor } = room;
    const { width, length, height } = dimensions;

    const is2D = viewMode === '2d';

    // 3D mode: diagonal elevated angle
    const camDistance3D = Math.max(width, length) * 1.4;
    const camHeight3D = height * 1.2;

    const eyeLevel  = height * 0.52;   // ~eye height
    const hl        = length / 2;      // half-length — front wall position
    const hw        = width  / 2;      // half-width

    return (
        <Canvas shadows className="w-full h-full" key={viewMode}>
            {is2D ? (
                // Start at the front-wall edge, looking straight at the back wall
                <PerspectiveCamera
                    makeDefault
                    position={[0, eyeLevel, hl * 0.98]}
                    fov={70}
                />
            ) : (
                // 3D free-look camera
                <PerspectiveCamera
                    makeDefault
                    position={[camDistance3D, camHeight3D, camDistance3D]}
                    fov={50}
                />
            )}

            {is2D ? (
                // Inside-the-room orbit: horizontal rotation only, pivot at room centre
                // The camera stays at ~hl radius, so you're always at the wall edge
                <OrbitControls
                    enableDamping
                    dampingFactor={0.06}
                    // Keep camera inside — max distance = slightly more than hl
                    minDistance={Math.min(hw, hl) * 0.4}
                    maxDistance={hl * 0.99}
                    // Lock vertical: camera stays at eye level, no tilting up/down
                    minPolarAngle={Math.PI / 2 - 0.25}
                    maxPolarAngle={Math.PI / 2 + 0.08}
                    target={[0, eyeLevel, 0]}
                    enablePan={false}
                />
            ) : (
                // Full 3D free orbit
                <OrbitControls
                    enableDamping
                    dampingFactor={0.05}
                    minDistance={2}
                    maxDistance={camDistance3D * 2.5}
                    maxPolarAngle={Math.PI / 2}
                    target={[0, height / 2, 0]}
                />
            )}

            {/* Scene background — same warm cream in both modes */}
            <color attach="background" args={['#F9F3E8']} />
            <fog attach="fog" args={['#F9F3E8', 20, 60]} />

            <Lighting roomHeight={height} />

            {/* The room */}
            <Room3D
                dimensions={dimensions}
                wallColor={wallColor || '#F5F0EB'}
                floorColor={floorColor || '#C8A882'}
                ceilingColor={ceilingColor || '#FFFFFF'}
            />

            {/* Ground shadow outside the room */}
            <ContactShadows
                position={[0, -0.01, 0]}
                opacity={is2D ? 0.0 : 0.15}
                scale={Math.max(width, length) * 2}
                blur={2}
                far={4}
            />
        </Canvas>
    );
};

export default RoomCanvas;