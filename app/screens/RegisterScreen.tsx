// app/screens/RegisterScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Colors, NeutralColors } from "../constants/colours";
import { handleRegister } from "../controllers/Register/RegisterController"; // Import the register handler

export default function RegisterScreen({ navigation }: { navigation: any }) {
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
        navigation.navigate("Login");
      },
      (errorMessage: string) => {
        // Error callback
        setLoading(false);
        Alert.alert("Error", errorMessage);
      }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        {/* Registration Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>PathWise</Text>
          <Text style={styles.subTitle}>Discover the Past, Unlock the City</Text>
          <Text style={styles.subTitle}>Register</Text>
          {/* Name Input */}
          <TextInput
            placeholder="Full Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor={NeutralColors.gray600}
            style={styles.input}
          />
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
          {/* Confirm Password Input */}
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={NeutralColors.gray600}
            style={styles.input}
          />
          {/* Register Button */}
          <TouchableOpacity
            onPress={performRegister}
            style={[styles.button, styles.registerButton]}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? <ActivityIndicator color={NeutralColors.white} /> : "Register"}
            </Text>
          </TouchableOpacity>
          {/* Login Link */}
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginText}>
              Already have an account? <Text style={styles.loginLink}>Login</Text>
            </Text>
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
    marginTop: 50,
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
  registerButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  loginText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 10,
  },
  loginLink: {
    color: Colors.primary,
    fontWeight: "bold",
  },
});
