import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebaseConfig";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types"; // Import your RootStackParamList type
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import { Colors, NeutralColors } from "../constants/colours";

const ProfileScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  // Simulated user data (replace with actual user data from Firebase or your backend)
  const [firstName, setFirstName] = useState(auth.currentUser?.displayName?.split(" ")[0] || "");
  const [familyName, setFamilyName] = useState(auth.currentUser?.displayName?.split(" ")[1] || "");

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.navigate("Landing");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  // Handle save changes
  const handleSaveChanges = () => {
    // Here you can implement logic to update the user's profile in Firebase or your backend
    Alert.alert("Success", "Changes saved successfully!");
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
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextInput
            style={styles.input}
            placeholder="Family Name"
            value={familyName}
            onChangeText={setFamilyName}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {/* Change Password Button */}
          <TouchableOpacity
            style={[styles.button, styles.changePasswordButton]}
            onPress={() => navigation.navigate("ForgotPassword")} // Replace with your ForgotPassword screen
          >
            <Text style={styles.buttonText}>Change Password</Text>
          </TouchableOpacity>

          {/* Save Changes Button */}
          <TouchableOpacity
            style={[styles.button, styles.saveChangesButton]}
            onPress={handleSaveChanges}
          >
            <Text style={styles.buttonText}>Save Changes</Text>
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
    backgroundColor: Colors.background,
  },
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#fafafa",
    color: Colors.text,
  },
  header: {
    padding: 20,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
  },
  userInfoContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
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
    backgroundColor: Colors.secondary,
  },
  saveChangesButton: {
    backgroundColor: Colors.success, // Use a success color for saving changes
  },
  logoutButton: {
    backgroundColor: Colors.danger,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: NeutralColors.white,
  },
});
