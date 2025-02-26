import React from "react";
import { View, Text, StyleSheet, SafeAreaView, Image } from "react-native";
import { globalStyles } from "../constants/globalStyles";
import NavBar from "../components/Global/NavBar";
import Map from "../components/Map/Map";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors, NeutralColors } from "../constants/colours";
import FeatherIcon from "react-native-vector-icons/Feather";

const MapScreen = () => {
  return (
    <ScreenWithNavBar>
      <View style={globalStyles.container}>
        <View style={styles.headerContainer}>
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
    paddingVertical: 16,
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
  floatingCard: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: NeutralColors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: NeutralColors.black,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: NeutralColors.gray600,
    lineHeight: 20,
  },
});
