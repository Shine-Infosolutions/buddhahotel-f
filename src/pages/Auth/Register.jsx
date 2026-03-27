import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/Input';
import Button from '../../components/Button';
import Select from '../../components/Select';
import { Hotel } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-1">
          <Hotel size={22} className="text-yellow-500" />
          <h1 className="text-2xl font-bold text-gray-800">Budha Hotel</h1>
        </div>
        <p className="text-gray-500 text-sm mb-6">Create a new account</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={[{ value: 'admin', label: 'Admin' }, { value: 'staff', label: 'Staff' }]} />
          <Button type="submit" disabled={loading} className="w-full justify-center">
            {loading ? 'Creating...' : 'Register'}
          </Button>
        </form>
        <p className="text-sm text-center text-gray-500 mt-4">
          Already have an account? <Link to="/login" className="text-yellow-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
