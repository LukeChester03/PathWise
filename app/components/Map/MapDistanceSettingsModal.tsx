import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  StatusBar,
  TouchableWithoutFeedback,
} from "react-native";
import Slider from "@react-native-community/slider";
import { Colors, NeutralColors } from "../../constants/colours";
import { Ionicons } from "@expo/vector-icons";

interface MapDistanceSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  initialMaxPlaces: number;
  initialRadius: number;
  onSave: (maxPlaces: number, radius: number) => void;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SCREEN_WIDTH = Dimensions.get("window").width;

const MapDistanceSettingsModal: React.FC<MapDistanceSettingsModalProps> = ({
  visible,
  onClose,
  initialMaxPlaces = 40,
  initialRadius = 20,
  onSave,
}) => {
  const [maxPlaces, setMaxPlaces] = useState<number>(initialMaxPlaces);
  const [radius, setRadius] = useState<number>(initialRadius);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Animation values
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const backdropAnimation = useRef(new Animated.Value(0)).current;
  const contentScaleAnimation = useRef(new Animated.Value(0.95)).current;
  const sliderAnimationMaxPlaces = useRef(new Animated.Value(0)).current;
  const sliderAnimationRadius = useRef(new Animated.Value(0)).current;

  // Reset values when modal opens
  useEffect(() => {
    if (visible) {
      setMaxPlaces(initialMaxPlaces);
      setRadius(initialRadius);
      setIsSaving(false);

      // Start animations
      Animated.parallel([
        Animated.timing(backdropAnimation, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(modalAnimation, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentScaleAnimation, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered animations for internal elements
      Animated.stagger(150, [
        Animated.timing(sliderAnimationMaxPlaces, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(sliderAnimationRadius, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      backdropAnimation.setValue(0);
      modalAnimation.setValue(0);
      contentScaleAnimation.setValue(0.95);
      sliderAnimationMaxPlaces.setValue(0);
      sliderAnimationRadius.setValue(0);
    }
  }, [visible, initialMaxPlaces, initialRadius]);

  const handleSave = () => {
    setIsSaving(true);

    // Ensure we pass numbers, not any type
    setTimeout(() => {
      onSave(Number(maxPlaces), Number(radius));
    }, 300); // Short delay to show loading state
  };

  const handleClose = () => {
    if (isSaving) return; // Don't close if saving

    // Animate out before calling onClose
    Animated.parallel([
      Animated.timing(backdropAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(contentScaleAnimation, {
        toValue: 0.95,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // Calculate modal position
  const translateY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.1, 0],
  });

  // Calculate slider animations
  const translateXMaxPlaces = sliderAnimationMaxPlaces.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const translateXRadius = sliderAnimationRadius.interpolate({
    inputRange: [0, 1],
    outputRange: [-20, 0],
  });

  const opacityAnimMaxPlaces = sliderAnimationMaxPlaces;
  const opacityAnimRadius = sliderAnimationRadius;

  return (
    <Modal
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent={true}
      animationType="none" // We'll handle our own animations
    >
      <StatusBar barStyle="dark-content" backgroundColor="rgba(0, 0, 0, 0.5)" translucent={true} />
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.modalOverlay,
            {
              opacity: backdropAnimation,
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ translateY: translateY }, { scale: contentScaleAnimation }],
                },
              ]}
            >
              {/* Pill indicator for better UX */}
              <View style={styles.pillIndicator} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>Map Settings</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  disabled={isSaving}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={isSaving ? NeutralColors.gray500 : Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Settings */}
              <Animated.View
                style={[
                  styles.settingContainer,
                  {
                    opacity: opacityAnimMaxPlaces,
                    transform: [{ translateX: translateXMaxPlaces }],
                  },
                ]}
              >
                <View style={styles.settingHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="location" size={18} color="#FFF" />
                  </View>
                  <Text style={styles.settingTitle}>Maximum Places</Text>
                </View>

                <Text style={styles.settingValue}>{maxPlaces} places</Text>

                <Slider
                  style={styles.slider}
                  minimumValue={10}
                  maximumValue={50}
                  step={5}
                  value={maxPlaces}
                  onValueChange={(value: number) => setMaxPlaces(value)}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={NeutralColors.gray200}
                  thumbTintColor={Colors.primary}
                  disabled={isSaving}
                />

                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>10</Text>
                  <Text style={styles.sliderLabel}>50</Text>
                </View>

                <Text style={styles.settingDescription}>
                  Adjust the maximum number of places to display on the map
                </Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.settingContainer,
                  {
                    opacity: opacityAnimRadius,
                    transform: [{ translateX: translateXRadius }],
                  },
                ]}
              >
                <View style={styles.settingHeader}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="compass" size={18} color="#FFF" />
                  </View>
                  <Text style={styles.settingTitle}>Search Radius</Text>
                </View>

                <Text style={styles.settingValue}>{radius} km</Text>

                <Slider
                  style={styles.slider}
                  minimumValue={1}
                  maximumValue={50}
                  step={1}
                  value={radius}
                  onValueChange={(value: number) => setRadius(value)}
                  minimumTrackTintColor={Colors.primary}
                  maximumTrackTintColor={NeutralColors.gray200}
                  thumbTintColor={Colors.primary}
                  disabled={isSaving}
                />

                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>1 km</Text>
                  <Text style={styles.sliderLabel}>50 km</Text>
                </View>

                <Text style={styles.settingDescription}>
                  Set how far to search for interesting places around your location
                </Text>
              </Animated.View>

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={handleClose}
                  disabled={isSaving}
                >
                  <Text style={[styles.cancelButtonText, isSaving && styles.disabledText]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveButton, isSaving && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <View style={styles.saveButtonContent}>
                      <Text style={styles.saveButtonText}>Apply</Text>
                      <Ionicons
                        name="checkmark-sharp"
                        size={18}
                        color="white"
                        style={styles.saveIcon}
                      />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Status message */}
              <Animated.View
                style={[
                  styles.statusContainer,
                  { opacity: isSaving ? 1 : 0, height: isSaving ? "auto" : 0 },
                ]}
              >
                <ActivityIndicator
                  size="small"
                  color={Colors.primary}
                  style={styles.statusSpinner}
                />
                <Text style={styles.statusMessage}>Updating map settings...</Text>
              </Animated.View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingTop: StatusBar.currentHeight || 0,
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  pillIndicator: {
    width: 40,
    height: 4,
    backgroundColor: NeutralColors.gray300,
    borderRadius: 2,
    marginTop: -12,
    marginBottom: 8,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: NeutralColors.gray100,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: NeutralColors.gray200,
    marginBottom: 24,
  },
  settingContainer: {
    width: "100%",
    marginBottom: 28,
  },
  settingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
  },
  settingValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 13,
    color: NeutralColors.gray500,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    color: NeutralColors.gray400,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  button: {
    borderRadius: 16,
    padding: 16,
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  saveIcon: {
    marginLeft: 6,
  },
  disabledButton: {
    backgroundColor: Colors.primary + "80", // Add opacity to primary color
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: NeutralColors.gray100,
    borderWidth: 1,
    borderColor: NeutralColors.gray200,
  },
  cancelButtonText: {
    color: NeutralColors.gray700,
    fontWeight: "600",
    fontSize: 16,
  },
  disabledText: {
    color: NeutralColors.gray400,
  },
  statusContainer: {
    flexDirection: "row",
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NeutralColors.gray100,
    padding: 8,
    borderRadius: 12,
    width: "100%",
  },
  statusSpinner: {
    marginRight: 8,
  },
  statusMessage: {
    textAlign: "center",
    color: Colors.primary,
    fontWeight: "500",
  },
});

export default MapDistanceSettingsModal;
