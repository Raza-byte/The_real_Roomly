import { useState } from 'react';
import api from '../../utils/api';

const ROOM_TYPES = [
    { value: 'living_room', label: 'Living Room', icon: '🛋️' },
    { value: 'bedroom', label: 'Bedroom', icon: '🛏️' },
    { value: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { value: 'bathroom', label: 'Bathroom', icon: '🚿' },
    { value: 'office', label: 'Office', icon: '💼' },
    { value: 'empty', label: 'Empty Room', icon: '⬜' },
];

const CreateRoomModal = ({ onClose, onCreated }) => {
    const [step, setStep] = useState(1); // 1: type, 2: dimensions/name
    const [form, setForm] = useState({
        name: '',
        type: '',
        dimensions: { width: 4, length: 5, height: 2.8 },
        wallColor: '#F5F0EB',
        floorColor: '#C8A882',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleTypeSelect = (type) => {
        setForm((f) => ({
            ...f,
            type,
            name: ROOM_TYPES.find((r) => r.value === type)?.label || '',
        }));
        setStep(2);
    };

    const handleDimChange = (key, val) => {
        setForm((f) => ({ ...f, dimensions: { ...f.dimensions, [key]: parseFloat(val) || 0 } }));
        setError('');
    };

    const handleSubmit = async () => {
        if (!form.name.trim()) return setError('Please enter a room name.');
        const { width, length, height } = form.dimensions;
        if (width < 1 || width > 50) return setError('Width must be between 1 and 50 meters.');
        if (length < 1 || length > 50) return setError('Length must be between 1 and 50 meters.');
        if (height < 2 || height > 10) return setError('Height must be between 2 and 10 meters.');

        setLoading(true);
        try {
            const { data } = await api.post('/rooms', form);
            onCreated(data.room);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create room.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-espresso-900/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-cream-200">
                    <div>
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="text-sand-400 hover:text-espresso-800 mb-1 flex items-center gap-1 font-body text-xs">
                                ← Back
                            </button>
                        )}
                        <h2 className="font-display text-2xl font-semibold text-espresso-900">
                            {step === 1 ? 'Choose Room Type' : 'Room Dimensions'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cream-100 flex items-center justify-center text-sand-400 hover:text-espresso-800 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {step === 1 && (
                        <div className="grid grid-cols-3 gap-3 animate-fade-in">
                            {ROOM_TYPES.map((rt) => (
                                <button
                                    key={rt.value}
                                    onClick={() => handleTypeSelect(rt.value)}
                                    className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-cream-200 hover:border-sand-400 hover:bg-cream-50 transition-all group"
                                >
                                    <span className="text-2xl">{rt.icon}</span>
                                    <span className="font-body text-xs font-medium text-espresso-800 text-center">{rt.label}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-5 animate-fade-in">
                            <div>
                                <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Room Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    className="input-field"
                                    placeholder="e.g. Master Bedroom"
                                />
                            </div>

                            <div>
                                <label className="block font-body text-sm font-medium text-espresso-700 mb-3">Dimensions (meters)</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { key: 'width', label: 'Width', min: 1, max: 50, step: 0.5 },
                                        { key: 'length', label: 'Length', min: 1, max: 50, step: 0.5 },
                                        { key: 'height', label: 'Height', min: 2, max: 10, step: 0.1 },
                                    ].map(({ key, label, min, max, step }) => (
                                        <div key={key}>
                                            <label className="block font-body text-xs text-sand-400 mb-1">{label}</label>
                                            <input
                                                type="number"
                                                value={form.dimensions[key]}
                                                onChange={(e) => handleDimChange(key, e.target.value)}
                                                min={min}
                                                max={max}
                                                step={step}
                                                className="input-field text-center font-mono"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Visual preview */}
                                <div className="mt-4 flex items-center justify-center">
                                    <div className="relative bg-cream-100 border-2 border-dashed border-sand-300 flex items-center justify-center"
                                        style={{
                                            width: `${Math.min(Math.max(form.dimensions.width * 20, 80), 200)}px`,
                                            height: `${Math.min(Math.max(form.dimensions.length * 20, 60), 150)}px`,
                                        }}
                                    >
                                        <span className="font-mono text-xs text-sand-400">
                                            {form.dimensions.width} × {form.dimensions.length}m
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Wall Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={form.wallColor} onChange={(e) => setForm((f) => ({ ...f, wallColor: e.target.value }))}
                                            className="w-10 h-10 rounded-lg border border-cream-200 cursor-pointer p-0.5" />
                                        <span className="font-mono text-xs text-sand-400">{form.wallColor}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Floor Color</label>
                                    <div className="flex items-center gap-3">
                                        <input type="color" value={form.floorColor} onChange={(e) => setForm((f) => ({ ...f, floorColor: e.target.value }))}
                                            className="w-10 h-10 rounded-lg border border-cream-200 cursor-pointer p-0.5" />
                                        <span className="font-mono text-xs text-sand-400">{form.floorColor}</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-body text-sm">
                                    {error}
                                </div>
                            )}

                            <button onClick={handleSubmit} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-cream-50 border-t-transparent rounded-full animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Room & Open in 3D →'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateRoomModal;