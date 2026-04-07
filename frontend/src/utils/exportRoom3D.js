/**
 * exportRoom3D.js
 *
 * Builds a complete Three.js scene from room parameters + furniture items
 * (loaded GLTF models) and exports it as a binary GLTF (.glb) or Wavefront
 * OBJ file that the user can download.
 *
 * Why we rebuild the scene rather than grabbing the live R3F canvas scene:
 *   – The R3F renderer owns the WebGL context; grabbing its scene directly
 *     while it is being rendered can produce incomplete / race-condition
 *     artefacts.  Rebuilding gives us a clean, export-only Three.js group
 *     that we control completely.
 */

import * as THREE from 'three';
import { GLTFLoader }   from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter }  from 'three/examples/jsm/exporters/OBJExporter.js';

/* helpers */

function makeMaterial(color) {
    return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.85,
        metalness: 0.0,
    });
}

/**
 * Build the room shell (floor + ceiling + 4 walls) as a Three.js Group.
 */
function buildRoomShell(room) {
    const { width, length, height } = room.dimensions;
    const hw = width  / 2;
    const hl = length / 2;
    const hh = height / 2;

    const wc  = room.wallColors  || {};
    const cFront  = wc.front  || room.wallColor  || '#F5F0EB';
    const cBack   = wc.back   || room.wallColor  || '#F5F0EB';
    const cLeft   = wc.left   || room.wallColor  || '#F5F0EB';
    const cRight  = wc.right  || room.wallColor  || '#F5F0EB';
    const cFloor  = room.floorColor   || '#C8A882';
    const cCeil   = room.ceilingColor || '#FFFFFF';

    const group = new THREE.Group();
    group.name  = 'RoomShell';

    const addPlane = (w, h, mat, pos, rotX, rotY) => {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
        mesh.position.set(...pos);
        mesh.rotation.set(rotX, rotY, 0);
        mesh.castShadow    = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    };

    // Floor
    addPlane(width, length, makeMaterial(cFloor),  [0, 0, 0],              -Math.PI / 2, 0);
    // Ceiling
    addPlane(width, length, makeMaterial(cCeil),   [0, height, 0],         -Math.PI / 2, 0);
    // Front wall  (z = -hl)
    addPlane(width, height, makeMaterial(cFront),  [0, hh, -hl],            0,            0);
    // Back wall   (z = +hl)
    addPlane(width, height, makeMaterial(cBack),   [0, hh,  hl],            0,            Math.PI);
    // Left wall   (x = -hw)
    addPlane(length, height, makeMaterial(cLeft),  [-hw, hh, 0],            0,            Math.PI / 2);
    // Right wall  (x = +hw)
    addPlane(length, height, makeMaterial(cRight), [ hw, hh, 0],            0,           -Math.PI / 2);

    return group;
}

/**
 * Load a GLTF model from a URL and return a clone with shadow flags set.
 * Returns a promise that resolves to a THREE.Group.
 */
function loadModel(url) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.load(
            url,
            (gltf) => {
                const root = gltf.scene;
                root.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow    = true;
                        child.receiveShadow = true;
                    }
                });
                resolve(root);
            },
            undefined,
            reject,
        );
    });
}

/**
 * Normalise scale: tallest bounding-box dimension → 1 world unit.
 */
function normaliseScale(obj) {
    const box  = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    return maxDim > 0 ? 1.0 / maxDim : 1;
}

/* public API */

/**
 * Build a complete THREE.Scene from room + furnitureItems,
 * ready for export.
 *
 * @param {object}   room           – room document from the backend
 * @param {object[]} furnitureItems – array of furniture placement objects
 * @param {function} [onProgress]   – optional (loaded, total) callback
 * @returns {Promise<THREE.Scene>}
 */
export async function buildExportScene(room, furnitureItems, onProgress) {
    const scene = new THREE.Scene();
    scene.name  = room.name || 'Room';

    // Lighting (baked into the export so viewers render it nicely)
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 8, 5);
    scene.add(dir);

    // Room geometry
    scene.add(buildRoomShell(room));

    // Furniture
    const total = furnitureItems.length;
    for (let i = 0; i < total; i++) {
        const item = furnitureItems[i];
        try {
            const model = await loadModel(item.modelPath);
            const ns    = normaliseScale(model);
            const sf    = ns * (item.scale ?? 1.0);

            // Compute vertical centre offset so model sits on floor
            const box  = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const hy   = (size.y * sf) / 2;
            const lift = item.positionY ?? 0;

            const wrapper = new THREE.Group();
            wrapper.name  = item.label || item.furnitureId;
            wrapper.add(model);

            // Apply the same transforms as in RoomCanvas
            wrapper.scale.setScalar(sf);
            wrapper.position.set(item.x, hy + lift, item.z);
            wrapper.rotation.y = item.rotationY ?? 0;

            scene.add(wrapper);
        } catch (err) {
            console.warn(`[exportRoom3D] failed to load model ${item.modelPath}:`, err);
        }
        onProgress?.(i + 1, total);
    }

    return scene;
}

/**
 * Export a built scene as a binary GLTF (.glb) and trigger a browser download.
 *
 * @param {THREE.Scene} scene
 * @param {string}      filename  – without extension
 * @returns {Promise<void>}
 */
export function exportAsGLB(scene, filename = 'room') {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(
            scene,
            (result) => {
                const blob = new Blob([result], { type: 'model/gltf-binary' });
                triggerDownload(blob, `${filename}.glb`);
                resolve();
            },
            (err) => reject(err),
            { binary: true, embedImages: true },
        );
    });
}

/**
 * Export a built scene as a GLTF JSON (.gltf) and trigger a browser download.
 */
export function exportAsGLTF(scene, filename = 'room') {
    return new Promise((resolve, reject) => {
        const exporter = new GLTFExporter();
        exporter.parse(
            scene,
            (result) => {
                const json = JSON.stringify(result, null, 2);
                const blob = new Blob([json], { type: 'model/gltf+json' });
                triggerDownload(blob, `${filename}.gltf`);
                resolve();
            },
            (err) => reject(err),
            { binary: false, embedImages: true },
        );
    });
}

/**
 * Export a built scene as Wavefront OBJ + MTL and trigger downloads.
 * Note: OBJExporter is synchronous and does not embed textures from GLTF.
 */
export function exportAsOBJ(scene, filename = 'room') {
    const exporter = new OBJExporter();
    const obj      = exporter.parse(scene);
    const blob     = new Blob([obj], { type: 'text/plain' });
    triggerDownload(blob, `${filename}.obj`);
}

/* private */

function triggerDownload(blob, filename) {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
