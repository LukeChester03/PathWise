# PathWise 🚀

PathWise is a modern mobile application designed to help users navigate their journeys efficiently. Whether you're planning a trip or exploring new routes, PathWise provides intuitive tools and features to make your experience seamless.

This project is built using [Expo](https://expo.dev) and React Native, leveraging modern development practices to deliver a cross-platform app for iOS and Android.

---

## Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Setup Instructions](#setup-instructions)
4. [Running the App](#running-the-app)
5. [Project Structure](#project-structure)
6. [Contributing](#contributing)
7. [Resources](#resources)

---

## Features

- **User Authentication**: Secure login and registration using Firebase.
- **Dynamic Routing**: Plan and visualize routes with ease.
- **Real-Time Updates**: Stay informed with real-time data synchronization.
- **Customizable Themes**: Light and dark mode support for user preference.
- **Cross-Platform**: Runs seamlessly on both iOS and Android.

---

## Prerequisites

Before setting up the project, ensure you have the following installed:

1. **Node.js**: [Download and install Node.js](https://nodejs.org/).
2. **Expo CLI**: Install globally using npm:
   _npm install -g expo-cli_

Setup Instructions

1. Clone the Repository
   Clone the PathWise repository to your local machine:
   _git clone https://github.com/your-username/PathWise.git_
   _cd pathwise_

2. Install Dependencies
   Install all required dependencies using npm:
   _npm install_

3. Running the App
   Start the Development Server
   Run the following command to start the Expo development server:
   npx expo start

4. Project Structure
   The project follows a modular structure for better maintainability:
   pathwise/
   ├── app/ # Core application logic
   │ ├── \_layout.tsx # Navigation stack configuration
   │ ├── index.tsx # Entry point of the app
   │ ├── screens/ # Screen components (e.g., LoginScreen, RegisterScreen)
   │ ├── config/ # Configuration files (e.g., Firebase setup)
   │ ├── utils/ # Utility functions and constants (e.g., colours.ts)
   │ └── navigation/ # Navigation-related files (e.g., types.ts)
   ├── assets/ # Static assets (images, fonts, etc.)
   ├── package.json # Project dependencies and scripts
   └── README.md # This file

**Resources**
Expo Documentation : https://docs.expo.dev/
React Navigation : https://reactnavigation.org/
Firebase Documentation : https://firebase.google.com/docs
React Native Styling : https://reactnative.dev/docs/style
