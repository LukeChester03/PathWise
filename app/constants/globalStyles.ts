import { StyleSheet } from "react-native";
import { Colors, NeutralColors } from "./colours";

export const globalStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  formContainer: {
    marginTop: 50,
    width: "80%",
    maxWidth: 400,
    alignSelf: "center",
    padding: 20,
    backgroundColor: Colors.background,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  // Text Styles
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
  inputLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },

  // Input Styles
  input: {
    height: 50,
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#fafafa",
  },

  // Button Styles
  button: {
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
  },
  buttonText: {
    color: NeutralColors.white,
    fontSize: 16,
    fontWeight: "bold",
  },

  // Link Styles
  linkText: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.text,
    opacity: 0.7,
    marginTop: 10,
  },
  link: {
    color: Colors.primary,
    fontWeight: "bold",
  },
});
