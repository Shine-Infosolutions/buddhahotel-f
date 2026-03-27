import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BedDouble, Tag, CalendarDays, Users, Receipt, UserCog, Hotel, LogOut } from 'lucide-react';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rooms', label: 'Rooms', icon: BedDouble },
  { to: '/room-categories', label: 'Room Categories', icon: Tag },
  { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  { to: '/guests', label: 'Guests', icon: Users },
  { to: '/billing', label: 'Billing', icon: Receipt },
  { to: '/staff', label: 'Staff', icon: UserCog },
];

export default function Sidebar() {
  const { logout, user } = useAuth();

  return (
    <aside className="w-64 h-screen sticky top-0 bg-gray-900 text-white flex flex-col overflow-y-auto">
      <div className="p-6 border-b border-gray-700 flex items-center gap-3">
        <Hotel size={22} className="text-yellow-400" />
        <div>
          <h1 className="text-base font-bold text-yellow-400">Budha Hotel</h1>
          <p className="text-xs text-gray-400">{user?.name}</p>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-yellow-500 text-gray-900 font-semibold' : 'text-gray-300 hover:bg-gray-800'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={logout}
          className="w-full text-sm text-gray-400 hover:text-white py-2 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 px-4"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
