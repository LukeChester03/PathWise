// HomeScreen.js
import React from "react";
import { SafeAreaView, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import HeaderSection from "../components/HomeScreen/HeaderSection";
import StatsSection from "../components/HomeScreen/StatsSection";
import DiscoveredLocationsSection from "../components/HomeScreen/DiscoveredLocationsSection";
import FeaturesSection from "../components/HomeScreen/FeaturesSection";

const HomeScreen = () => {
  const navigation = useNavigation();
  const userName = "User";

  const navigateToScreen = (screenName) => {
    navigation.navigate(screenName);
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <HeaderSection userName={userName} />
          <StatsSection />
          <DiscoveredLocationsSection navigateToScreen={navigateToScreen} />
          <FeaturesSection navigateToScreen={navigateToScreen} />
        </ScrollView>
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
});

export default HomeScreen;
