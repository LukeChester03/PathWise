// components/Home/HeaderSection.js
import React from "react";
import { View, Text, StyleSheet, Image, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const HeaderSection = ({ userName }) => {
  return (
    <View style={styles.headerContainer}>
      {/* Background Image with Gradient Overlay */}
      <Image
        source={{
          uri: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        }}
        style={styles.backgroundImage}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.6)"]}
        style={styles.gradientOverlay}
      />

      {/* Welcome Text */}
      <View style={styles.welcomeTextContainer}>
        <Text style={styles.welcomeGreeting}>Hello,</Text>
        <Text style={styles.welcomeText}>{userName}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 260,
    justifyContent: "flex-end",
    marginBottom: 16,
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
  welcomeTextContainer: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 1,
  },
  welcomeGreeting: {
    fontSize: 22,
    color: "#fff",
    opacity: 0.9,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchTouchable: {
    width: "100%",
  },
});

export default HeaderSection;
