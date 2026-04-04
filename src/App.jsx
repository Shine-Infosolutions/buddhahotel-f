import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import RoomCategories from './pages/RoomCategories/RoomCategories';
import Rooms from './pages/Rooms/Rooms';
import RoomStatus from './pages/Rooms/RoomStatus';
import Guests from './pages/Guests/Guests';
import Bookings from './pages/Bookings/Bookings';
import AddBookingForm from './pages/Bookings/AddBookingForm';
import EditBookingForm from './pages/Bookings/EditBookingForm';
import Billing from './pages/Billing/Billing';
import Staff from './pages/Staff/Staff';
import InvoicePage from './pages/Bookings/InvoicePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/room-status" element={<RoomStatus />} />
              <Route path="/room-categories" element={<RoomCategories />} />
              <Route path="/guests" element={<Guests />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/add" element={<AddBookingForm />} />
              <Route path="/bookings/edit/:id" element={<EditBookingForm />} />
              <Route path="/invoice" element={<InvoicePage />} />
              <Route path="/billing" element={<Billing />} />
              <Route path="/staff" element={<Staff />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
