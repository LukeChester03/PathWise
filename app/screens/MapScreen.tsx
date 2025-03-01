import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../constants/globalStyles";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors, NeutralColors } from "../constants/colours";

const MapScreen = () => {
  const insets = useSafeAreaInsets();
  const [screenHeight, setScreenHeight] = useState(Dimensions.get("window").height);

  useEffect(() => {
    const updateDimensions = () => {
      setScreenHeight(Dimensions.get("window").height);
    };

    const subscription = Dimensions.addEventListener("change", updateDimensions);

    return () => {
      subscription.remove();
    };
  }, []);

  // Ensure the header is positioned correctly regardless of screen height
  const headerPaddingTop = insets.top + 10; // Add safe area inset + some extra padding
  const headerPaddingBottom = screenHeight > 800 ? 20 : 16; // Adjust bottom padding for larger screens

  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <View
          style={[
            styles.headerContainer,
            { paddingTop: headerPaddingTop, paddingBottom: headerPaddingBottom },
          ]}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <Text style={styles.title}>Discover</Text>
              <View style={styles.subtitle}>
                <Image source={require("../assets/logo.png")} style={styles.logo} />
                <Text style={styles.subtitleText}>Explore nearby locations</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>
        <View style={styles.mapContainer}>
          <Map />
        </View>
      </View>
    </ScreenWithNavBar>
  );
};

export default MapScreen;

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: NeutralColors.white,
    borderBottomWidth: 1,
    borderBottomColor: NeutralColors.gray100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  safeArea: {
    width: "100%",
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  subtitleText: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 6,
  },
  mapContainer: {
    flex: 1,
    position: "relative",
  },
});
