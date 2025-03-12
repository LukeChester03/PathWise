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

interface GettingStartedModalProps {
  visible: boolean;
  onClose: () => void;
}
const GettingStartedModal = ({ visible, onClose }: GettingStartedModalProps) => {
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
              <Ionicons name="bulb-outline" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.modalTitle}>Getting Started</Text>
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
                  Welcome to Places! Here's how to make the most of your experience.
                </Text>
              </View>

              <View style={styles.stepsContainer}>
                {renderStep(
                  "search-outline",
                  "Discover Places",
                  "Use the search bar to find interesting places around you or in a specific location."
                )}

                {renderStep(
                  "location-outline",
                  "Explore Nearby",
                  "Browse through nearby attractions, landmarks, and hidden gems in your area.",
                  "#4CAF50"
                )}

                {renderStep(
                  "bookmark-outline",
                  "Save Favorites",
                  "Save your favorite places for easy access later. Create your personal collection.",
                  "#FF9800"
                )}

                {renderStep(
                  "navigate-outline",
                  "Plan Your Visit",
                  "Get directions, view opening hours, and read reviews before your visit.",
                  "#2196F3"
                )}

                {renderStep(
                  "camera-outline",
                  "Capture Memories",
                  "Take photos of the places you visit and share them with the community.",
                  "#9C27B0"
                )}
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

export default GettingStartedModal;
