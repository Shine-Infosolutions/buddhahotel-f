export default function PageHeader({ title, action }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <h2 className="text-xl md:text-2xl font-bold text-gray-800">{title}</h2>
      {action && action}
    </div>
  );
}
