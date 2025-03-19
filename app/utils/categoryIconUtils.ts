// utils/categoryIconUtils.ts

/**
 * Returns the appropriate Ionicons icon name based on the phrase context
 * @param context The phrase context category
 * @returns Ionicons icon name
 */
export const getCategoryIcon = (context: string): string => {
  const contextLower = context.toLowerCase();

  if (contextLower.includes("greeting")) return "hand-left-outline";
  if (contextLower.includes("food") || contextLower.includes("restaurant"))
    return "restaurant-outline";
  if (contextLower.includes("direction") || contextLower.includes("location"))
    return "navigate-outline";
  if (contextLower.includes("shopping")) return "cart-outline";
  if (contextLower.includes("emergency")) return "medkit-outline";
  if (contextLower.includes("transportation")) return "car-outline";

  return "chatbubble-outline";
};
