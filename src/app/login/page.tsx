import LoginForm from '../components/LoginForm';

export default function LoginPage() {
    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-transparent px-6">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                    className="absolute left-[-7rem] top-[-6rem] h-80 w-80 rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(circle, var(--bg-radial-a) 0%, transparent 72%)' }}
                />
                <div
                    className="absolute right-[-5rem] top-16 h-72 w-72 rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(circle, var(--bg-radial-b) 0%, transparent 72%)' }}
                />
                <div
                    className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full blur-3xl"
                    style={{ background: 'radial-gradient(circle, var(--bg-overlay-b) 0%, transparent 72%)' }}
                />
            </div>
            <LoginForm />
        </div>
    );
}
