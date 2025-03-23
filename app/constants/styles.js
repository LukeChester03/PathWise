// constants/styles.js
import { StyleSheet } from "react-native";
import { Colors } from "./colours";

// Common styles shared across components
export const CommonStyles = StyleSheet.create({
  // Section container with consistent spacing
  sectionContainer: {
    marginVertical: 10,
    width: "100%",
  },

  // Section header with consistent styling
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },

  // Section title with standardized typography
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text || "#333",
    marginLeft: 8,
  },

  // Card container style
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Standard content padding
  contentPadding: {
    paddingHorizontal: 12,
  },

  // Consistent spacing between components
  componentGap: {
    gap: 16,
  },
});

export default CommonStyles;
