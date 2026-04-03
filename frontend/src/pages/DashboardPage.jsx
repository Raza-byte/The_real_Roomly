import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import CreateRoomModal from '../components/room/CreateRoomModal';

const ROOM_TYPE_LABELS = {
    living_room: 'Living Room',
    bedroom: 'Bedroom',
    kitchen: 'Kitchen',
    bathroom: 'Bathroom',
    office: 'Office',
    empty: 'Empty Room',
};

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        try {
            const { data } = await api.get('/rooms');
            setRooms(data.rooms);
        } catch (err) {
            console.error('Failed to fetch rooms', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRoomCreated = (room) => {
        setRooms((prev) => [room, ...prev]);
        setShowModal(false);
        navigate(`/room/${room._id}`);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this room?')) return;
        try {
            await api.delete(`/rooms/${id}`);
            setRooms((prev) => prev.filter((r) => r._id !== id));
        } catch (err) {
            alert('Failed to delete room.');
        }
    };

    return (
        <div className="min-h-screen bg-cream-50">
            {/* Navbar */}
            <header className="bg-white border-b border-cream-200 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-espresso-800 rounded-sm rotate-12" />
                        <span className="font-display text-espresso-900 text-xl font-semibold">Spacify</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="font-body text-sm font-medium text-espresso-800">{user?.name}</p>
                            <p className="font-body text-xs text-sand-400">{user?.email}</p>
                        </div>
                        <button onClick={logout} className="btn-secondary text-sm px-4 py-2">
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Header */}
                <div className="flex items-end justify-between mb-10">
                    <div>
                        <p className="font-body text-sand-400 text-sm tracking-widest uppercase mb-1">Your workspace</p>
                        <h1 className="font-display text-4xl font-semibold text-espresso-900">My Rooms</h1>
                    </div>
                    <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Room
                    </button>
                </div>

                {/* Room Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <div className="w-8 h-8 border-2 border-sand-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in">
                        <div className="w-24 h-24 bg-cream-200 rounded-2xl flex items-center justify-center mb-6">
                            <svg className="w-10 h-10 text-sand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <h3 className="font-display text-2xl font-medium text-espresso-800 mb-2">No rooms yet</h3>
                        <p className="font-body text-sand-400 mb-6">Create your first room to start designing.</p>
                        <button onClick={() => setShowModal(true)} className="btn-primary">
                            Create Your First Room
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {rooms.map((room, i) => (
                            <div
                                key={room._id}
                                onClick={() => navigate(`/room/${room._id}`)}
                                className="card cursor-pointer group animate-slide-up p-0 overflow-hidden"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                {/* Room preview color block */}
                                <div
                                    className="h-36 relative"
                                    style={{ backgroundColor: room.wallColor || '#F5F0EB' }}
                                >
                                    <div
                                        className="absolute bottom-0 left-0 right-0 h-10"
                                        style={{ backgroundColor: room.floorColor || '#C8A882' }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="font-body text-xs tracking-widest uppercase opacity-40 text-espresso-800">
                                            {room.dimensions.width}m × {room.dimensions.length}m
                                        </span>
                                    </div>
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => handleDelete(room._id, e)}
                                        className="absolute top-2 right-2 w-7 h-7 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                    >
                                        <svg className="w-3.5 h-3.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="p-4">
                                    <h3 className="font-display text-espresso-900 font-medium truncate mb-1">{room.name}</h3>
                                    <div className="flex items-center justify-between">
                                        <span className="font-body text-xs text-sand-400">{ROOM_TYPE_LABELS[room.type] || room.type}</span>
                                        <span className="font-mono text-xs text-sand-300">{room.dimensions.height}m ceiling</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {showModal && (
                <CreateRoomModal onClose={() => setShowModal(false)} onCreated={handleRoomCreated} />
            )}
        </div>
    );
};

export default DashboardPage;