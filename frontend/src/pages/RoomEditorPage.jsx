import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import api from '../utils/api';
import RoomCanvas from '../components/room/RoomCanvas';
import { buildExportScene, exportAsGLB, exportAsGLTF, exportAsOBJ } from '../utils/exportRoom3D';

/* Room type labels */
const ROOM_TYPE_LABELS = {
    living_room: 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen',
    bathroom: 'Bathroom', office: 'Office', empty: 'Empty Room',
};

/* 3D Model Catalog (served from /public/models/) */
const FURNITURE_CATALOG = [
    {
        furnitureId: 'sofa',
        label:       'Sofa',
        icon:        '🛋️',
        modelPath:   '/models/sofa/scene.gltf',
    },
    {
        furnitureId: 'modern_accent_chair',
        label:       'Accent Chair',
        icon:        '🪑',
        modelPath:   '/models/modern_accent_chair_3d_showcase/scene.gltf',
    },
    {
        furnitureId: 'wooden_cabinet',
        label:       'Wooden Cabinet',
        icon:        '🗄️',
        modelPath:   '/models/wooden_cabinet/scene.gltf',
    },
    {
        furnitureId: 'wardrobe',
        label:       'Wardrobe',
        icon:        '👔',
        modelPath:   '/models/low-poly_psx_style_wardrobe_with_clothes/scene.gltf',
    },
    {
        furnitureId: 'door',
        label:       'Interior Door',
        icon:        '🚪',
        modelPath:   '/models/low-poly_psx_style_wooden_interior_doors_pack/scene.gltf',
    },
    {
        furnitureId: 'chandelier',
        label:       'Chandelier',
        icon:        '💡',
        modelPath:   '/models/chandelier/scene.gltf',
    },
    {
        furnitureId: 'chandelier2',
        label:       'Chandelier Classic',
        icon:        '🕯️',
        modelPath:   '/models/chandelier(1)/scene.gltf',
    },
];

/* Icons */
const IconSettings = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
);
const IconDesign = () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

/* Slider with label */
const LabeledSlider = ({ label, value, min, max, step, unit = '', onChange }) => (
    <div>
        <div className="flex justify-between items-center mb-1.5">
            <span className="font-body text-xs text-sand-300">{label}</span>
            <span className="font-mono text-xs text-sand-400">{typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(2)) : value}{unit}</span>
        </div>
        <input
            type="range"
            min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            className="w-full accent-sand-400"
        />
    </div>
);

/* RoomEditorPage */
const RoomEditorPage = () => {
    const { id }   = useParams();
    const navigate = useNavigate();

    const [room,      setRoom]      = useState(null);
    const [loading,   setLoading]   = useState(true);
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);

    /* view mode: '3d' | '2d' */
    const [viewMode, setViewMode] = useState('3d');

    /* panel tab: 'settings' | 'design' */
    const [panelTab, setPanelTab] = useState('settings');

    /* furniture state — each item: { instanceId, furnitureId, label, icon, modelPath, x, z, scale, rotationY } */
    const [furnitureItems, setFurnitureItems] = useState([]);

    /* selected furniture instance */
    const [selectedId, setSelectedId] = useState(null);

    const selectedItem = furnitureItems.find((f) => f.instanceId === selectedId) ?? null;

    /* 3-D export state */
    const [exportFormat,   setExportFormat]   = useState('glb');   // 'glb' | 'gltf' | 'obj'
    const [exporting,      setExporting]      = useState(false);
    const [exportProgress, setExportProgress] = useState(null);    // null | { loaded, total }
    const [exportError,    setExportError]    = useState(null);
    const [exportDropOpen, setExportDropOpen] = useState(false);
    const exportDropRef = useRef(null);

    /* Custom furniture file input ref */
    const customFurnitureInputRef = useRef(null);

    /* Close format dropdown when clicking outside */
    useEffect(() => {
        const handler = (e) => {
            if (exportDropRef.current && !exportDropRef.current.contains(e.target)) {
                setExportDropOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* Data */
    useEffect(() => { fetchRoom(); }, [id]);

    const fetchRoom = async () => {
        try {
            const { data } = await api.get(`/rooms/${id}`);
            setRoom(data.room);
            // Restore previously saved furniture layout
            if (Array.isArray(data.room.furnitureItems) && data.room.furnitureItems.length > 0) {
                setFurnitureItems(data.room.furnitureItems);
            }
        } catch {
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    /* View mode */
    const switchViewMode = (mode) => {
        setViewMode(mode);
    };

    /* Room property handlers */
    const handleUpdate = (field, value) => {
        setRoom((prev) => ({ ...prev, [field]: value }));
        setSaved(false);
    };

    const handleDimUpdate = (key, value) => {
        setRoom((prev) => ({
            ...prev,
            dimensions: { ...prev.dimensions, [key]: parseFloat(value) || prev.dimensions[key] },
        }));
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Combine room settings + current furniture layout into one payload
            await api.put(`/rooms/${id}`, { ...room, furnitureItems });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * Export the room as a 3-D file.
     * If the room has unsaved changes it is auto-saved first, then the
     * Three.js scene is built off-screen and downloaded in the chosen format.
     */
    const handleExport = async (fmt = exportFormat) => {
        setExportDropOpen(false);
        setExportError(null);

        // 1. Auto-save if needed
        if (!saved) {
            setSaving(true);
            try {
                await api.put(`/rooms/${id}`, { ...room, furnitureItems });
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            } catch {
                setSaving(false);
                setExportError('Save failed. Cannot export unsaved room.');
                return;
            }
            setSaving(false);
        }

        // 2. Build scene and export─
        setExporting(true);
        setExportProgress({ loaded: 0, total: furnitureItems.length || 1 });
        try {
            const scene = await buildExportScene(
                room,
                furnitureItems,
                (loaded, total) => setExportProgress({ loaded, total }),
            );
            const safeName = (room.name || 'room').replace(/[^a-z0-9_-]/gi, '_');
            if (fmt === 'gltf') {
                await exportAsGLTF(scene, safeName);
            } else if (fmt === 'obj') {
                exportAsOBJ(scene, safeName);
            } else {
                await exportAsGLB(scene, safeName);
            }
        } catch (err) {
            console.error('[Export3D]', err);
            setExportError('Export failed. See console for details.');
        } finally {
            setExporting(false);
            setExportProgress(null);
        }
    };

    /* Furniture handlers */
    const addFurniture = (catalogItem) => {
        const newItem = {
            instanceId:  `${catalogItem.furnitureId}_${Date.now()}`,
            furnitureId: catalogItem.furnitureId,
            label:       catalogItem.label,
            icon:        catalogItem.icon,
            modelPath:   catalogItem.modelPath,
            x:         0,
            z:         0,
            scale:     1.0,
            rotationY: 0,
            positionY: 0,   // vertical height offset from floor
        };
        setFurnitureItems((prev) => [...prev, newItem]);
        setSelectedId(newItem.instanceId);
        // Switch to design tab to reveal the controls immediately
        setPanelTab('design');
    };

    /* Custom Furniture Uploader */
    const handleCustomFurnitureUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const isObj = file.name.toLowerCase().endsWith('.obj');
        const format = isObj ? 'obj' : 'gltf';
        
        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target.result;
            const newItem = {
                instanceId:  `custom_${Date.now()}`,
                furnitureId: `custom_${file.name}`,
                label:       file.name.slice(0, 20) + (file.name.length > 20 ? '...' : ''),
                icon:        isObj ? '📦' : '✨',
                modelPath:   dataUrl,
                format:      format,
                x:         0,
                z:         0,
                scale:     1.0,
                rotationY: 0,
                positionY: 0,
            };
            setFurnitureItems((prev) => [...prev, newItem]);
            setSelectedId(newItem.instanceId);
            setPanelTab('design');
        };
        reader.readAsDataURL(file);

        // Reset input so the same file could be selected again
        e.target.value = '';
    };

    const handleFurnitureMove = useCallback((instanceId, x, z) => {
        setFurnitureItems((prev) =>
            prev.map((f) => (f.instanceId === instanceId ? { ...f, x, z } : f))
        );
    }, []);

    const handleFurnitureSelect = useCallback((instanceId) => {
        setSelectedId(instanceId);
    }, []);

    const handleScaleChange = (value) => {
        if (!selectedId) return;
        setFurnitureItems((prev) =>
            prev.map((f) => (f.instanceId === selectedId ? { ...f, scale: value } : f))
        );
    };

    const handleRotationChange = (value) => {
        if (!selectedId) return;
        setFurnitureItems((prev) =>
            prev.map((f) => (f.instanceId === selectedId ? { ...f, rotationY: (value * Math.PI) / 180 } : f))
        );
    };

    const handlePositionYChange = (value) => {
        if (!selectedId) return;
        setFurnitureItems((prev) =>
            prev.map((f) => (f.instanceId === selectedId ? { ...f, positionY: value } : f))
        );
    };

    /* Individual wall colour */
    const handleWallColorUpdate = (wall, color) => {
        setRoom((prev) => ({
            ...prev,
            wallColors: { ...(prev.wallColors || {}), [wall]: color },
        }));
        setSaved(false);
    };

    const removeFurniture = (instanceId) => {
        setFurnitureItems((prev) => prev.filter((f) => f.instanceId !== instanceId));
        if (selectedId === instanceId) setSelectedId(null);
    };

    /* Loading */
    if (loading) {
        return (
            <div className="min-h-screen bg-espresso-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-sand-400 border-t-transparent rounded-full animate-spin" />
                    <p className="font-body text-sand-400 text-sm tracking-widest uppercase">Loading Room</p>
                </div>
            </div>
        );
    }

    if (!room) return null;

    const selectedRotationDeg = selectedItem
        ? Math.round(((selectedItem.rotationY ?? 0) * 180) / Math.PI)
        : 0;

    / */
    return (
        <div className="h-screen bg-espresso-900 flex flex-col overflow-hidden">

            {/* Top Bar */}
            <header className="flex items-center justify-between px-5 py-3 bg-espresso-800 border-b border-espresso-700 z-30 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="flex items-center gap-2 text-sand-300 hover:text-cream-50 transition-colors font-body text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Dashboard
                    </button>
                    <div className="w-px h-4 bg-espresso-700" />
                    <div>
                        <h1 className="font-display text-cream-50 font-medium text-sm">{room.name}</h1>
                        <p className="font-mono text-sand-400 text-xs">
                            {room.dimensions.width}×{room.dimensions.length}×{room.dimensions.height}m
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Hide/Show Panel */}
                    <button
                        onClick={() => setPanelOpen((o) => !o)}
                        className="text-sand-300 hover:text-cream-50 transition-colors font-body text-xs flex items-center gap-1.5"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                        {panelOpen ? 'Hide' : 'Show'} Panel
                    </button>

                    {/* View Mode Toggle */}
                    <div className="flex items-center bg-espresso-900 rounded-lg p-0.5 border border-espresso-700">
                        <button
                            id="btn-view-2d"
                            onClick={() => switchViewMode('2d')}
                            title="2D Doorway View"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-body text-xs font-medium transition-all ${
                                viewMode === '2d'
                                    ? 'bg-sand-400 text-espresso-900 shadow-sm'
                                    : 'text-sand-400 hover:text-cream-50'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 21h18M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16M9 21v-4a2 2 0 012-2h2a2 2 0 012 2v4" />
                            </svg>
                            2D Edit
                        </button>
                        <button
                            id="btn-view-3d"
                            onClick={() => switchViewMode('3d')}
                            title="3D View"
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-body text-xs font-medium transition-all ${
                                viewMode === '3d'
                                    ? 'bg-sand-400 text-espresso-900 shadow-sm'
                                    : 'text-sand-400 hover:text-cream-50'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                            </svg>
                            3D View
                        </button>
                    </div>

                    {/* Save */}
                    <button
                        onClick={handleSave}
                        disabled={saving || exporting}
                        className={`px-4 py-2 rounded-lg font-body text-sm font-medium transition-all flex items-center gap-2 ${
                            saved
                                ? 'bg-sage-500 text-white'
                                : 'bg-sand-400 hover:bg-sand-500 text-espresso-900'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                        {saving ? (
                            <><div className="w-3.5 h-3.5 border-2 border-espresso-900 border-t-transparent rounded-full animate-spin" /> Saving</>
                        ) : saved ? (
                            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved</>
                        ) : (
                            'Save Changes'
                        )}
                    </button>

                    {/* Export 3D */}
                    <div className="relative" ref={exportDropRef}>
                        {/* Split button: [Export 3D] [▾] — same visual style as Save Changes */}
                        <div className="flex items-center rounded-lg overflow-hidden">
                            <button
                                id="btn-export-3d"
                                onClick={() => handleExport()}
                                disabled={exporting || saving}
                                title={`Export room as .${exportFormat.toUpperCase()}`}
                                className="flex items-center gap-2 px-4 py-2 bg-sand-400 hover:bg-sand-500 text-espresso-900 font-body text-sm font-medium transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {exporting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-espresso-900 border-t-transparent rounded-full animate-spin" />
                                        {exportProgress
                                            ? `${exportProgress.loaded}/${exportProgress.total} models…`
                                            : 'Exporting…'}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
                                        </svg>
                                        Export 3D <span className="opacity-60 text-xs font-normal">.{exportFormat}</span>
                                    </>
                                )}
                            </button>
                            {/* Format picker caret */}
                            <button
                                id="btn-export-format"
                                onClick={() => setExportDropOpen((o) => !o)}
                                disabled={exporting || saving}
                                title="Choose export format"
                                className="px-2 py-2 bg-sand-400 hover:bg-sand-500 text-espresso-900 transition-all border-l border-espresso-900/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <svg
                                    className={`w-4 h-5 transition-transform ${exportDropOpen ? 'rotate-180' : ''}`}
                                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                        </div>

                        {/* Format dropdown */}
                        {exportDropOpen && (
                            <div className="absolute right-0 top-full mt-1.5 w-52 bg-espresso-800 border border-espresso-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                <p className="px-3 pt-2.5 pb-1 font-body text-xs text-sand-400 uppercase tracking-widest">Export format</p>
                                {[
                                    { fmt: 'glb',  label: 'Binary GLTF (.glb)',  desc: 'Best — compact, full materials' },
                                    { fmt: 'gltf', label: 'JSON GLTF  (.gltf)',  desc: 'Text, compatible with most viewers' },
                                    { fmt: 'obj',  label: 'Wavefront  (.obj)',   desc: 'Universal, no textures' },
                                ].map(({ fmt, label, desc }) => (
                                    <button
                                        key={fmt}
                                        onClick={() => { setExportFormat(fmt); setExportDropOpen(false); }}
                                        className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 hover:bg-espresso-700 transition-colors ${
                                            exportFormat === fmt ? 'bg-espresso-700/60' : ''
                                        }`}
                                    >
                                        <span className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 flex items-center justify-center ${
                                            exportFormat === fmt ? 'border-sand-400' : 'border-espresso-600'
                                        }`}>
                                            {exportFormat === fmt && <span className="w-2 h-2 rounded-full bg-sand-400 block" />}
                                        </span>
                                        <span>
                                            <span className="block font-body text-xs font-medium text-cream-50">{label}</span>
                                            <span className="block font-body text-xs text-sand-400 mt-0.5">{desc}</span>
                                        </span>
                                    </button>
                                ))}
                                <div className="border-t border-espresso-700 px-3 py-2">
                                    <button
                                        onClick={() => handleExport(exportFormat)}
                                        disabled={exporting}
                                        className="w-full py-2 rounded-lg bg-sand-400 hover:bg-sand-500 text-espresso-900 font-body text-xs font-medium transition-all disabled:opacity-60"
                                    >
                                        Export as .{exportFormat}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Inline error toast */}
                        {exportError && (
                            <div className="absolute right-0 top-full mt-1.5 w-60 bg-espresso-900 border border-espresso-700 rounded-xl px-3 py-2.5 z-50 text-xs font-body text-sand-300 flex items-start gap-2">
                                <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{exportError}</span>
                                <button onClick={() => setExportError(null)} className="ml-auto text-sand-400 hover:text-cream-50 transition-colors">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">

                {/* Canvas */}
                <div className="flex-1 relative">
                    <Suspense fallback={
                        <div className="absolute inset-0 flex items-center justify-center bg-espresso-900">
                            <div className="text-center">
                                <div className="w-8 h-8 border-2 border-sand-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="font-body text-sand-400 text-xs tracking-widest uppercase">Loading Models</p>
                            </div>
                        </div>
                    }>
                        <RoomCanvas
                            room={room}
                            viewMode={viewMode}
                            furnitureItems={furnitureItems}
                            selectedId={selectedId}
                            onFurnitureMove={handleFurnitureMove}
                            onFurnitureSelect={handleFurnitureSelect}
                        />
                    </Suspense>

                    {/* Controls hint */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 glass rounded-full px-4 py-2 pointer-events-none">
                        {viewMode === '2d' ? (
                            <p className="font-body text-espresso-700 text-xs">
                                Doorway view · Drag left/right to rotate walls · Scroll to zoom
                            </p>
                        ) : (
                            <p className="font-body text-espresso-700 text-xs">
                                Drag to orbit · Scroll to zoom · Click furniture to select
                            </p>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                {panelOpen && (
                    <aside className="w-72 bg-espresso-800 border-l border-espresso-700 flex flex-col flex-shrink-0">

                        {/* Tab Header */}
                        <div className="flex border-b border-espresso-700 flex-shrink-0">
                            <button
                                onClick={() => setPanelTab('settings')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-body font-medium transition-all border-b-2 ${
                                    panelTab === 'settings'
                                        ? 'border-sand-400 text-cream-50'
                                        : 'border-transparent text-sand-400 hover:text-sand-200'
                                }`}
                            >
                                <IconSettings />
                                Room Settings
                            </button>

                            {/* Design tab — available in both modes */}
                            <button
                                onClick={() => setPanelTab('design')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-body font-medium transition-all border-b-2 ${
                                    panelTab === 'design'
                                        ? 'border-sand-400 text-cream-50'
                                        : 'border-transparent text-sand-400 hover:text-sand-200'
                                }`}
                            >
                                <IconDesign />
                                Furniture
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 overflow-y-auto">

                            {/* ════ SETTINGS TAB ════ */}
                            {panelTab === 'settings' && (
                                <div className="p-5 space-y-6">

                                    {/* Room Name */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-2">
                                            Room Name
                                        </label>
                                        <input
                                            type="text"
                                            value={room.name}
                                            onChange={(e) => handleUpdate('name', e.target.value)}
                                            className="w-full bg-espresso-900 border border-espresso-700 text-cream-50 placeholder-sand-400 px-3 py-2.5 rounded-lg font-body text-sm focus:outline-none focus:ring-1 focus:ring-sand-400"
                                        />
                                    </div>

                                    {/* Dimensions */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Dimensions (m)
                                        </label>
                                        <div className="space-y-2">
                                            {[
                                                { key: 'width',  label: 'Width',  min: 1,  max: 50, step: 0.5 },
                                                { key: 'length', label: 'Length', min: 1,  max: 50, step: 0.5 },
                                                { key: 'height', label: 'Height', min: 2,  max: 10, step: 0.1 },
                                            ].map(({ key, label, min, max, step }) => (
                                                <div key={key} className="flex items-center justify-between gap-3">
                                                    <span className="font-body text-sm text-sand-300 w-14">{label}</span>
                                                    <input
                                                        type="range"
                                                        min={min} max={max} step={step}
                                                        value={room.dimensions[key]}
                                                        onChange={(e) => handleDimUpdate(key, e.target.value)}
                                                        className="flex-1 accent-sand-400"
                                                    />
                                                    <span className="font-mono text-xs text-sand-300 w-8 text-right">
                                                        {room.dimensions[key]}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Colors */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Colors
                                        </label>
                                        <div className="space-y-3">
                                            {[
                                                { key: 'floorColor',   label: 'Floor'   },
                                                { key: 'ceilingColor', label: 'Ceiling' },
                                            ].map(({ key, label }) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="font-body text-sm text-sand-300">{label}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-xs text-sand-400">{room[key] || '#ffffff'}</span>
                                                        <input
                                                            type="color"
                                                            value={room[key] || '#ffffff'}
                                                            onChange={(e) => handleUpdate(key, e.target.value)}
                                                            className="w-8 h-8 rounded-md border border-espresso-700 cursor-pointer p-0.5 bg-transparent"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Individual Wall Colors */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-1">
                                            Wall Colors
                                        </label>
                                        <p className="font-body text-xs text-sand-500 mb-3">
                                            Set each wall independently, or use a preset below.
                                        </p>
                                        <div className="space-y-2.5">
                                            {[
                                                { wall: 'front', label: '⬆ Front Wall'  },
                                                { wall: 'back',  label: '⬇ Back Wall'   },
                                                { wall: 'left',  label: '⬅ Left Wall'   },
                                                { wall: 'right', label: '➡ Right Wall'  },
                                            ].map(({ wall, label }) => {
                                                const currentColor = (room.wallColors || {})[wall] || room.wallColor || '#F5F0EB';
                                                return (
                                                    <div key={wall} className="flex items-center justify-between">
                                                        <span className="font-body text-sm text-sand-300">{label}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs text-sand-400">{currentColor}</span>
                                                            <input
                                                                type="color"
                                                                value={currentColor}
                                                                onChange={(e) => handleWallColorUpdate(wall, e.target.value)}
                                                                className="w-8 h-8 rounded-md border border-espresso-700 cursor-pointer p-0.5 bg-transparent"
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Wall Presets — applies to all 4 walls at once */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-2">
                                            Wall Presets <span className="normal-case text-sand-500">(all walls)</span>
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#F5F0EB','#E8DDD0','#D4E8D4','#D0D8E8','#E8D0D0','#F0E8D4','#2C2C2C','#FFFFFF','#FFF8DC','#E0E8E4'].map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => {
                                                        handleUpdate('wallColor', color);
                                                        // also reset individual overrides so preset takes effect on all walls
                                                        setRoom((prev) => ({ ...prev, wallColors: {}, wallColor: color }));
                                                    }}
                                                    title={color}
                                                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${room.wallColor === color ? 'border-sand-400 scale-110' : 'border-espresso-700'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Floor Presets */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Floor Presets
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#C8A882','#8B6914','#D4C5A9','#5C4033','#A0907A','#E8E0D0','#2C2418','#B8A090','#6B4C3B','#D0B896'].map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => handleUpdate('floorColor', color)}
                                                    title={color}
                                                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${room.floorColor === color ? 'border-sand-400 scale-110' : 'border-espresso-700'}`}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Room Info */}
                                    <div className="bg-espresso-900 rounded-xl p-4 space-y-2">
                                        <p className="font-body text-xs text-sand-400 uppercase tracking-widest">Room Info</p>
                                        <div className="space-y-1">
                                            <div className="flex justify-between">
                                                <span className="font-body text-xs text-sand-400">Type</span>
                                                <span className="font-body text-xs text-cream-200">{ROOM_TYPE_LABELS[room.type]}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-body text-xs text-sand-400">Floor Area</span>
                                                <span className="font-mono text-xs text-cream-200">
                                                    {(room.dimensions.width * room.dimensions.length).toFixed(1)} m²
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-body text-xs text-sand-400">Volume</span>
                                                <span className="font-mono text-xs text-cream-200">
                                                    {(room.dimensions.width * room.dimensions.length * room.dimensions.height).toFixed(1)} m³
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ════ DESIGN / FURNITURE TAB ════ */}
                            {panelTab === 'design' && (
                                <div className="p-5 space-y-5">

                                    {/* Selected item controls */}
                                    {selectedItem ? (
                                        <div className="bg-espresso-900 rounded-xl p-4 space-y-4 border border-sand-400/20">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{selectedItem.icon}</span>
                                                    <div>
                                                        <p className="font-body text-xs font-semibold text-cream-50">{selectedItem.label}</p>
                                                        <p className="font-body text-xs text-sand-400">Selected</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFurniture(selectedItem.instanceId)}
                                                    className="text-sand-400 hover:text-red-400 transition-colors p-1 rounded"
                                                    title="Remove from room"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>

                                            <LabeledSlider
                                                label="Scale"
                                                value={selectedItem.scale ?? 1.0}
                                                min={0.2}
                                                max={4.0}
                                                step={0.05}
                                                onChange={handleScaleChange}
                                            />

                                            <LabeledSlider
                                                label="Rotation"
                                                value={selectedRotationDeg}
                                                min={0}
                                                max={360}
                                                step={5}
                                                unit="°"
                                                onChange={handleRotationChange}
                                            />

                                            {/* Height lift slider */}
                                            <LabeledSlider
                                                label="Height (lift)"
                                                value={selectedItem.positionY ?? 0}
                                                min={0}
                                                max={Math.max(0, room.dimensions.height - 0.2)}
                                                step={0.05}
                                                unit="m"
                                                onChange={handlePositionYChange}
                                            />

                                            {/* Quick rotate buttons */}
                                            <div className="flex gap-2">
                                                {[0, 90, 180, 270].map((deg) => (
                                                    <button
                                                        key={deg}
                                                        onClick={() => handleRotationChange(deg)}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-body transition-all ${
                                                            selectedRotationDeg === deg
                                                                ? 'bg-sand-400 text-espresso-900'
                                                                : 'bg-espresso-700 text-sand-300 hover:bg-espresso-600'
                                                        }`}
                                                    >
                                                        {deg}°
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => setSelectedId(null)}
                                                className="w-full py-1.5 rounded-lg text-xs font-body text-sand-400 hover:text-cream-50 border border-espresso-700 hover:border-sand-400 transition-all"
                                            >
                                                Deselect
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-espresso-900 rounded-xl p-4 text-center border border-dashed border-espresso-700">
                                            <p className="font-body text-xs text-sand-400">
                                                Click a piece in the 3D view to select it, or add one below.
                                            </p>
                                        </div>
                                    )}

                                    {/* Custom Furniture Upload */}
                                    <div>
                                        <p className="font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Custom Furniture
                                        </p>
                                        <input
                                            type="file"
                                            accept=".glb,.gltf,.obj"
                                            className="hidden"
                                            onChange={handleCustomFurnitureUpload}
                                            ref={customFurnitureInputRef}
                                        />
                                        <button
                                            onClick={() => customFurnitureInputRef.current?.click()}
                                            className="w-full group flex flex-col items-center justify-center gap-2 bg-espresso-900 hover:bg-espresso-700 border border-dashed border-espresso-600 hover:border-sand-400 rounded-xl p-4 transition-all"
                                        >
                                            <svg className="w-6 h-6 text-sand-400 group-hover:text-cream-50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="font-body text-xs text-sand-300 group-hover:text-cream-50 transition-colors text-center leading-tight">
                                                Upload 3D Model
                                            </span>
                                            <span className="text-[10px] font-body text-sand-500">
                                                .glb, .gltf, .obj
                                            </span>
                                        </button>
                                    </div>

                                    {/* Catalog */}
                                    <div>
                                        <p className="font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Template Furniture
                                        </p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {FURNITURE_CATALOG.map((item) => (
                                                <button
                                                    key={item.furnitureId}
                                                    onClick={() => addFurniture(item)}
                                                    title={`Add ${item.label}`}
                                                    className="group flex flex-col items-center gap-2 bg-espresso-900 hover:bg-espresso-700 border border-espresso-700 hover:border-sand-400 rounded-xl p-3 transition-all"
                                                >
                                                    <span className="text-3xl">{item.icon}</span>
                                                    <span className="font-body text-xs text-sand-300 group-hover:text-cream-50 transition-colors text-center leading-tight">
                                                        {item.label}
                                                    </span>
                                                    <span className="text-xs font-body text-sand-400 group-hover:text-sand-200 transition-colors">
                                                        + Place
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Placed items list */}
                                    {furnitureItems.length > 0 && (
                                        <div>
                                            <p className="font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                                In Room ({furnitureItems.length})
                                            </p>
                                            <div className="space-y-2">
                                                {furnitureItems.map((f) => (
                                                    <div
                                                        key={f.instanceId}
                                                        onClick={() => setSelectedId(f.instanceId)}
                                                        className={`flex items-center justify-between rounded-lg px-3 py-2 cursor-pointer transition-all ${
                                                            f.instanceId === selectedId
                                                                ? 'bg-sand-400/15 border border-sand-400/40'
                                                                : 'bg-espresso-900 border border-transparent hover:border-espresso-600'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-base">{f.icon}</span>
                                                            <div>
                                                                <span className="font-body text-xs text-sand-300 block">{f.label}</span>
                                                                <span className="font-mono text-xs text-sand-500">
                                                                    ×{(f.scale ?? 1).toFixed(1)} · {Math.round(((f.rotationY ?? 0) * 180) / Math.PI)}°
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); removeFurniture(f.instanceId); }}
                                                            className="text-sand-400 hover:text-red-400 transition-colors p-1"
                                                            title="Remove"
                                                        >
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
};

export default RoomEditorPage;