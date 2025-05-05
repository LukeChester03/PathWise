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
    backgroundColor: "#EDF1F6",
    overflow: "hidden",
    opacity: 0.5,
  },
  mapShimmer: {
    width: width * 0.4,
    height: width * 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    transform: [{ rotate: "45deg" }],
  },
  compassContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
    opacity: 0,
    display: "none",
  },
  contentContainer: {
    alignItems: "center",
    zIndex: 10,
    marginTop: -20,
  },
  pinContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
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
    width: 20,
    height: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 1,
  },
  pulseCircle: {
    position: "absolute",
    width: 0,
    height: 0,
    borderRadius: 30,
    backgroundColor: Colors.primary + "15",
    zIndex: 2,
  },
  messageContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  messageText: {
    fontSize: 17,
    fontWeight: "500",
    color: "#404040",
    marginBottom: 12,
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 26,
    overflow: "hidden",
  },
  findingText: {
    fontSize: 15,
    color: NeutralColors.gray400,
  },
  highlightWord: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    height: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary + "90",
    marginHorizontal: 4,
  },
});
