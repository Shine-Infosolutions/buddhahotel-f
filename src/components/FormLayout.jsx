import { Outlet, useNavigate } from 'react-router-dom';

export default function FormLayout() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-800 transition-colors text-sm flex items-center gap-1">
          ← Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="text-sm font-semibold text-gray-700">🏨 Budha Hotel</span>
      </header>
      <main className="p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
