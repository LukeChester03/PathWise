// components/Home/HeaderSection.tsx
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { fetchUserProfile } from "../../services/userService";

interface HeaderSectionProps {
  onNotificationPress?: () => void;
}

const HeaderSection: React.FC<HeaderSectionProps> = ({ onNotificationPress }) => {
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userProfile = await fetchUserProfile();
        setUserName(userProfile.name || "User");
        setProfileImage(userProfile.profileImage);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  return (
    <View style={styles.headerContainer}>
      {/* Background Image with Gradient Overlay */}
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        }}
        style={styles.backgroundImage}
        blurRadius={3}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)"]}
        style={styles.gradientOverlay}
      />

      {/* Header Content */}
      <View style={styles.headerContent}>
        {/* User Info */}
        <View style={styles.userInfoContainer}>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>{userName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </View>
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeGreeting}>Hello,</Text>
            <Text style={styles.welcomeText}>{userName}</Text>
          </View>
        </View>

        {/* Notification Button */}
        <TouchableOpacity style={styles.notificationButton} onPress={onNotificationPress}>
          <BlurView intensity={Platform.OS === "ios" ? 50 : 100} style={styles.blurContainer}>
            <Ionicons name="notifications-outline" size={24} color="white" />
          </BlurView>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 220,
    overflow: "hidden",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover",
  },
  gradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  welcomeTextContainer: {
    justifyContent: "center",
  },
  welcomeGreeting: {
    fontSize: 18,
    color: "#fff",
    opacity: 0.8,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 0.5,
  },
  notificationButton: {
    width: 50,
    height: 50,
  },
  blurContainer: {
    flex: 1,
    borderRadius: 25,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default HeaderSection;
