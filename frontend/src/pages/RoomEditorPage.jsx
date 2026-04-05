import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Suspense } from 'react';
import api from '../utils/api';
import RoomCanvas from '../components/room/RoomCanvas';

/*─ Room type labels */
const ROOM_TYPE_LABELS = {
    living_room: 'Living Room', bedroom: 'Bedroom', kitchen: 'Kitchen',
    bathroom: 'Bathroom', office: 'Office', empty: 'Empty Room',
};

/*─ Furniture catalog (auto-loaded from ./furniture/)─ */
const furnitureModules = import.meta.glob('./furniture/*.{jpg,jpeg,png,webp}', { eager: true });
const FURNITURE_CATALOG = Object.entries(furnitureModules).map(([path, mod]) => {
    const filename = path.split('/').pop().replace(/\.[^.]+$/, '');
    const label = filename
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    return { furnitureId: filename, label, src: mod.default };
});

/*─ Icons─ */
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

/* RoomEditorPage*/
const RoomEditorPage = () => {
    const { id }       = useParams();
    const navigate     = useNavigate();

    const [room,    setRoom]    = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving,  setSaving]  = useState(false);
    const [saved,   setSaved]   = useState(false);
    const [panelOpen, setPanelOpen] = useState(true);

    /* view mode: '3d' | '2d' */
    const [viewMode,  setViewMode]  = useState('3d');

    /* panel tab: 'settings' | 'design' — design only available in 2D */
    const [panelTab,  setPanelTab]  = useState('settings');

    /* furniture placed on the floor */
    const [furnitureItems, setFurnitureItems] = useState([]);

    /* data */
    useEffect(() => { fetchRoom(); }, [id]);

    const fetchRoom = async () => {
        try {
            const { data } = await api.get(`/rooms/${id}`);
            setRoom(data.room);
        } catch {
            navigate('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    /* view mode switch */
    const switchViewMode = (mode) => {
        setViewMode(mode);
        if (mode === '3d') setPanelTab('settings'); // reset to settings in 3D
    };

    /* room property handlers */
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
            await api.put(`/rooms/${id}`, room);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch {
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };

    /* furniture handlers */
    const addFurniture = (catalogItem) => {
        setFurnitureItems((prev) => [
            ...prev,
            {
                instanceId:  `${catalogItem.furnitureId}_${Date.now()}`,
                furnitureId: catalogItem.furnitureId,
                label:       catalogItem.label,
                src:         catalogItem.src,
                x: 0,
                z: 0,
            },
        ]);
    };

    const handleFurnitureMove = useCallback((instanceId, x, z) => {
        setFurnitureItems((prev) =>
            prev.map((f) => (f.instanceId === instanceId ? { ...f, x, z } : f))
        );
    }, []);

    /* loading state */
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

    /*  */
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
                            title="2D Doorway View — for editing"
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
                            title="3D View — orbit freely"
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
                        disabled={saving}
                        className={`px-4 py-2 rounded-lg font-body text-sm font-medium transition-all flex items-center gap-2 ${
                            saved
                                ? 'bg-sage-500 text-white'
                                : 'bg-sand-400 hover:bg-sand-500 text-espresso-900'
                        }`}
                    >
                        {saving ? (
                            <><div className="w-3.5 h-3.5 border-2 border-espresso-900 border-t-transparent rounded-full animate-spin" /> Saving</>
                        ) : saved ? (
                            <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved</>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
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
                                <p className="font-body text-sand-400 text-xs tracking-widest uppercase">Rendering Room</p>
                            </div>
                        </div>
                    }>
                        <RoomCanvas
                            room={room}
                            viewMode={viewMode}
                            furnitureItems={furnitureItems}
                            onFurnitureMove={handleFurnitureMove}
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
                                Drag to orbit · Scroll to zoom · Right-click to pan
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

                            {/* Design tab — only in 2D editing mode */}
                            {viewMode === '2d' && (
                                <button
                                    onClick={() => setPanelTab('design')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-body font-medium transition-all border-b-2 ${
                                        panelTab === 'design'
                                            ? 'border-sand-400 text-cream-50'
                                            : 'border-transparent text-sand-400 hover:text-sand-200'
                                    }`}
                                >
                                    <IconDesign />
                                    Design
                                </button>
                            )}
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
                                                { key: 'wallColor',    label: 'Walls'   },
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

                                    {/* Wall Presets */}
                                    <div>
                                        <label className="block font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                            Wall Presets
                                        </label>
                                        <div className="grid grid-cols-5 gap-2">
                                            {['#F5F0EB','#E8DDD0','#D4E8D4','#D0D8E8','#E8D0D0','#F0E8D4','#2C2C2C','#FFFFFF','#FFF8DC','#E0E8E4'].map((color) => (
                                                <button
                                                    key={color}
                                                    onClick={() => handleUpdate('wallColor', color)}
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

                            {/* ════ DESIGN TAB (2D only) ════ */}
                            {panelTab === 'design' && viewMode === '2d' && (
                                <div className="p-5 space-y-5">

                                    <div>
                                        <p className="font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-1">
                                            Furniture
                                        </p>
                                        <p className="font-body text-xs text-sand-400 mb-4">
                                            Click an item to place it on the floor. Drag to reposition.
                                        </p>

                                        <div className="grid grid-cols-2 gap-3">
                                            {FURNITURE_CATALOG.map((item) => (
                                                <button
                                                    key={item.furnitureId}
                                                    onClick={() => addFurniture(item)}
                                                    title={`Add ${item.label}`}
                                                    className="group flex flex-col items-center gap-2 bg-espresso-900 hover:bg-espresso-700 border border-espresso-700 hover:border-sand-400 rounded-xl p-3 transition-all"
                                                >
                                                    <div className="w-full aspect-square rounded-lg overflow-hidden bg-espresso-800">
                                                        <img
                                                            src={item.src}
                                                            alt={item.label}
                                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                                        />
                                                    </div>
                                                    <span className="font-body text-xs text-sand-300 group-hover:text-cream-50 transition-colors text-center">
                                                        {item.label}
                                                    </span>
                                                    {/* Add badge */}
                                                    <span className="text-xs font-body text-sand-400 group-hover:text-sand-200 transition-colors">
                                                        + Add
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Placed furniture list */}
                                    {furnitureItems.length > 0 && (
                                        <div>
                                            <p className="font-body text-xs font-medium text-sand-400 uppercase tracking-widest mb-3">
                                                Placed ({furnitureItems.length})
                                            </p>
                                            <div className="space-y-2">
                                                {furnitureItems.map((f) => (
                                                    <div
                                                        key={f.instanceId}
                                                        className="flex items-center justify-between bg-espresso-900 rounded-lg px-3 py-2"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <img
                                                                src={f.src}
                                                                alt={f.label}
                                                                className="w-8 h-8 object-contain rounded"
                                                            />
                                                            <span className="font-body text-xs text-sand-300">{f.label}</span>
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                setFurnitureItems((prev) =>
                                                                    prev.filter((item) => item.instanceId !== f.instanceId)
                                                                )
                                                            }
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