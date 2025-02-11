import React from "react";
import { View, Text, SafeAreaView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types"; // Import your RootStackParamList type
import NavBar from "../components/NavBar";
import ScreenWithNavBar from "../components/ScreenWithNavbar";
const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Simulated user data (replace with actual user data from Firebase or your backend)
  const user = {
    displayName: auth.currentUser?.displayName, // Replace with the actual user's name
    email: auth.currentUser?.email, // Replace with the actual user's email
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out the user
      navigation.navigate("Login"); // Navigate back to the login screen
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  // Handle change password
  const handleChangePassword = () => {
    // navigation.navigate("ForgotPassword"); // Navigate to the ForgotPassword screen
  };

  return (
    <ScreenWithNavBar>
      <SafeAreaView style={styles.safeArea}>
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Information */}
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>{user.displayName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.button, styles.changePasswordButton]}
            onPress={handleChangePassword}
          >
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>

          {/* Log Out Button */}
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
            <Text style={styles.buttonText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </ScreenWithNavBar>
  );
};

export default ProfileScreen;

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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  userInfoContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
    marginTop: 5,
  },
  actionsContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
  },
  button: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  changePasswordButton: {
    backgroundColor: "#007bff",
  },
  logoutButton: {
    backgroundColor: "#ff4d4d", // Red for log out
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
