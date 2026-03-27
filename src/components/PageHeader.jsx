export default function PageHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
      {action && action}
    </div>
  );
}
