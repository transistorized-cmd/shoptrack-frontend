export const getStatusBadgeClass = (status: string): string => {
  const classes: { [key: string]: string } = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
    trial: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
    expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    free: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    // Add other statuses if needed
  };
  return classes[status] || classes.free;
};

export const getUsageBarClass = (usage: number, limit: number): string => {
  if (limit <= 0) return 'bg-green-500';
  const percentage = (usage / limit) * 100;
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
};

export const getErrorTypeClass = (type: string): string => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  switch (type) {
    case 'Async Error':
      return `${baseClasses} bg-orange-100 text-orange-800`;
    case 'Component Error':
      return `${baseClasses} bg-red-100 text-red-800`;
    case 'Network Error':
      return `${baseClasses} bg-blue-100 text-blue-800`;
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

export const getNotificationClasses = (type: string) => {
  const classes = {
    success: "border-l-4 border-green-500",
    error: "border-l-4 border-red-500",
    warning: "border-l-4 border-yellow-500",
    info: "border-l-4 border-blue-500",
  };
  return classes[type as keyof typeof classes] || classes.info;
};

export const getIconClasses = (type: string) => {
  const classes = {
    success: "text-green-400",
    error: "text-red-400",
    warning: "text-yellow-400",
    info: "text-blue-400",
  };
  return classes[type as keyof typeof classes] || classes.info;
};

export const getNotificationIcon = (type: string) => {
  // Return SVG components as strings since we're using inline SVG
  const icons = {
    success: "svg",
    error: "svg",
    warning: "svg",
    info: "svg",
  };
  return icons[type as keyof typeof icons] || icons.info;
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "processing":
      return "bg-blue-100 text-blue-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export const capitalizeFirst = (str: string) => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const calculatePercentageChange = (
  priceHistory: any[],
  currentIndex: number,
) => {
  if (currentIndex === 0) {
    return null; // First entry has no previous day to compare to
  }

  const previousPrice = priceHistory[currentIndex - 1].averagePrice;
  const currentPrice = priceHistory[currentIndex].averagePrice;

  if (!previousPrice || previousPrice === 0) return 0;

  return ((currentPrice - previousPrice) / previousPrice) * 100;
};

export const formatPercentageChange = (percentage: number | null) => {
  if (percentage === null) return "-"; // Only for the first entry
  if (percentage === 0) return "0.0%";
  const sign = percentage > 0 ? "+" : "";
  return `${sign}${percentage.toFixed(1)}%`;
};

export const getPriceChangeClass = (percentage: number | null) => {
  if (percentage === null || percentage === 0) return "text-gray-500 dark:text-gray-400";
  return percentage > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400";
};