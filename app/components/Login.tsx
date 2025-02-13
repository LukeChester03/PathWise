// app/components/LoginComponent.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Colors, NeutralColors } from "../constants/colours";
import { handleLogin } from "../controllers/Login/LoginController";

interface LoginComponentProps {
  visible: boolean; // Controls modal visibility
  onRequestClose: () => void; // Function to close the modal
  onLoginSuccess: () => void;
  onNavigateToForgotPassword: () => void;
}

export default function LoginComponent({
  visible,
  onRequestClose,
  onLoginSuccess,
  onNavigateToForgotPassword,
}: LoginComponentProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const performLogin = async () => {
    setLoading(true);
    handleLogin(
      email,
      password,
      () => {
        // Success callback
        setLoading(false);
        onLoginSuccess(); // Trigger the success callback
      },
      (errorMessage: string) => {
        // Error callback
        setLoading(false);
        Alert.alert("Error", errorMessage);
      }
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button (X) */}
          <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
            <Text style={styles.closeButtonText}>×</Text> {/* X symbol */}
          </TouchableOpacity>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.subTitle}>Login</Text>
            {/* Email Input */}
            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={NeutralColors.gray600}
              style={styles.input}
            />

            {/* Password Input */}
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={NeutralColors.gray600}
              style={styles.input}
            />

            {/* Buttons Container */}
            <View style={styles.buttonsContainer}>
              {/* Login Button */}
              <TouchableOpacity
                onPress={performLogin}
                style={[styles.button, styles.loginButton]}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? <ActivityIndicator color={NeutralColors.white} /> : "Login"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <TouchableOpacity onPress={onNavigateToForgotPassword}>
              <Text style={styles.forgotPassword}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end", // Center the modal vertically
    alignItems: "center", // Center the modal horizontally
  },
  modalContent: {
    width: "100%", // Adjust width as needed
    maxWidth: 400, // Limit maximum width
    backgroundColor: Colors.background, // White background for modal content
    borderRadius: 10, // Rounded corners
    padding: 20, // Padding inside the modal
    alignItems: "flex-end", // Center content horizontally
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1, // Ensure it stays on top
    padding: 10,
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  formContainer: {
    width: "100%",
    alignSelf: "center",
    padding: 20,
    backgroundColor: Colors.background,
  },
  subTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "left",
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
    color: "#333",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 15,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPassword: {
    textAlign: "left",
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 10,
  },
});
