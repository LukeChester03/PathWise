import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, NeutralColors } from "../../constants/colours";

const { width, height } = Dimensions.get("window");

const MapGettingStartedModal = ({ visible, onClose }) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  const renderStep = (icon, title, description, color = Colors.primary) => {
    return (
      <View style={styles.stepContainer}>
        <View style={[styles.stepIconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>{title}</Text>
          <Text style={styles.stepDescription}>{description}</Text>
        </View>
      </View>
    );
  };

  const renderTipItem = (title, icon, color = Colors.primary) => {
    return (
      <View style={styles.tipItem}>
        <View style={[styles.tipIconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.tipText}>{title}</Text>
      </View>
    );
  };

  return (
    <Modal animationType="none" transparent={true} visible={visible} onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.modalOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />

        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.headerIconContainer}>
              <Ionicons name="map-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Map Navigation Guide</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color={NeutralColors.gray500} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.introSection}>
                <Image
                  source={require("../../assets/world-map.jpg")}
                  style={styles.introImage}
                  resizeMode="contain"
                />
                <Text style={styles.introText}>
                  Explore nearby attractions, plan routes, and discover new places with our
                  interactive map features.
                </Text>
              </View>

              <View style={styles.stepsContainer}>
                {renderStep(
                  "locate-outline",
                  "Find Nearby Places",
                  "The map shows the 20 closest attractions to your current location. Tap on any marker to learn more about that place."
                )}

                {renderStep(
                  "navigate-outline",
                  "Plan Your Route",
                  'Tap "Directions" on any place card to see the best route to get there. You can choose between driving, walking, or public transit.',
                  "#4CAF50"
                )}

                {renderStep(
                  "filter-outline",
                  "Filter Places",
                  "Use the filter button to narrow down places by category, rating, or distance from your location.",
                  "#FF9800"
                )}

                {renderStep(
                  "bookmark-outline",
                  "Save for Later",
                  "Found something interesting? Tap the bookmark icon to save it to your favorites for easy access later.",
                  "#2196F3"
                )}
              </View>

              <View style={styles.mapTipsSection}>
                <Text style={styles.sectionTitle}>Map Navigation Tips</Text>
                <View style={styles.tipsList}>
                  {renderTipItem("Pinch to zoom in and out", "hand-left-outline")}
                  {renderTipItem("Double tap to zoom in", "scan-outline")}
                  {renderTipItem("Two-finger tap to zoom out", "expand-outline")}
                  {renderTipItem("Press and hold to drop a pin", "pin-outline", "#9C27B0")}
                  {renderTipItem("Swipe to pan the map", "arrow-up-outline", "#FF5722")}
                </View>
              </View>

              <View style={styles.exploreMoreSection}>
                <View style={styles.exploreMoreHeader}>
                  <Ionicons name="sparkles-outline" size={22} color={Colors.primary} />
                  <Text style={styles.exploreMoreTitle}>Discover Beyond the Map</Text>
                </View>
                <Text style={styles.exploreMoreText}>
                  Tap on any place to see photos, read reviews, check opening hours, and learn about
                  its history and significance. The more you explore, the more personalized
                  recommendations you'll receive!
                </Text>
              </View>
            </ScrollView>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.startButton} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.startButtonText}>Start Exploring</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  overlayTouchable: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: height * 0.7,
    maxHeight: height * 0.9,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  modalTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: NeutralColors.black,
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  introSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  introImage: {
    width: width * 0.6,
    height: width * 0.4,
    marginBottom: 16,
  },
  introText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: NeutralColors.gray700,
  },
  stepsContainer: {
    paddingHorizontal: 20,
  },
  stepContainer: {
    flexDirection: "row",
    marginBottom: 24,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: NeutralColors.black,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: NeutralColors.gray600,
  },
  mapTipsSection: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
    marginBottom: 16,
  },
  tipsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    marginBottom: 16,
  },
  tipIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: NeutralColors.gray700,
  },
  exploreMoreSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  exploreMoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  exploreMoreTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
    marginLeft: 8,
  },
  exploreMoreText: {
    fontSize: 14,
    lineHeight: 22,
    color: NeutralColors.gray600,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  startButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  startButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
});

export default MapGettingStartedModal;
