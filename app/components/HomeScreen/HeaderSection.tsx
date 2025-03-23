// components/HomeScreen/HeaderSection.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colours";

const { width } = Dimensions.get("window");

interface HeaderSectionProps {
  userName: string;
  profileImage: string | null;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({ userName, profileImage }) => {
  const navigation = useNavigation();

  // Animation values
  const containerAnim = useRef(new Animated.Value(0)).current;
  const nameAnim = useRef(new Animated.Value(0)).current;
  const profileAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate container first
    Animated.timing(containerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Then animate children with stagger
    Animated.stagger(150, [
      Animated.spring(nameAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(profileAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerAnim,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <View style={styles.welcomeContainer}>
          <Animated.View
            style={[
              styles.welcomeTextContainer,
              {
                opacity: nameAnim,
                transform: [
                  {
                    translateY: nameAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.welcomeText}>Welcome,</Text>
            <Text style={styles.userName}>{userName}</Text>
          </Animated.View>
        </View>

        <View style={styles.actionsContainer}>
          {/* Profile button */}
          <Animated.View
            style={{
              opacity: profileAnim,
              transform: [
                {
                  scale: profileAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate("Profile")}
              activeOpacity={0.9}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.profileImage} />
              ) : (
                <View style={[styles.profileImage, styles.profilePlaceholder]}>
                  <Text style={styles.profileInitial}>{userName.charAt(0)}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6, // Reduced padding to clean up whitespace
    marginBottom: 4, // Reduced margin to clean up whitespace
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeTextContainer: {
    // Added a container with styling for more beautiful welcome text
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 2,
    fontWeight: "500", // Increased weight for better appearance
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  profileImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  profilePlaceholder: {
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInitial: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
});

export default HeaderSection;
