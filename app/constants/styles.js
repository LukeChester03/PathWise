import { StyleSheet } from "react-native";
import { Colors } from "./colours";

export const CommonStyles = StyleSheet.create({
  sectionContainer: {
    marginVertical: 10,
    width: "100%",
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 4,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text || "#333",
    marginLeft: 8,
  },

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

  contentPadding: {
    paddingHorizontal: 12,
  },

  componentGap: {
    gap: 16,
  },
});

export default CommonStyles;
