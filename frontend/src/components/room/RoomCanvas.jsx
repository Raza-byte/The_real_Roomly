import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

/*  Wall ─ */
const Wall = ({ position, rotation, width, height, color }) => (
    <mesh position={position} rotation={rotation} receiveShadow castShadow>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} metalness={0.05} />
    </mesh>
);

/*  Floor  */
const Floor = ({ width, length, color }) => (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color={color} roughness={0.9} metalness={0.0} />
    </mesh>
);

/*  Room box  */
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

            <Wall position={[0, hh, -hl]} rotation={[0, 0, 0]}           width={width}  height={height} color={wallColor} />
            <Wall position={[0, hh,  hl]} rotation={[0, Math.PI, 0]}     width={width}  height={height} color={wallColor} />
            <Wall position={[-hw, hh, 0]} rotation={[0,  Math.PI / 2, 0]} width={length} height={height} color={wallColor} />
            <Wall position={[ hw, hh, 0]} rotation={[0, -Math.PI / 2, 0]} width={length} height={height} color={wallColor} />

            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(width, height, length)]} />
                <lineBasicMaterial color="#3D2B1F" transparent opacity={0.08} />
            </lineSegments>
        </group>
    );
};

/*  Lighting  */
const Lighting = ({ roomHeight }) => (
    <>
        <ambientLight intensity={0.6} />
        <directionalLight
            position={[5, 8, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
        />
        <pointLight position={[0, roomHeight - 0.1, 0]} intensity={0.8} distance={20} color="#fff8e7" />
    </>
);

/*  Furniture piece — upright billboard on the floor, draggable  */
const FurniturePiece = ({ item, onMove, orbitRef, roomBounds }) => {
    const groupRef    = useRef(); // translates for drag
    const isDragging  = useRef(false);
    const intersectPt = useRef(new THREE.Vector3());
    const floorPlane  = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

    const { camera, gl, raycaster } = useThree();

    const [texture, setTexture] = useState(null);
    const [aspect,  setAspect]  = useState(1);
    const aspectRef = useRef(1); // ref so drag handler always reads latest aspect

    /* Load texture, capture natural aspect ratio */
    useEffect(() => {
        const loader = new THREE.TextureLoader();
        loader.load(item.src, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            setTexture(tex);
            if (tex.image) {
                const a = tex.image.width / tex.image.height;
                setAspect(a);
                aspectRef.current = a;
            }
        });
    }, [item.src]);

    /* Cylindrical billboard: rotate group on Y-axis only to face camera */
    useFrame(({ camera: cam }) => {
        if (!groupRef.current) return;
        const p = groupRef.current.position;
        // lookAt makes the group's -Z face the target; with DoubleSide this is fine
        groupRef.current.lookAt(cam.position.x, p.y, cam.position.z);
    });

    /* Global drag handlers — clamp position to room bounds */
    useEffect(() => {
        const canvas = gl.domElement;

        const handleMove = (e) => {
            if (!isDragging.current || !groupRef.current) return;
            const rect = canvas.getBoundingClientRect();
            const nx   = ((e.clientX - rect.left)  / rect.width)  *  2 - 1;
            const ny   = -((e.clientY - rect.top)  / rect.height) *  2 + 1;
            raycaster.setFromCamera({ x: nx, y: ny }, camera);
            if (raycaster.ray.intersectPlane(floorPlane, intersectPt.current)) {
                // Half-size of furniture for clamping
                const FURNITURE_H = 1.6;
                const halfW = (FURNITURE_H * aspectRef.current) / 2;
                const margin = 0.12; // small gap from wall

                const { hw, hl } = roomBounds;
                const clampedX = Math.max(-(hw - halfW - margin), Math.min(hw - halfW - margin, intersectPt.current.x));
                const clampedZ = Math.max(-(hl - halfW - margin), Math.min(hl - halfW - margin, intersectPt.current.z));

                groupRef.current.position.x = clampedX;
                groupRef.current.position.z = clampedZ;
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
    }, [gl, camera, raycaster, floorPlane, item.instanceId, onMove, orbitRef]);

    if (!texture) return null;

    // Scale: 1.6 m tall; width follows the natural aspect ratio of the image
    const h = 1.6;
    const w = h * aspect;

    return (
        // Group sits at floor level; y = h/2 so the bottom edge is at y=0 (floor)
        <group ref={groupRef} position={[item.x, h / 2, item.z]}>
            <mesh
                onPointerDown={(e) => {
                    e.stopPropagation();
                    isDragging.current = true;
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
            >
                <planeGeometry args={[w, h]} />
                {/* DoubleSide so it's visible regardless of billboard rotation */}
                <meshBasicMaterial map={texture} transparent alphaTest={0.05} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

/*  Main canvas  */
const RoomCanvas = ({ room, viewMode = '3d', furnitureItems = [], onFurnitureMove }) => {
    const { dimensions, wallColor, floorColor, ceilingColor } = room;
    const { width, length, height } = dimensions;
    const orbitRef = useRef();

    const is2D = viewMode === '2d';

    const camDistance3D = Math.max(width, length) * 1.4;
    const camHeight3D   = height * 1.2;

    const eyeLevel = height * 0.52;
    const hl       = length / 2;
    const hw       = width  / 2;

    const handleMove = useCallback((instanceId, x, z) => {
        if (onFurnitureMove) onFurnitureMove(instanceId, x, z);
    }, [onFurnitureMove]);

    return (
        <Canvas shadows className="w-full h-full" key={viewMode}>
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

            {/* Scene */}
            <color attach="background" args={['#F9F3E8']} />
            <fog   attach="fog"        args={['#F9F3E8', 20, 60]} />

            <Lighting roomHeight={height} />

            <Room3D
                dimensions={dimensions}
                wallColor={wallColor   || '#F5F0EB'}
                floorColor={floorColor || '#C8A882'}
                ceilingColor={ceilingColor || '#FFFFFF'}
            />

            {/* Furniture pieces */}
            {furnitureItems.map((item) => (
                <FurniturePiece
                    key={item.instanceId}
                    item={item}
                    onMove={handleMove}
                    orbitRef={orbitRef}
                    roomBounds={{ hw, hl }}
                />
            ))}

            <ContactShadows
                position={[0, -0.01, 0]}
                opacity={is2D ? 0 : 0.15}
                scale={Math.max(width, length) * 2}
                blur={2}
                far={4}
            />
        </Canvas>
    );
};

export default RoomCanvas;