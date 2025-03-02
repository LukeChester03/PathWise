import React from "react";
import { View, Text, StyleSheet, Image, Dimensions, StatusBar, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Types
interface HeaderSectionProps {
  userName?: string;
  profileImage?: string | null;
  backgroundImage?: string;
}

// Constants
const { width, height } = Dimensions.get("window");
const DEFAULT_BACKGROUND_IMAGE =
  "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";

const HeaderSection: React.FC<HeaderSectionProps> = ({
  userName = "User",
  profileImage = null,
  backgroundImage = DEFAULT_BACKGROUND_IMAGE,
}) => {
  // Use safe area insets for better layout on different devices
  const insets = useSafeAreaInsets();

  // Render avatar or placeholder
  const renderAvatar = () => {
    if (profileImage) {
      return <Image source={{ uri: profileImage }} style={styles.avatarImage} resizeMode="cover" />;
    }

    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarPlaceholderText}>{userName.charAt(0).toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <>
      {/* Set StatusBar to transparent */}
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.headerContainer}>
        {/* Background Image - Fixed positioning to cover the entire area */}
        <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} blurRadius={3} />

        {/* Dark overlay for better text contrast */}
        <View style={styles.backgroundOverlay} />

        {/* Header Content - Positioned with proper padding for safe area */}
        <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
          {/* User Info */}
          <View style={styles.userInfoContainer}>
            {/* Avatar Container */}
            <View style={styles.avatarContainer}>{renderAvatar()}</View>

            {/* Welcome Text Container */}
            <View style={styles.welcomeTextContainer}>
              <Text style={styles.welcomeGreeting}>Welcome,</Text>
              <Text style={styles.welcomeText} numberOfLines={2}>
                {userName}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: height * 0.38, // Slightly shorter for better proportions
    width: "100%",
    overflow: "hidden",
    position: "relative",
    // Remove the backgroundColor that was causing the grey bar
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
    backgroundColor: "rgba(0,0,0,0.35)", // Slightly darker for better text readability
  },
  headerContent: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: 24,
    width: "100%",
    height: "100%",
    justifyContent: "center",
  },
  userInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatarImage: {
    width: width * 0.18,
    height: width * 0.18,
    borderRadius: width * 0.09,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarPlaceholder: {
    width: width * 0.18,
    height: width * 0.18,
    borderRadius: width * 0.09,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarPlaceholderText: {
    color: "white",
    fontSize: width * 0.07,
    fontWeight: "600",
  },
  welcomeTextContainer: {
    justifyContent: "center",
    maxWidth: "70%",
  },
  welcomeGreeting: {
    fontSize: 22,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 4,
    fontWeight: "300",
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default HeaderSection;
