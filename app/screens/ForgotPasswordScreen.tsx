// app/screens/ForgotPasswordScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  KeyboardAvoidingView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { Colors, NeutralColors } from "../constants/colours";
import { resetPassword } from "../controllers/ForgotPassword/ResetPasswordController";
import { useNavigation } from "@react-navigation/native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState(""); // State for email input
  const [loading, setLoading] = useState(false); // Loading state for button
  const navigation = useNavigation(); // Navigation hook

  // Handle password reset using the controller
  const handleResetPassword = async () => {
    await resetPassword(email, setLoading); // Call the controller function
    Alert.alert("Success", "Please check your email to reset your password");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Form Container */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>PathWise</Text>
          <Text style={styles.subTitle2}>Discover the Past, Unlock the City</Text>
          <Text style={styles.subTitle}>Reset Password</Text>

          {/* Email Input */}
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor="#888"
          />

          {/* Reset Password Button */}
          <TouchableOpacity
            onPress={handleResetPassword}
            style={[styles.button, styles.loginButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Sending..." : "Reset Password"}</Text>
          </TouchableOpacity>

          {/* Back to Login Link */}
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.forgotPassword}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  formContainer: {
    width: "80%",
    maxWidth: 400,
    alignSelf: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: Colors.text,
  },
  subTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "left",
    marginBottom: 16,
    color: Colors.text,
  },
  subTitle2: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
    color: Colors.text,
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
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPassword: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.primary,
    opacity: 0.7,
    marginTop: 10,
  },
});
