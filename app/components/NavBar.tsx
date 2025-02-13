import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { RootStackParamList } from "../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../constants/colours";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NavBar = () => {
  const navigation = useNavigation<NavigationProp>();
  const currentRoute = useNavigationState((state) => {
    const route = state.routes[state.index];
    return route.name;
  });

  const insets = useSafeAreaInsets(); // Get safe area insets

  const navItems = [
    { id: "home", icon: "home-outline", screen: "Home" },
    { id: "map", icon: "map-outline", screen: "Map" },
    { id: "explore", icon: "compass-outline", screen: "Explore" },
    { id: "learn", icon: "book-outline", screen: "Learn" },
    { id: "profile", icon: "person-outline", screen: "Profile" },
  ];

  return (
    <SafeAreaView
      edges={["bottom"]} // Ensure the bottom edge is handled
      style={[styles.container, { paddingBottom: insets.bottom }]} // Add padding for the safe area
    >
      <View style={styles.innerContainer}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => navigation.navigate(item.screen as keyof RootStackParamList)}
          >
            <Icon
              name={item.icon}
              size={24}
              color={currentRoute === item.screen ? Colors.primary : Colors.text}
            />
            <Text style={{ color: currentRoute === item.screen ? Colors.primary : Colors.text }}>
              {item.screen}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
};

export default NavBar;

// Styles
const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    marginBottom: -48,
  },
  innerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 10,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
  },
});
