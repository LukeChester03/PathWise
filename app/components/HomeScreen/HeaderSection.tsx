import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
  Easing,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Svg, { Path } from "react-native-svg";
import { Colors } from "@/app/constants/colours";

// Types
interface HeaderSectionProps {
  userName?: string;
  profileImage?: string | null;
  backgroundImage?: string;
}

// Constants
const { width, height } = Dimensions.get("window");
const DEFAULT_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3";

const HeaderSection: React.FC<HeaderSectionProps> = ({
  userName = "User",
  profileImage = null,
  backgroundImage = DEFAULT_BACKGROUND_IMAGE,
}) => {
  // Use safe area insets for better layout on different devices
  const insets = useSafeAreaInsets();

  // Animation references
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const avatarAnim = useRef(new Animated.Value(0)).current;
  const avatarPulse = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;
  const backgroundAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // Background particles animation refs
  const particles = Array(5)
    .fill(0)
    .map((_, i) => ({
      position: useRef(new Animated.ValueXY({ x: Math.random() * width, y: Math.random() * 100 }))
        .current,
      opacity: useRef(new Animated.Value(Math.random() * 0.3 + 0.1)).current,
      size: useRef(new Animated.Value(Math.random() * 20 + 10)).current,
    }));

  // Setup animations on component mount
  useEffect(() => {
    // Sequence for initial fade in
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      // Then start all other animations
      Animated.parallel([
        // Subtle floating animation for background
        Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(floatAnim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
          ])
        ),

        // Background subtle zoom animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(backgroundAnim, {
              toValue: 1,
              duration: 12000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(backgroundAnim, {
              toValue: 0,
              duration: 12000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
          ])
        ),

        // Avatar pulsing animation
        Animated.loop(
          Animated.sequence([
            Animated.timing(avatarPulse, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.timing(avatarPulse, {
              toValue: 0,
              duration: 2000,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
          ])
        ),
      ]),
    ]).start();

    // Avatar entrance animation
    Animated.timing(avatarAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.7)),
    }).start();

    // Text entrance animation
    Animated.timing(textAnim, {
      toValue: 1,
      duration: 800,
      delay: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.back(1.2)),
    }).start();

    // Animate floating particles
    particles.forEach((particle, index) => {
      const animateParticle = () => {
        const randomX = Math.random() * width;
        const randomY = Math.random() * 150 - 50;
        const randomDuration = 15000 + Math.random() * 10000;
        const randomDelay = Math.random() * 2000;

        Animated.sequence([
          Animated.delay(randomDelay),
          Animated.parallel([
            Animated.timing(particle.position, {
              toValue: { x: randomX, y: randomY },
              duration: randomDuration,
              useNativeDriver: true,
              easing: Easing.inOut(Easing.sin),
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.2 + 0.2,
                duration: randomDuration / 2,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              }),
              Animated.timing(particle.opacity, {
                toValue: Math.random() * 0.1 + 0.1,
                duration: randomDuration / 2,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              }),
            ]),
            Animated.sequence([
              Animated.timing(particle.size, {
                toValue: Math.random() * 30 + 10,
                duration: randomDuration / 2,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              }),
              Animated.timing(particle.size, {
                toValue: Math.random() * 20 + 10,
                duration: randomDuration / 2,
                useNativeDriver: true,
                easing: Easing.inOut(Easing.sin),
              }),
            ]),
          ]),
        ]).start(() => animateParticle());
      };

      animateParticle();
    });
  }, []);

  // Render floating particles for organic background effect
  const renderParticles = () => {
    return particles.map((particle, index) => (
      <Animated.View
        key={`particle-${index}`}
        style={[
          styles.particle,
          {
            opacity: particle.opacity,
            transform: [
              { translateX: particle.position.x },
              { translateY: particle.position.y },
              {
                scale: particle.size.interpolate({
                  inputRange: [0, 40],
                  outputRange: [0, 1],
                }),
              },
            ],
            width: 20, // Fixed base width
            height: 20, // Fixed base height
            borderRadius: 10, // Fixed base radius - won't animate this directly
          },
        ]}
      />
    ));
  };

  // Render avatar or placeholder with animations
  const renderAvatar = () => {
    if (profileImage) {
      return (
        <Animated.View
          style={[
            styles.avatarContainer,
            {
              opacity: avatarAnim,
              transform: [
                { scale: avatarAnim },
                {
                  scale: avatarPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.05],
                  }),
                },
              ],
            },
          ]}
        >
          <Image source={{ uri: profileImage }} style={styles.avatarImage} resizeMode="cover" />

          {/* Avatar glow effect */}
          <Animated.View
            style={[
              styles.avatarGlow,
              {
                opacity: avatarPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 0.7],
                }),
                transform: [
                  {
                    scale: avatarPulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.3],
                    }),
                  },
                ],
              },
            ]}
          />
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={[
          styles.avatarContainer,
          {
            opacity: avatarAnim,
            transform: [
              { scale: avatarAnim },
              {
                scale: avatarPulse.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{userName.charAt(0).toUpperCase()}</Text>
        </View>

        {/* Avatar glow effect */}
        <Animated.View
          style={[
            styles.avatarGlow,
            {
              opacity: avatarPulse.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.5],
              }),
              transform: [
                {
                  scale: avatarPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.3],
                  }),
                },
              ],
            },
          ]}
        />
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.headerContainer, { opacity: fadeAnim }]}>
      {/* Background Image with animation */}
      <Animated.Image
        source={{ uri: backgroundImage }}
        style={[
          styles.backgroundImage,
          {
            transform: [
              {
                scale: backgroundAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1.05, 1.1],
                }),
              },
              {
                translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
            ],
          },
        ]}
        blurRadius={1}
      />

      {/* Overlay with animated particles */}
      <LinearGradient
        colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0.7)"]}
        style={styles.backgroundOverlay}
      >
        {renderParticles()}
      </LinearGradient>

      {/* Header Content */}
      <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          {/* Animated Avatar */}
          {renderAvatar()}

          {/* Welcome Text Container with animations */}
          <Animated.View
            style={[
              styles.welcomeTextContainer,
              {
                opacity: textAnim,
                transform: [
                  {
                    translateX: textAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.welcomeGreeting}>Welcome,</Text>
            <Text style={styles.welcomeText} numberOfLines={2}>
              {userName}
            </Text>
          </Animated.View>
        </View>

        {/* Quick action buttons */}
        <Animated.View
          style={[
            styles.quickActionContainer,
            {
              opacity: textAnim,
              transform: [
                {
                  translateY: textAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        ></Animated.View>
      </View>

      {/* Bottom wave decoration using SVG */}
      <View style={styles.waveContainer}>
        <Svg width="100%" height="100%" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <Path
            d="M0,64 C288,89.3 576,104 960,64 C1344,24 1392,56 1440,64 L1440,120 L0,120 Z"
            fill={Colors.background}
          />
        </Svg>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: height * 0.4, // Slightly reduced height for better proportions
    width: "100%",
    overflow: "hidden",
    position: "relative",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 20, // Consistent horizontal padding
    width: "100%",
    height: "100%",
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "center",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "75%",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 20,
  },
  avatarImage: {
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: width * 0.085,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarPlaceholder: {
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: width * 0.085,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.5)",
  },
  avatarPlaceholderText: {
    color: "white",
    fontSize: width * 0.07,
    fontWeight: "600",
  },
  // Glow effect for avatar
  avatarGlow: {
    position: "absolute",
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    borderRadius: width * 0.085 + 5,
    backgroundColor: "rgba(255,255,255,0.3)",
    zIndex: -1,
  },
  welcomeTextContainer: {
    justifyContent: "center",
    maxWidth: "75%",
  },
  welcomeGreeting: {
    fontSize: 22,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 8,
    fontWeight: "300",
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 32, // Increased for more emphasis
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // Particles for organic effect
  particle: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  // Quick action buttons
  quickActionContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // SVG Wave divider at bottom
  waveContainer: {
    position: "absolute",
    bottom: -2, // Slight overlap to avoid gap
    left: 0,
    right: 0,
    height: 50,
    zIndex: 5,
    overflow: "hidden",
  },
});

export default HeaderSection;
