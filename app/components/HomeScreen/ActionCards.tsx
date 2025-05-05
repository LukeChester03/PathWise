import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");

interface ActionCardsProps {
  navigateToScreen: (screenName: string, params?: any) => void;
}

const ActionCards: React.FC<ActionCardsProps> = ({ navigateToScreen }) => {
  const cardsOpacity = useRef(new Animated.Value(0)).current;
  const cardsScale = useRef(new Animated.Value(0.9)).current;
  const headerAnimation = useRef(new Animated.Value(0)).current;

  const discoverPulse = useRef(new Animated.Value(0)).current;
  const placesPulse = useRef(new Animated.Value(0)).current;
  const learnPulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnimation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.cubic),
    }).start();

    Animated.parallel([
      Animated.timing(cardsOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(cardsScale, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    startPulsingAnimation(discoverPulse, 0);
    startPulsingAnimation(placesPulse, 800);
    startPulsingAnimation(learnPulse, 1600);
  }, []);

  const startPulsingAnimation = (animValue: Animated.Value, delay: number) => {
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }, delay);
  };

  const createPressAnimation = (component: React.RefObject<typeof TouchableOpacity>) => {
    if (component.current) {
      Animated.sequence([
        Animated.timing(cardsScale, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(cardsScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  };

  const discoverRef = useRef<typeof TouchableOpacity>(null);
  const placesRef = useRef<typeof TouchableOpacity>(null);
  const learnRef = useRef<typeof TouchableOpacity>(null);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.sectionHeader,
          {
            opacity: headerAnimation,
            transform: [
              {
                translateX: headerAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="albums-outline" size={22} color={Colors.primary} />
        <Text style={styles.sectionTitle}>Explore Features</Text>
      </Animated.View>

      <Animated.View
        style={[
          styles.cardsContainer,
          {
            opacity: cardsOpacity,
            transform: [{ scale: cardsScale }],
          },
        ]}
      >
        <TouchableOpacity
          ref={discoverRef}
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => {
            createPressAnimation(discoverRef);
            navigateToScreen("Discover");
          }}
        >
          <LinearGradient
            colors={["#4A90E2", "#5DA9FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Animated.View
              style={[
                styles.backgroundCircle,
                {
                  opacity: discoverPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.25],
                  }),
                  transform: [
                    {
                      scale: discoverPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={styles.iconContainer}>
              <Ionicons name="compass-outline" size={24} color="#fff" />
            </View>

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Discover</Text>
              <Text style={styles.cardDescription}>Explore nearby landmarks and hidden gems</Text>
            </View>

            <View style={styles.arrowContainer}>
              <Animated.View
                style={[
                  styles.arrowButton,
                  {
                    transform: [
                      {
                        translateX: discoverPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 4],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Animated.View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          ref={placesRef}
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => {
            createPressAnimation(placesRef);
            navigateToScreen("Explore");
          }}
        >
          <LinearGradient
            colors={["#FF9500", "#FF5E3A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Animated.View
              style={[
                styles.backgroundCircle,
                styles.bgCircleAlt,
                {
                  opacity: placesPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.25],
                  }),
                  transform: [
                    {
                      scale: placesPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={styles.iconContainer}>
              <Ionicons name="map-outline" size={24} color="#fff" />
            </View>

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Places</Text>
              <Text style={styles.cardDescription}>
                View your visited locations and Nearby Places
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Animated.View
                style={[
                  styles.arrowButton,
                  {
                    transform: [
                      {
                        translateX: placesPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 4],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Animated.View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          ref={learnRef}
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={() => {
            createPressAnimation(learnRef);
            navigateToScreen("Learn");
          }}
        >
          <LinearGradient
            colors={["#4CAF50", "#8BC34A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            <Animated.View
              style={[
                styles.backgroundCircle,
                styles.bgCircleBottom,
                {
                  opacity: learnPulse.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.1, 0.25],
                  }),
                  transform: [
                    {
                      scale: learnPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.15],
                      }),
                    },
                  ],
                },
              ]}
            />

            <View style={styles.iconContainer}>
              <Ionicons name="school-outline" size={24} color="#fff" />
            </View>

            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Learn</Text>
              <Text style={styles.cardDescription}>
                Get AI insights on history, culture and your travel preferences
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Animated.View
                style={[
                  styles.arrowButton,
                  {
                    transform: [
                      {
                        translateX: learnPulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 4],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </Animated.View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    marginBottom: -32,
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
  cardsContainer: {
    gap: 10,
  },
  actionCard: {
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGradient: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    position: "relative",
    overflow: "hidden",
  },
  backgroundCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#fff",
    top: -40,
    right: -20,
  },
  bgCircleAlt: {
    left: -40,
    right: "auto",
  },
  bgCircleBottom: {
    top: "auto",
    bottom: -60,
    right: 20,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  arrowContainer: {
    marginLeft: 8,
  },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ActionCards;
