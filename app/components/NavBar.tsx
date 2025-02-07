// app/components/NavBar.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";

const NavBar = () => {
  const navigation = useNavigation();

  // Define the navigation items with their respective icons and screen names
  const navItems = [
    { id: "home", icon: "home-outline", screen: "HomeScreen" },
    { id: "map", icon: "map-outline", screen: "MapScreen" },
    { id: "explore", icon: "compass-outline", screen: "ExploreScreen" },
    { id: "learn", icon: "book-outline", screen: "LearnScreen" },
    { id: "profile", icon: "person-outline", screen: "ProfileScreen" },
  ];

  return (
    <View style={styles.container}>
      {navItems.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.navItem}
          onPress={() => Alert.alert("Success", "Clicked")}
        >
          <Icon name={item.icon} size={24} color="#666" />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default NavBar;

// Styles
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});
