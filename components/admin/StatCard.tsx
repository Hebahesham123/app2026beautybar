"use client";

interface StatCardProps {
  label: string;
  value: number | string;
  type?: "primary" | "success" | "warning" | "error";
  icon?: React.ReactNode;
  trend?: { value: number; isIncrease: boolean };
}

export default function StatCard({
  label,
  value,
  type = "primary",
  icon,
  trend,
}: StatCardProps) {
  const bgColorMap = {
    primary: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200",
    error: "bg-red-50 border-red-200",
  };

  const textColorMap = {
    primary: "text-blue-900",
    success: "text-green-900",
    warning: "text-yellow-900",
    error: "text-red-900",
  };

  const labelColorMap = {
    primary: "text-blue-700",
    success: "text-green-700",
    warning: "text-yellow-700",
    error: "text-red-700",
  };

  return (
    <div className={`rounded-lg border p-6 ${bgColorMap[type]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${labelColorMap[type]}`}>{label}</p>
          <p className={`mt-2 text-3xl font-bold ${textColorMap[type]}`}>
            {value}
          </p>
          {trend && (
            <p className={`mt-2 text-sm ${trend.isIncrease ? "text-green-600" : "text-red-600"}`}>
              {trend.isIncrease ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
            </p>
          )}
        </div>
        {icon && <div className={`text-3xl ${textColorMap[type]}`}>{icon}</div>}
      </div>
    </div>
  );
}
