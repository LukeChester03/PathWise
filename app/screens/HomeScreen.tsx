// HomeScreen.tsx
import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors } from "../constants/colours";
import HeaderSection from "../components/HomeScreen/HeaderSection";
import StatsSection from "../components/HomeScreen/StatsSection";
import DiscoveredLocationsSection from "../components/HomeScreen/DiscoveredLocationsSection";
import FeaturesSection from "../components/HomeScreen/FeaturesSection";
import { fetchUserProfile } from "../services/userService";

const HomeScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [userName, setUserName] = useState("User");
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Fetch user profile from Firestore
        const userProfile = await fetchUserProfile(navigation);

        // Update username and profile image
        setUserName(userProfile.name || "User");
        setProfileImage(userProfile.profileImage || null);
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, []);

  const navigateToScreen = (screenName: string, params?: any) => {
    navigation.navigate(screenName, params);
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          bounces={false}
        >
          <HeaderSection userName={userName} profileImage={profileImage} />

          <View style={styles.contentContainer}>
            <StatsSection />
            <DiscoveredLocationsSection navigateToScreen={navigateToScreen} />
            <FeaturesSection navigateToScreen={navigateToScreen} />
          </View>
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
    flexGrow: 1,
    paddingBottom: 24,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 16,
  },
});

export default HomeScreen;
