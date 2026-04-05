import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-cream-50 flex">
            {/* Left Panel — Decorative */}
            <div className="hidden lg:flex lg:w-1/2 bg-espresso-800 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-96 h-96 rounded-full bg-sand-300 blur-3xl -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-sage-500 blur-3xl translate-x-1/2 translate-y-1/2" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-3">
                        <img src="/logo-dark.svg" alt="Logo" className="w-8 h-8" />
                        <span className="font-display text-cream-50 text-xl font-semibold tracking-wide">Roomly</span>
                    </div>
                </div>
                <div className="relative z-10">
                    <blockquote className="font-display text-cream-50 text-3xl font-medium leading-relaxed mb-6">
                        "Design is not just what it looks like. Design is how it works."
                    </blockquote>
                    <p className="font-body text-sand-300 text-sm tracking-widest uppercase">— Steve Jobs</p>
                </div>
                <div className="relative z-10 grid grid-cols-3 gap-3">
                    {['#F5F0EB', '#C8A882', '#8FAF8A', '#3D2B1F', '#527550', '#B8936A'].map((color) => (
                        <div key={color} className="h-12 rounded-lg" style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md animate-slide-up">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-3 mb-10 lg:hidden">
                        <div className="w-7 h-7 bg-espresso-800 rounded-sm rotate-12" />
                        <span className="font-display text-espresso-800 text-xl font-semibold">Roomly</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="font-display text-4xl font-semibold text-espresso-900 mb-2">Welcome back</h1>
                        <p className="font-body text-sand-400">Sign in to continue designing your spaces.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Email address</label>
                            <input
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="input-field"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div>
                            <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="input-field"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg font-body text-sm animate-fade-in">
                                {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-cream-50 border-t-transparent rounded-full animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center font-body text-sm text-sand-400">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-espresso-800 font-medium hover:underline">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;