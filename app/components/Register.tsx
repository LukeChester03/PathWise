// app/components/RegisterModal.tsx
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
  KeyboardAvoidingView, // Import this for handling keyboard behavior
  Platform, // Import this to handle platform-specific behavior
} from "react-native";
import { Colors, NeutralColors } from "../constants/colours";
import { handleRegister } from "../controllers/Register/RegisterController";
import { Button } from "./Global/Button";

interface RegisterModalProps {
  visible: boolean; // Controls modal visibility
  onRequestClose: () => void; // Function to close the modal
  onRegisterSuccess: () => void; // Callback for successful registration
}

export default function RegisterModal({
  visible,
  onRequestClose,
  onRegisterSuccess,
}: RegisterModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const performRegister = async () => {
    setLoading(true);
    handleRegister(
      name,
      email,
      password,
      confirmPassword,
      () => {
        // Success callback
        setLoading(false);
        Alert.alert("Success", "Account created successfully!");
        onRegisterSuccess(); // Trigger the success callback
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
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onRequestClose}
    >
      {/* KeyboardAvoidingView to handle keyboard behavior */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"} // Adjust behavior based on platform
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Close Button (X) */}
            <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>

            {/* Register Title */}
            <Text style={styles.subTitle}>Register</Text>

            {/* Name Input */}
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor={NeutralColors.gray600}
            />

            {/* Email Input */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              placeholderTextColor={NeutralColors.gray600}
            />

            {/* Password Input */}
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={NeutralColors.gray600}
            />

            {/* Confirm Password Input */}
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor={NeutralColors.gray600}
            />

            {/* Register Button */}
            <Button
              title="Register"
              style={[styles.button, styles.registerButton]}
              onPress={performRegister}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Styles
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end", // Align modal to the bottom of the screen
    alignItems: "center",
  },
  modalContent: {
    width: "100%", // Adjust width as needed
    maxWidth: 400, // Limit maximum width
    backgroundColor: Colors.background, // White background for modal content
    borderTopEndRadius: 10, // Rounded corners
    borderTopStartRadius: 10, // Rounded corners
    padding: 20, // Padding inside the modal
    alignItems: "center", // Center content horizontally
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
    width: "100%",
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 15,
    width: "100%",
  },
  registerButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 32,
    fontWeight: "bold",
  },
});
