import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, BedDouble, CalendarDays, Users, Receipt, UserCog, LogOut, Leaf, ChevronDown, ChevronRight, Tag, BarChart2 } from 'lucide-react';

export default function Sidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();
  const isRoomSection = location.pathname.startsWith('/rooms') || location.pathname.startsWith('/room-categories');
  const [roomOpen, setRoomOpen] = useState(isRoomSection);

  const navCls = (active) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${active ? 'font-semibold text-[#3d2e10]' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`;
  const activeStyle = { backgroundColor: '#C9A84C' };

  return (
    <aside className="w-56 h-screen sticky top-0 flex flex-col overflow-y-auto" style={{ backgroundColor: '#1a2235' }}>
      {/* Logo */}
      <div className="px-5 py-5 flex flex-col items-center border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Leaf size={28} className="text-green-400" />
          <span className="text-white font-bold text-lg leading-tight">Tulsi Resort</span>
        </div>
        <span className="text-[#C9A84C] text-xs font-semibold tracking-widest uppercase mt-1">
          {user?.name || 'Admin'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">

        {/* Dashboard */}
        <NavLink to="/" end
          className={({ isActive }) => navCls(isActive)}
          style={({ isActive }) => isActive ? activeStyle : {}}>
          <LayoutDashboard size={16} />
          Dashboard
        </NavLink>

        {/* Booking */}
        <NavLink to="/bookings"
          className={({ isActive }) => navCls(isActive)}
          style={({ isActive }) => isActive ? activeStyle : {}}>
          <CalendarDays size={16} />
          Booking
        </NavLink>

        {/* Room Management — expandable */}
        <div>
          <button
            onClick={() => setRoomOpen((o) => !o)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${isRoomSection ? 'text-[#C9A84C] font-semibold' : 'text-gray-300 hover:bg-white/10 hover:text-white'}`}>
            <span className="flex items-center gap-3">
              <BedDouble size={16} />
              Room Management
            </span>
            {roomOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {roomOpen && (
            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
              <NavLink to="/rooms"
                className={({ isActive }) => navCls(isActive)}
                style={({ isActive }) => isActive ? activeStyle : {}}>
                <BedDouble size={14} />
                Room List
              </NavLink>
              <NavLink to="/room-categories"
                className={({ isActive }) => navCls(isActive)}
                style={({ isActive }) => isActive ? activeStyle : {}}>
                <Tag size={14} />
                Room Categories
              </NavLink>
              <NavLink to="/room-status"
                className={({ isActive }) => navCls(isActive)}
                style={({ isActive }) => isActive ? activeStyle : {}}>
                <BarChart2 size={14} />
                Room Status
              </NavLink>
            </div>
          )}
        </div>

        {/* Guests */}
        <NavLink to="/guests"
          className={({ isActive }) => navCls(isActive)}
          style={({ isActive }) => isActive ? activeStyle : {}}>
          <Users size={16} />
          Guests
        </NavLink>

        {/* Billing */}
        <NavLink to="/billing"
          className={({ isActive }) => navCls(isActive)}
          style={({ isActive }) => isActive ? activeStyle : {}}>
          <Receipt size={16} />
          Billing
        </NavLink>

        {/* Staff */}
        <NavLink to="/staff"
          className={({ isActive }) => navCls(isActive)}
          style={({ isActive }) => isActive ? activeStyle : {}}>
          <UserCog size={16} />
          Staff
        </NavLink>

      </nav>

      {/* Logout */}
      <div className="px-3 pb-5 border-t border-white/10 pt-3">
        <button onClick={logout}
          className="w-full text-sm text-gray-400 hover:text-white py-2.5 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-3 px-4">
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}
