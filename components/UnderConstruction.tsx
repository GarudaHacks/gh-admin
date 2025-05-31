interface UnderConstructionProps {
  feature?: string;
  description?: string;
}

export default function UnderConstruction({
  feature = "This feature",
  description = "We're working hard to bring you this feature. Check back soon for updates!",
}: UnderConstructionProps) {
  return (
    <div className="card p-8 text-center">
      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <svg
            className="w-24 h-24 text-yellow-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M12.293 2.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l8-8zm-1.414 1.414L3.414 11.172l2.829 2.829 7.464-7.465-2.828-2.828z"
              clipRule="evenodd"
            />
          </svg>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 max-w-md">
          <h3 className="text-xl font-semibold text-white">
            {feature} is Under Construction
          </h3>
          <p className="text-white/70 text-sm leading-relaxed">{description}</p>
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-500/50">
          <svg
            className="w-4 h-4 text-yellow-500 mr-2"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-yellow-500 text-sm font-medium">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
