import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colours";
import { EXPLORATION_LEVELS } from "../../types/StatTypes";

const { width } = Dimensions.get("window");

interface LevelUpNotificationProps {
  visible: boolean;
  level: number;
  onClose: () => void;
}

const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({ visible, level, onClose }) => {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const starAnim = useRef(new Animated.Value(0)).current;

  const safeLevel = typeof level === "number" && level > 0 ? level : 1;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.7)),
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.elastic(1.2),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(starAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
          Animated.timing(starAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.linear,
          }),
        ])
      ).start();

      const timer = setTimeout(() => {
        hideNotification();
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      slideAnim.setValue(-300);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const levelData = EXPLORATION_LEVELS.find((l) => l.level === safeLevel) || EXPLORATION_LEVELS[0];
  const levelTitle = levelData?.title || "Explorer";
  const levelIcon = levelData?.icon || "🔍";

  const starScale = starAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.3, 1],
  });

  const starRotate = starAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <LinearGradient
        colors={["#4a6aff", "#a64dff"]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.content}>
          <Animated.View
            style={[
              styles.starContainer,
              {
                transform: [{ scale: starScale }, { rotate: starRotate }],
              },
            ]}
          >
            <Text style={styles.levelIcon}>{levelIcon}</Text>
          </Animated.View>

          <View style={styles.textContainer}>
            <Text style={styles.levelUpText}>LEVEL UP!</Text>
            <Text style={styles.levelText}>You've reached level {safeLevel}</Text>
            <Text style={styles.titleText}>{levelTitle}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={hideNotification}>
          <Ionicons name="close-circle" size={26} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 100,
    left: width / 2 - 150,
    width: 300,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 10,
      },
    }),
    zIndex: 1000,
  },
  gradient: {
    borderRadius: 16,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    padding: 20,
    alignItems: "center",
  },
  starContainer: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  levelIcon: {
    fontSize: 32,
  },
  textContainer: {
    flex: 1,
  },
  levelUpText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  levelText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  titleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
});

export default LevelUpNotification;
