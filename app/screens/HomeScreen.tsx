// app/screens/HomeScreen.tsx
import React from "react";
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import { SearchBar } from "../components/Global/SearchBar";

const HomeScreen = () => {
  const navigation = useNavigation();
  const userName = "User";

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Section */}
        <View style={styles.headerContainer}>
          {/* Background Image */}
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            }}
            style={styles.backgroundImage}
          />

          {/* Welcome Text */}
          <View style={styles.welcomeTextContainer}>
            <Text style={styles.welcomeText}>Welcome back, {userName}</Text>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <SearchBar />
          </View>
        </View>

        {/* Features Section */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>Explore Features</Text>
          {/* Add your feature list or other content here */}
        </View>
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

export default HomeScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    height: "40%", // Top 40% of the screen for the image and welcome text
    justifyContent: "flex-end", // Align content to the bottom of the container
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover", // Ensure the image covers the entire area
  },
  welcomeTextContainer: {
    position: "absolute",
    top: 50, // Adjust as needed
    left: 20,
    zIndex: 1, // Ensure the text stays above the image
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  featuresContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
});
