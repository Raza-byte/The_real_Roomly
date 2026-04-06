import { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/* ─── Wall ─────────────────────────────────────────────────────────────── */
const Wall = ({ position, rotation, width, height, color }) => (
    <mesh position={position} rotation={rotation} receiveShadow castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} metalness={0.05} />
    </mesh>
);

/* ─── Floor ─────────────────────────────────────────────────────────────── */
const Floor = ({ width, length, color }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.0} />
    </mesh>
);

/* ─── Room box ───────────────────────────────────────────────────────────── */
const Room3D = ({ dimensions, wallColor, floorColor, ceilingColor }) => {
    const { width, length, height } = dimensions;
    const hw = width / 2;
    const hl = length / 2;
    const hh = height / 2;

    return (
        <group>
            <Floor width={width} length={length} color={floorColor} />
            {/* Ceiling */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, height, 0]} receiveShadow>
                <planeGeometry args={[width, length]} />
                <meshStandardMaterial color={ceilingColor} roughness={1.0} side={THREE.DoubleSide} />
            </mesh>

            <Wall position={[0, hh, -hl]} rotation={[0, 0, 0]}            width={width}  height={height} color={wallColor} />
            <Wall position={[0, hh,  hl]} rotation={[0, Math.PI, 0]}      width={width}  height={height} color={wallColor} />
            <Wall position={[-hw, hh, 0]} rotation={[0,  Math.PI / 2, 0]} width={length} height={height} color={wallColor} />
            <Wall position={[ hw, hh, 0]} rotation={[0, -Math.PI / 2, 0]} width={length} height={height} color={wallColor} />

            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(width, height, length)]} />
                <lineBasicMaterial color="#3D2B1F" transparent opacity={0.08} />
            </lineSegments>
        </group>
    );
};

/* ─── Lighting ───────────────────────────────────────────────────────────── */
const Lighting = ({ roomHeight }) => (
    <>
        <ambientLight intensity={0.65} />
        <directionalLight
            position={[5, 8, 5]}
            intensity={1.3}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
        />
        <pointLight position={[0, roomHeight - 0.1, 0]} intensity={0.8} distance={20} color="#fff8e7" />
    </>
);

/* ─── Selection ring rendered under the selected piece ───────────────────── */
const SelectionRing = ({ radius = 0.6 }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[radius * 0.85, radius, 48]} />
        <meshBasicMaterial color="#F5C842" transparent opacity={0.55} side={THREE.DoubleSide} />
    </mesh>
);

/* ─── 3D GLtF furniture piece — draggable, scalable, rotatable ───────────── */
const FurnitureModel3D = ({ item, onMove, onSelect, orbitRef, roomBounds, isSelected }) => {
    const groupRef   = useRef();
    const isDragging = useRef(false);
    const intersectPt = useRef(new THREE.Vector3());
    const floorPlane  = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    const { camera, gl, raycaster } = useThree();

    // Load the glTF model
    const { scene: modelScene } = useGLTF(item.modelPath);

    // Clone so multiple instances don't share the same object
    const clonedScene = useMemo(() => {
        const clone = modelScene.clone(true);
        // Enable shadows on every mesh inside
        clone.traverse((child) => {
            if (child.isMesh) {
                child.castShadow    = true;
                child.receiveShadow = true;
            }
        });
        return clone;
    }, [modelScene]);

    // Auto-fit: compute a normalised scale so the bounding box height ≈ 1 unit
    const normScale = useMemo(() => {
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        return maxDim > 0 ? 1.0 / maxDim : 1;
    }, [clonedScene]);

    /* ── Global drag handlers ── */
    useEffect(() => {
        const canvas = gl.domElement;

        const handleMove = (e) => {
            if (!isDragging.current || !groupRef.current) return;
            const rect = canvas.getBoundingClientRect();
            const nx   = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
            const ny   = -((e.clientY - rect.top)  / rect.height) *  2 + 1;
            raycaster.setFromCamera({ x: nx, y: ny }, camera);
            if (raycaster.ray.intersectPlane(floorPlane, intersectPt.current)) {
                const margin = 0.3;
                const { hw, hl } = roomBounds;
                const cx = Math.max(-(hw - margin), Math.min(hw - margin, intersectPt.current.x));
                const cz = Math.max(-(hl - margin), Math.min(hl - margin, intersectPt.current.z));
                groupRef.current.position.x = cx;
                groupRef.current.position.z = cz;
            }
        };

        const handleUp = () => {
            if (!isDragging.current) return;
            isDragging.current = false;
            if (orbitRef?.current) orbitRef.current.enabled = true;
            canvas.style.cursor = '';
            if (groupRef.current) {
                onMove?.(item.instanceId, groupRef.current.position.x, groupRef.current.position.z);
            }
        };

        canvas.addEventListener('pointermove', handleMove);
        canvas.addEventListener('pointerup',   handleUp);
        return () => {
            canvas.removeEventListener('pointermove', handleMove);
            canvas.removeEventListener('pointerup',   handleUp);
        };
    }, [gl, camera, raycaster, floorPlane, item.instanceId, onMove, orbitRef, roomBounds]);

    // The final displayed scale = normalised scale × user scale
    const displayScale = normScale * (item.scale ?? 1.0);

    // Bounding box height in world units for correct floor placement
    const modelHalfHeight = useMemo(() => {
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        return (size.y * normScale * (item.scale ?? 1.0)) / 2;
    }, [clonedScene, normScale, item.scale]);

    // Ring radius = roughly half the XZ footprint
    const ringRadius = useMemo(() => {
        const box = new THREE.Box3().setFromObject(clonedScene);
        const size = new THREE.Vector3();
        box.getSize(size);
        return Math.max(size.x, size.z) * normScale * (item.scale ?? 1.0) * 0.6;
    }, [clonedScene, normScale, item.scale]);

    return (
        <group
            ref={groupRef}
            position={[item.x, modelHalfHeight, item.z]}
            rotation={[0, item.rotationY ?? 0, 0]}
        >
            {/* Selection glow ring */}
            {isSelected && <SelectionRing radius={ringRadius} />}

            <primitive
                object={clonedScene}
                scale={[displayScale, displayScale, displayScale]}
                onPointerDown={(e) => {
                    e.stopPropagation();
                    isDragging.current = true;
                    onSelect?.(item.instanceId);
                    if (orbitRef?.current) orbitRef.current.enabled = false;
                    gl.domElement.style.cursor = 'grabbing';
                }}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    if (!isDragging.current) gl.domElement.style.cursor = 'grab';
                }}
                onPointerOut={() => {
                    if (!isDragging.current) gl.domElement.style.cursor = '';
                }}
            />
        </group>
    );
};

/* ─── Main canvas ─────────────────────────────────────────────────────────── */
const RoomCanvas = ({
    room,
    viewMode       = '3d',
    furnitureItems = [],
    selectedId,
    onFurnitureMove,
    onFurnitureSelect,
}) => {
    const { dimensions, wallColor, floorColor, ceilingColor } = room;
    const { width, length, height } = dimensions;
    const orbitRef = useRef();

    const is2D = viewMode === '2d';

    const camDistance3D = Math.max(width, length) * 1.4;
    const camHeight3D   = height * 1.2;
    const eyeLevel      = height * 0.52;
    const hl            = length / 2;
    const hw            = width  / 2;

    const handleMove = useCallback((instanceId, x, z) => {
        if (onFurnitureMove) onFurnitureMove(instanceId, x, z);
    }, [onFurnitureMove]);

    const handleSelect = useCallback((instanceId) => {
        if (onFurnitureSelect) onFurnitureSelect(instanceId);
    }, [onFurnitureSelect]);

    // Deselect when clicking empty space
    const handleCanvasClick = useCallback(() => {
        // handled by onPointerDown on individual pieces; this just gives us background click
    }, []);

    return (
        <Canvas
            shadows
            className="w-full h-full"
            key={viewMode}
            onPointerMissed={() => onFurnitureSelect?.(null)}
        >
            {/* Camera */}
            {is2D ? (
                <PerspectiveCamera makeDefault position={[0, eyeLevel, hl * 0.98]} fov={70} />
            ) : (
                <PerspectiveCamera makeDefault position={[camDistance3D, camHeight3D, camDistance3D]} fov={50} />
            )}

            {/* Orbit controls */}
            {is2D ? (
                <OrbitControls
                    ref={orbitRef}
                    enableDamping dampingFactor={0.06}
                    minDistance={Math.min(hw, hl) * 0.4}
                    maxDistance={hl * 0.99}
                    minPolarAngle={Math.PI / 2 - 0.25}
                    maxPolarAngle={Math.PI / 2 + 0.08}
                    target={[0, eyeLevel, 0]}
                    enablePan={false}
                />
            ) : (
                <OrbitControls
                    ref={orbitRef}
                    enableDamping dampingFactor={0.05}
                    minDistance={2}
                    maxDistance={camDistance3D * 2.5}
                    maxPolarAngle={Math.PI / 2}
                    target={[0, height / 2, 0]}
                />
            )}

            {/* Scene background */}
            <color attach="background" args={['#F9F3E8']} />
            <fog   attach="fog"        args={['#F9F3E8', 20, 60]} />

            <Lighting roomHeight={height} />

            <Room3D
                dimensions={dimensions}
                wallColor={wallColor      || '#F5F0EB'}
                floorColor={floorColor    || '#C8A882'}
                ceilingColor={ceilingColor || '#FFFFFF'}
            />

            {/* 3D Furniture pieces */}
            {furnitureItems.map((item) => (
                <FurnitureModel3D
                    key={item.instanceId}
                    item={item}
                    onMove={handleMove}
                    onSelect={handleSelect}
                    orbitRef={orbitRef}
                    roomBounds={{ hw, hl }}
                    isSelected={item.instanceId === selectedId}
                />
            ))}

            <ContactShadows
                position={[0, -0.01, 0]}
                opacity={is2D ? 0 : 0.2}
                scale={Math.max(width, length) * 2}
                blur={2}
                far={4}
            />
        </Canvas>
    );
};

export default RoomCanvas;