import { Link } from 'react-router-dom';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col">
            <header className="px-8 py-5 flex items-center justify-between border-b border-cream-200">
                <div className="flex items-center gap-3">
                    <img src="/logo.svg" alt="Logo" className="w-8 h-8" />
                    <span className="font-display text-espresso-900 text-xl font-semibold">Roomly</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link to="/login" className="btn-secondary text-sm px-4 py-2">Sign In</Link>
                    <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center px-8 text-center animate-fade-in">
                <p className="font-body text-espresso-400 text-sm tracking-widest uppercase mb-4">Interior Design Studio</p>
                <h1 className="font-display text-6xl md:text-7xl font-semibold text-espresso-900 leading-tight mb-6 max-w-3xl">
                    Design your space in three dimensions
                </h1>
                <p className="font-body text-espresso-300 text-lg max-w-xl mb-10">
                    Create, visualize, and refine your interior designs with a real-time 3D room builder. No expertise needed.
                </p>
                <Link to="/register" className="btn-primary text-base px-8 py-4">
                    Start Designing for Free →
                </Link>
            </main>

            <footer className="px-8 py-5 border-t border-cream-200 text-center">
                <p className="font-body text-xs text-espresso-400">Roomly | Sprint 1 | Foundation</p>
            </footer>
        </div>
    );
};

export default LandingPage;