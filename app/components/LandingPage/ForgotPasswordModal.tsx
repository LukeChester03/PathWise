// app/components/ResetPasswordModal.tsx
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
import { handleResetPassword } from "../../controllers/ForgotPassword/ResetPasswordController"; // Import reset password handler

interface ResetPasswordModalProps {
  visible: boolean; // Controls modal visibility
  onRequestClose: () => void; // Function to close the modal
}

export default function ForgotPasswordModal({ visible, onRequestClose }: ResetPasswordModalProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const performResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    handleResetPassword(
      email,
      () => {
        // Success callback
        setLoading(false);
        Alert.alert("Success", "Password reset link sent to your email!");
        onRequestClose(); // Close the modal after success
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
      animationType="none"
      onRequestClose={onRequestClose}
    >
      {/* Overlay */}
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Close Button (X) */}
          <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Reset Password</Text>

          {/* Email Input */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor={NeutralColors.gray600}
          />

          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Cancel Button */}
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onRequestClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.button, styles.sendButton]}
              onPress={performResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={NeutralColors.white} />
              ) : (
                <Text style={styles.buttonText}>Send</Text>
              )}
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
    justifyContent: "center", // Center the modal vertically
    alignItems: "center", // Center the modal horizontally
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContent: {
    width: "90%", // Adjust width as needed
    maxWidth: 400, // Limit maximum width
    backgroundColor: Colors.background, // White background for modal content
    borderRadius: 10, // Rounded corners
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
  title: {
    fontSize: 24,
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
    width: "100%",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: Colors.secondary, // Use a secondary color for cancel
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: Colors.primary, // Primary color for send
  },
  cancelButtonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
});
