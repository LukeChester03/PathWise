// app/components/LandingPage/Register.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
} from "react-native";
import { Colors, NeutralColors } from "../../constants/colours";
import { handleRegister } from "../../controllers/Register/RegisterController";
import { Ionicons } from "@expo/vector-icons"; // Assuming Expo is used

const { height } = Dimensions.get("window");

interface RegisterModalProps {
  visible: boolean;
  onRequestClose: () => void;
  onRegisterSuccess: () => void;
}

export default function RegisterModal({
  visible,
  onRequestClose,
  onRegisterSuccess,
}: RegisterModalProps) {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Password strength indicators
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Animation
  const slideAnim = useRef(new Animated.Value(height)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPasswordStrength(0);

      // Start animations
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations when modal closes
      slideAnim.setValue(height);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  // Check password strength
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    // Length check
    if (password.length >= 8) strength += 1;
    // Uppercase check
    if (/[A-Z]/.test(password)) strength += 1;
    // Lowercase check
    if (/[a-z]/.test(password)) strength += 1;
    // Number check
    if (/[0-9]/.test(password)) strength += 1;
    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;

    setPasswordStrength(strength);
  }, [password]);

  const performRegister = async () => {
    // Form validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your name");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }
    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (passwordStrength < 3) {
      Alert.alert("Weak Password", "Please create a stronger password");
      return;
    }

    setLoading(true);
    handleRegister(
      name,
      email,
      password,
      confirmPassword,
      () => {
        setLoading(false);
        Alert.alert("Success", "Your account has been created!");
        onRegisterSuccess();
      },
      (errorMessage: string) => {
        setLoading(false);
        Alert.alert("Error", errorMessage);
      }
    );
  };

  const closeModal = () => {
    // Animate closing
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRequestClose();
    });
  };

  // Get color for password strength indicator
  const getStrengthColor = (index: number) => {
    if (passwordStrength === 0) return NeutralColors.gray300;
    if (index < passwordStrength) {
      if (passwordStrength <= 2) return "#F59E0B"; // Yellow for weak
      if (passwordStrength <= 3) return "#10B981"; // Green for medium
      return "#3B82F6"; // Blue for strong
    }
    return NeutralColors.gray300;
  };

  // Get text for password strength
  const getStrengthText = () => {
    if (passwordStrength === 0) return "";
    if (passwordStrength <= 2) return "Weak";
    if (passwordStrength <= 3) return "Medium";
    return "Strong";
  };

  return (
    <Modal
      animationType="none" // We'll handle animation ourselves
      transparent={true}
      visible={visible}
      onRequestClose={closeModal}
    >
      <TouchableWithoutFeedback onPress={closeModal}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.keyboardAvoidingView}
            >
              <Animated.View
                style={[styles.modalContainer, { transform: [{ translateY: slideAnim }] }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.title}>Create Account</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
                    <Ionicons name="close" size={24} color={Colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                  <View style={styles.formContainer}>
                    {/* Name Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Full Name</Text>
                      <View
                        style={[styles.inputWrapper, nameFocused && styles.inputWrapperFocused]}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={nameFocused ? Colors.primary : NeutralColors.gray600}
                        />
                        <TextInput
                          value={name}
                          onChangeText={setName}
                          style={styles.input}
                          placeholderTextColor={NeutralColors.gray400}
                        />
                      </View>
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <View
                        style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={20}
                          color={emailFocused ? Colors.primary : NeutralColors.gray600}
                        />
                        <TextInput
                          value={email}
                          onChangeText={setEmail}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          style={styles.input}
                          placeholderTextColor={NeutralColors.gray400}
                        />
                      </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <View
                        style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={passwordFocused ? Colors.primary : NeutralColors.gray600}
                        />
                        <TextInput
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          style={styles.input}
                          placeholderTextColor={NeutralColors.gray400}
                        />
                        <TouchableOpacity
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={NeutralColors.gray600}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Password Strength Indicator */}
                      {password.length > 0 && (
                        <View style={styles.strengthContainer}>
                          <View style={styles.strengthBars}>
                            {[1, 2, 3, 4, 5].map((index) => (
                              <View
                                key={index}
                                style={[
                                  styles.strengthBar,
                                  { backgroundColor: getStrengthColor(index) },
                                ]}
                              />
                            ))}
                          </View>
                          <Text style={styles.strengthText}>{getStrengthText()}</Text>
                        </View>
                      )}
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Confirm Password</Text>
                      <View
                        style={[
                          styles.inputWrapper,
                          confirmPasswordFocused && styles.inputWrapperFocused,
                          confirmPassword &&
                            password !== confirmPassword &&
                            styles.inputWrapperError,
                        ]}
                      >
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={confirmPasswordFocused ? Colors.primary : NeutralColors.gray600}
                        />
                        <TextInput
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          style={styles.input}
                          placeholderTextColor={NeutralColors.gray400}
                        />
                        <TouchableOpacity
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeIcon}
                        >
                          <Ionicons
                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={NeutralColors.gray600}
                          />
                        </TouchableOpacity>
                      </View>
                      {confirmPassword && password !== confirmPassword && (
                        <Text style={styles.errorText}>Passwords do not match</Text>
                      )}
                    </View>

                    {/* Register Button */}
                    <TouchableOpacity
                      style={styles.registerButton}
                      onPress={performRegister}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.registerButtonText}>Create Account</Text>
                      )}
                    </TouchableOpacity>

                    {/* Terms & Conditions */}
                    <Text style={styles.termsText}>
                      By creating an account, you agree to our{" "}
                      <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </Text>
                  </View>
                </ScrollView>
              </Animated.View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    maxHeight: height * 0.9, // Ensure modal doesn't take up more than 90% of the screen
  },
  scrollView: {
    maxHeight: height * 0.75,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    width: "100%",
    paddingBottom: 20,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: NeutralColors.gray300,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    backgroundColor: NeutralColors.white,
  },
  inputWrapperFocused: {
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: "#EF4444", // Red for error
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: Colors.text,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  strengthContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  strengthBars: {
    flexDirection: "row",
    flex: 1,
    marginRight: 10,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "500",
    color: NeutralColors.gray600,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: 4,
  },
  registerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 54,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  termsText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 12,
    color: NeutralColors.gray600,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: "500",
  },
});
