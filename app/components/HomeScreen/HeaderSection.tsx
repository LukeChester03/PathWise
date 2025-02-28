import React from "react";
import { View, Text, StyleSheet, Image, Dimensions, ImageBackground } from "react-native";
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
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      {/* Background Image */}
      <View style={styles.backgroundContainer}>
        <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} blurRadius={5} />
        <View style={styles.backgroundOverlay} />

        {/* Header Content */}
        <View style={styles.headerContent}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: height * 0.3, // Responsive height
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(0,0,0,0.1)", // Subtle overlay for text readability
  },
  backgroundContainer: {
    position: "relative",
    width: "100%",
    height: "100%",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover",
  },
  backgroundOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)", // Darken and soften background
  },
  headerContent: {
    position: "relative",
    zIndex: 10,
    paddingHorizontal: width * 0.05,
    alignItems: "center",
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
    marginRight: width * 0.05,
  },
  avatarImage: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.8)",
  },
  avatarPlaceholder: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "white",
    fontSize: width * 0.08,
    fontWeight: "600",
  },
  welcomeTextContainer: {
    justifyContent: "center",
    maxWidth: "80%",
  },
  welcomeGreeting: {
    fontSize: 24,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 5,
    fontWeight: "300",
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
});

export default HeaderSection;
