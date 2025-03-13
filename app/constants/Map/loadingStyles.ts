import { StyleSheet, Dimensions } from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";

const { width } = Dimensions.get("window");

export const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  mapBackgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  mapGraphic: {
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: "#EDF1F6", // Lighter background color
    overflow: "hidden",
    opacity: 0.5, // Reduced opacity
  },
  mapShimmer: {
    width: width * 0.4, // Thinner shimmer
    height: width * 2,
    backgroundColor: "rgba(255,255,255,0.35)", // More subtle shimmer
    transform: [{ rotate: "45deg" }],
  },
  compassContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
    opacity: 0, // Completely hidden compass
    display: "none", // Removing from layout entirely
  },
  contentContainer: {
    alignItems: "center",
    zIndex: 10,
    marginTop: -20, // Adjust vertical positioning
  },
  pinContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30, // More space between pin and text
    height: 90,
  },
  pin: {
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  pinShadow: {
    position: "absolute",
    bottom: 0,
    width: 20, // Smaller shadow
    height: 4, // Thinner shadow
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)", // More subtle shadow
    zIndex: 1,
  },
  pulseCircle: {
    position: "absolute",
    width: 60, // Smaller pulse circle
    height: 60, // Smaller pulse circle
    borderRadius: 30,
    backgroundColor: Colors.primary + "15", // More transparent pulse
    zIndex: 2,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 40, // More space between message and dots
  },
  messageText: {
    fontSize: 17,
    fontWeight: "500", // Lighter font weight
    color: "#404040", // Slightly darker for better contrast
    marginBottom: 12, // More space between title and subtitle
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 26, // Taller to accommodate text
    overflow: "hidden",
  },
  findingText: {
    fontSize: 15, // Slightly smaller text
    color: NeutralColors.gray400, // Lighter gray
  },
  highlightWord: {
    fontSize: 15, // Match findingText size
    fontWeight: "600", // Less bold
    color: Colors.primary,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    height: 16, // Smaller height
  },
  dot: {
    width: 8, // Smaller dots
    height: 8, // Smaller dots
    borderRadius: 4,
    backgroundColor: Colors.primary + "90",
    marginHorizontal: 4,
  },
});
