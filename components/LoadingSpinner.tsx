interface LoadingSpinnerProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  center?: boolean;
}

export default function LoadingSpinner({
  text = "Loading...",
  size = "md",
  center = true,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const containerClasses = center
    ? "flex items-center justify-center py-12"
    : "flex items-center";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center space-y-4">
        <svg
          className={`animate-spin ${sizeClasses[size]} text-primary`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <div className={`${textSizeClasses[size]} text-white/70 font-medium`}>
          {text}
        </div>
      </div>
    </div>
  );
}
