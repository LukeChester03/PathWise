// src/components/NavBar.tsx
import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import Icon from "react-native-vector-icons/Ionicons";
import { RootStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, NeutralColors } from "../../constants/colours";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NavBar = () => {
  const navigation = useNavigation<NavigationProp>();
  const currentRoute = useNavigationState((state) => {
    const route = state.routes[state.index];
    return route.name;
  });

  const insets = useSafeAreaInsets(); // Get safe area insets

  const navItems = [
    { id: "map", icon: "map-outline", screen: "Map" },
    { id: "explore", icon: "compass-outline", screen: "Explore" },
    { id: "home", icon: "home-outline", screen: "Home" },
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
              size={currentRoute === item.screen ? 40 : 24}
              color={currentRoute === item.screen ? NeutralColors.white : NeutralColors.white}
            />
            <Text
              style={{
                color: currentRoute === item.screen ? NeutralColors.white : Colors.background,
                fontSize: currentRoute === item.screen ? 18 : 16,
              }}
            >
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
    backgroundColor: Colors.primary,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    paddingBottom: 24, // Add some padding for better spacing
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
