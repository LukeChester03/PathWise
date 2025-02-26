import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import FeatherIcon from "react-native-vector-icons/Feather";
import { RootStackParamList } from "../../navigation/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, NeutralColors } from "../../constants/colours";

// Assuming you have these colors defined in your project
const border = {
  stroke: "#EEEEEE",
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NavBar = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const currentRoute = useNavigationState((state) => {
    const route = state.routes[state.index];
    return route.name;
  });

  const navItems = [
    { id: "home", icon: "home", screen: "Home", label: "Home" },
    { id: "discover", icon: "compass", screen: "Discover", label: "Discover" },
    { id: "explore", icon: "map-pin", screen: "Explore", label: "Explore" },
    { id: "learn", icon: "book-open", screen: "Learn", label: "Learn" },
    { id: "profile", icon: "user", screen: "Profile", label: "Profile" },
  ];

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.innerContainer}>
        {navItems.map((item) => {
          const isActive = currentRoute === item.screen;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => navigation.navigate(item.screen as keyof RootStackParamList)}
            >
              <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                <FeatherIcon
                  name={item.icon}
                  size={22}
                  color={isActive ? Colors.primary : NeutralColors.black}
                />
              </View>
              <Text style={[styles.label, isActive && styles.activeLabel]}>{item.label}</Text>
              {isActive && <View style={styles.indicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: NeutralColors.white,
    borderTopWidth: 1,
    borderTopColor: border.stroke,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 5,
    width: "100%",
  },
  innerContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeIconContainer: {
    backgroundColor: `${Colors.primary}10`, // 10% opacity of primary color
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    color: NeutralColors.black,
    fontWeight: "500",
  },
  activeLabel: {
    color: Colors.primary,
    fontWeight: "600",
  },
  indicator: {
    position: "absolute",
    bottom: -12,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});

export default NavBar;
