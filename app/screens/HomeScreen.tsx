// app/screens/HomeScreen.tsx
import React from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Image,
  FlatList,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();

  // Dummy data for a list of features or options
  const features = [
    { id: "1", title: "Profile", icon: "👤", screen: "Profile" },
    { id: "2", title: "Settings", icon: "⚙️", screen: "Settings" },
    { id: "3", title: "Logout", icon: "🚪", screen: "Login" },
  ];

  // Render each feature item
  const renderFeatureItem = ({
    item,
  }: {
    item: { id: string; title: string; icon: string; screen: string };
  }) => (
    <TouchableOpacity style={styles.featureItem} onPress={() => Alert.alert(item.title)}>
      <Text style={styles.featureIcon}>{item.icon}</Text>
      <Text style={styles.featureTitle}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to PathWise!</Text>
        <Text style={styles.subText}>Discover the Past, Unlock the City</Text>
      </View>

      {/* Features Section */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>What would you like to do?</Text>
        <FlatList
          data={features}
          keyExtractor={(item) => item.id}
          renderItem={renderFeatureItem}
          numColumns={2} // Display items in a grid
          contentContainerStyle={styles.featureList}
        />
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "#007bff",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    color: "#e6f7ff",
  },
  featuresContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  featureList: {
    justifyContent: "space-between",
  },
  featureItem: {
    flex: 1,
    margin: 10,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
});
