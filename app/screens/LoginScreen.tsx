// app/screens/LoginScreen.tsx
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
import CurvedDivider from "../components/CurvedDivider"; // Import the curved divider
import { handleLogin } from "../controllers/Login/LoginController"; // Import the login handler

export default function LoginScreen({ navigation }: { navigation: any }) {
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
        navigation.navigate("Home");
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
        {/* Login Form */}
        <View style={styles.formContainer}>
          <Text style={styles.title}>PathWise</Text>
          <Text style={styles.subTitle}>Discover the Past, Unlock the City</Text>
          <Text style={styles.subTitle}>Login</Text>
          {/* Email Input */}
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          {/* Password Input */}
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          {/* Buttons Container */}
          <View style={styles.buttonsContainer}>
            {/* Register Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate("Register")}
              style={styles.registerButton}
            >
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
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
          <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>
        {/* Curved Divider */}
        {/* <CurvedDivider color="#008148" /> */}
        {/* Bottom Half: Colored Section */}
        {/* <View style={styles.bottomHalf} /> */}
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
    // Adjust this value to move the form down
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
  registerButton: {
    flex: 1,
    marginBottom: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  registerButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  forgotPassword: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 10,
  },
});
