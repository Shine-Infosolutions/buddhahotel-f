export default function Badge({ status }) {
  const map = {
    available: 'bg-green-100 text-green-700',
    occupied: 'bg-red-100 text-red-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    booked: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-blue-100 text-blue-700',
    checked_in: 'bg-green-100 text-green-700',
    checked_out: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    partial: 'bg-orange-100 text-orange-700',
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${map[status] || 'bg-gray-100 text-gray-600'}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}
