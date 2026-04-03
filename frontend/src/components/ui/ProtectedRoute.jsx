import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-cream-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-sand-400 border-t-transparent rounded-full animate-spin" />
                    <p className="font-body text-sand-400 text-sm tracking-widest uppercase">Loading</p>
                </div>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;