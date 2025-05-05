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
import { handleResetPassword } from "../../controllers/ForgotPassword/ResetPasswordController";

interface ResetPasswordModalProps {
  visible: boolean;
  onRequestClose: () => void;
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
        setLoading(false);
        Alert.alert("Success", "Password reset link sent to your email!");
        onRequestClose();
      },
      (errorMessage: string) => {
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Reset Password</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholderTextColor={NeutralColors.gray600}
          />

          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onRequestClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
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
    backgroundColor: Colors.secondary,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: Colors.primary,
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
