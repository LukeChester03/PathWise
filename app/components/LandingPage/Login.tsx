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
import { Colors, NeutralColors } from "../../constants/colours";
import { handleLogin } from "../../controllers/Login/LoginController";
import { Button } from "../Global/Button";
import ForgotPasswordModal from "./ForgotPasswordModal";

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
  const [isForgotPasswordModalVisible, setIsForgotPasswordModalVisible] = useState(false);

  const performLogin = async () => {
    setLoading(true); // Start loading
    handleLogin(
      email,
      password,
      () => {
        // Success callback
        setLoading(false); // Stop loading
        onLoginSuccess(); // Trigger the success callback
      },
      (errorMessage: string) => {
        // Error callback
        setLoading(false); // Stop loading
        Alert.alert("Error", errorMessage);
      }
    );
  };

  const toggleForgotPasswordModal = () => {
    setIsForgotPasswordModalVisible(!isForgotPasswordModalVisible);
  };

  return (
    <>
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
              <Text style={styles.closeButtonText}>×</Text>
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
                  style={[styles.button, styles.loginButton]}
                  onPress={performLogin}
                  disabled={loading} // Disable the button while loading
                >
                  {loading ? (
                    <ActivityIndicator color={NeutralColors.white} /> // Spinner
                  ) : (
                    <Text style={styles.buttonText}>Login</Text> // Button text
                  )}
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity onPress={toggleForgotPasswordModal}>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        visible={isForgotPasswordModalVisible}
        onRequestClose={toggleForgotPasswordModal}
      />
    </>
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
    borderTopLeftRadius: 10, // Rounded corners
    borderTopRightRadius: 10, // Rounded
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
    fontSize: 24,
    fontWeight: "bold",
  },
  forgotPassword: {
    textAlign: "left",
    fontSize: 16,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 10,
    marginBottom: 40,
  },
});
