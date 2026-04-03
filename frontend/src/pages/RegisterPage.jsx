import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            return setError('Passwords do not match.');
        }
        if (form.password.length < 6) {
            return setError('Password must be at least 6 characters.');
        }
        setLoading(true);
        try {
            await register(form.name, form.email, form.password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const strength = form.password.length === 0 ? 0 : form.password.length < 6 ? 1 : form.password.length < 10 ? 2 : 3;
    const strengthLabels = ['', 'Weak', 'Good', 'Strong'];
    const strengthColors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-sage-500'];

    return (
        <div className="min-h-screen bg-cream-50 flex">
            {/* Left Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-espresso-800 flex-col justify-between p-12 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-1/4 right-0 w-80 h-80 rounded-full bg-sand-300 blur-3xl translate-x-1/2" />
                    <div className="absolute bottom-1/4 left-0 w-80 h-80 rounded-full bg-sage-400 blur-3xl -translate-x-1/2" />
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-8 h-8 bg-sand-300 rounded-sm rotate-12" />
                    <span className="font-display text-cream-50 text-xl font-semibold tracking-wide">Spacify</span>
                </div>
                <div className="relative z-10 space-y-6">
                    <h2 className="font-display text-cream-50 text-3xl font-medium leading-relaxed">
                        Transform any space into your dream interior
                    </h2>
                    <ul className="space-y-3">
                        {['Create photorealistic 3D room layouts', 'Experiment with colors and materials', 'Save and share your designs'].map((feat) => (
                            <li key={feat} className="flex items-center gap-3 font-body text-cream-200 text-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-sand-300 flex-shrink-0" />
                                {feat}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="relative z-10">
                    <p className="font-body text-sand-400 text-xs tracking-widest uppercase">Sprint 1 — Foundation</p>
                </div>
            </div>

            {/* Right Panel — Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="flex items-center gap-3 mb-10 lg:hidden">
                        <div className="w-7 h-7 bg-espresso-800 rounded-sm rotate-12" />
                        <span className="font-display text-espresso-800 text-xl font-semibold">Spacify</span>
                    </div>

                    <div className="mb-8">
                        <h1 className="font-display text-4xl font-semibold text-espresso-900 mb-2">Create account</h1>
                        <p className="font-body text-sand-400">Start designing beautiful spaces today.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Full name</label>
                            <input
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className="input-field"
                                required
                                minLength={2}
                            />
                        </div>

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
                            />
                        </div>

                        <div>
                            <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Min. 6 characters"
                                className="input-field"
                                required
                            />
                            {form.password && (
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex gap-1 flex-1">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColors[strength] : 'bg-cream-200'}`} />
                                        ))}
                                    </div>
                                    <span className="font-body text-xs text-sand-400">{strengthLabels[strength]}</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block font-body text-sm font-medium text-espresso-700 mb-2">Confirm password</label>
                            <input
                                type="password"
                                name="confirm"
                                value={form.confirm}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="input-field"
                                required
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
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center font-body text-sm text-sand-400">
                        Already have an account?{' '}
                        <Link to="/login" className="text-espresso-800 font-medium hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;