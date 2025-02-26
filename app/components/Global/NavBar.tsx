// src/components/NavBar.tsx
import React, { useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Text, Animated } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import FeatherIcon from "react-native-vector-icons/Feather";
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
  const [activeIcon, setActiveIcon] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = (screen: string, id: string) => {
    if (activeIcon === id) {
      // If the same icon is clicked again, do nothing
      return;
    }

    // Animate the previously active icon back to normal size
    if (activeIcon !== null) {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    // Animate the new icon to the larger size
    setActiveIcon(id);
    Animated.timing(scaleAnim, {
      toValue: 1.4,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      navigation.navigate(screen as keyof RootStackParamList);
    });
  };

  const navItems = [
    { id: "discover", icon: "map", screen: "Discover" },
    { id: "explore", icon: "map-pin", screen: "Explore" },
    { id: "home", icon: "home", screen: "Home" },
    { id: "learn", icon: "book-open", screen: "Learn" },
    { id: "profile", icon: "user", screen: "Profile" },
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
            onPress={() => handlePress(item.screen, item.id)}
          >
            <Animated.View
              style={{ transform: [{ scale: activeIcon === item.id ? scaleAnim : 1 }] }}
            >
              <FeatherIcon
                name={item.icon}
                size={currentRoute === item.screen ? 48 : 32}
                color={currentRoute === item.screen ? Colors.primary : Colors.primary}
              />
            </Animated.View>
            <Text
              style={{
                color: currentRoute === item.screen ? Colors.primary : Colors.primary,
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
    backgroundColor: NeutralColors.white,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    paddingBottom: 24,
    width: "100%",
  },
  innerContainer: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "space-evenly",
    marginHorizontal: 16,
  },
});
