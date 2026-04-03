import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Layout() {
  return (
    <div className="flex h-screen bg-[#FDF8EE]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
