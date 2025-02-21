import React from "react";
import { View, StyleSheet } from "react-native";
import NavBar from "./NavBar";

const ScreenWithNavBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>{children}</View>
      {/* NavBar */}
      <NavBar />
    </View>
  );
};

export default ScreenWithNavBar;

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1, // Takes up all available space above the NavBar
  },
});
