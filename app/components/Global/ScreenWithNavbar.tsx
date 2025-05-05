import React from "react";
import { View, StyleSheet } from "react-native";
import NavBar from "./NavBar";

const ScreenWithNavBar = ({ children }: { children: React.ReactNode }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>{children}</View>
      <NavBar />
    </View>
  );
};

export default ScreenWithNavBar;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
  },
});
