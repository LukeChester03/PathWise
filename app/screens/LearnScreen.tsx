import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  StatusBar,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { collection, getDocs } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { globalStyles } from "../constants/globalStyles";
import { Colors, NeutralColors } from "../constants/colours";
import ScreenWithNavBar from "../components/Global/ScreenWithNavbar";
import Header from "../components/Global/Header";
import PlacesCarousel from "../components/Places/PlacesCarousel";
import AiTravelSnapshot from "../components/LearnScreen/AiTravelSnapshot";
import { TravelProfile } from "../types/LearnScreen/TravelProfileTypes";
import LanguageAssistant from "../components/LearnScreen/LanguageAssistant";
import LearnIntroOverlay from "../components/LearnScreen/LearnIntroOverlayComponent";

const { width, height } = Dimensions.get("window");

// Mock data for when Firestore doesn't return places
const mockPlaces = [
  {
    id: "mock1",
    place_id: "mock1",
    name: "Eiffel Tower",
    location: "Paris, France",
    rating: 4.8,
    visitDate: "March 2, 2025",
    visitedAt: new Date(),
    isVisited: true,
    images: [
      {
        uri: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&q=80&w=1000",
      },
    ],
    placeType: "landmark",
    category: "architectural",
    tags: ["landmark", "historical", "architectural", "tourist"],
    description: "Iconic iron lattice tower on the Champ de Mars",
  },
  {
    id: "mock2",
    place_id: "mock2",
    name: "Colosseum",
    location: "Rome, Italy",
    rating: 4.7,
    visitDate: "February 15, 2025",
    visitedAt: new Date(),
    isVisited: true,
    images: [
      {
        uri: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1000",
      },
    ],
    placeType: "historical",
    category: "ancient",
    tags: ["historical", "ancient", "roman", "ruins"],
    description: "Ancient Roman amphitheatre in the center of Rome",
  },
  {
    id: "mock3",
    place_id: "mock3",
    name: "Louvre Museum",
    location: "Paris, France",
    rating: 4.9,
    visitDate: "March 5, 2025",
    visitedAt: new Date(),
    isVisited: true,
    images: [
      {
        uri: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&q=80&w=1000",
      },
    ],
    placeType: "museum",
    category: "cultural",
    tags: ["museum", "art", "historical", "cultural", "indoor"],
    description: "World's largest art museum and historic monument in Paris",
  },
];

// Enhanced mock data for AI features
const mockAiData = {
  // Feature 1: AI Travel Snapshot
  travelProfile: {
    type: "Cultural Explorer",
    description:
      "You have a strong preference for places with historical and cultural significance.",
    level: "Enthusiast",
    completionPercentage: 68,
    badges: ["History Buff", "Architecture Enthusiast", "Museum Maven"],
    streak: 7, // Days of consecutive exploration
  },

  // Feature 2: Language Assistant
  localPhrases: [
    {
      language: "French",
      phrase: "Je voudrais visiter le musée",
      translation: "I would like to visit the museum",
      useContext: "When asking for directions",
      pronunciation: "Zhuh voo-dray vee-zee-tay luh moo-zay",
    },
    {
      language: "Italian",
      phrase: "Dov'è il Colosseo?",
      translation: "Where is the Colosseum?",
      useContext: "When asking for directions",
      pronunciation: "Doh-veh eel ko-lo-say-oh",
    },
    {
      language: "Italian",
      phrase: "Quanto costa il biglietto?",
      translation: "How much is the ticket?",
      useContext: "When buying entrance tickets",
      pronunciation: "Kwan-toh kos-tah eel bee-lyet-toh",
    },
    {
      language: "French",
      phrase: "C'est magnifique!",
      translation: "It's magnificent!",
      useContext: "When admiring landmarks",
      pronunciation: "Say mag-nee-feek",
    },
  ],

  // Feature 3: AI-Recommended Destinations
  recommendedPlaces: [
    {
      name: "Vatican Museums",
      location: "Vatican City",
      reason: "Based on your interest in historical art collections",
      distance: "1,435 km",
      image: {
        uri: "https://images.unsplash.com/photo-1577634081742-309a48ab9b6b?auto=format&fit=crop&q=80&w=1000",
      },
      matchPercentage: 92,
    },
    {
      name: "British Museum",
      location: "London, UK",
      reason: "Matches your exploration of classical artifacts",
      distance: "340 km",
      image: {
        uri: "https://images.unsplash.com/photo-1605972088248-4af23be1d9e8?auto=format&fit=crop&q=80&w=1000",
      },
      matchPercentage: 87,
    },
    {
      name: "Palace of Versailles",
      location: "Versailles, France",
      reason: "Complements your interest in French architecture",
      distance: "20 km",
      image: {
        uri: "https://images.unsplash.com/photo-1597584854944-57b54d0f0f0f?auto=format&fit=crop&q=80&w=1000",
      },
      matchPercentage: 89,
    },
  ],

  // Feature 4: Cultural Context
  culturalInsights: [
    {
      region: "Rome",
      customs: [
        {
          title: "Aperitivo",
          description: "Pre-dinner drinks with light snacks, usually between 7-9 PM",
        },
        {
          title: "Siesta",
          description: "Many shops close in the afternoon from approximately 1-4 PM",
        },
        {
          title: "Dress Code",
          description: "Modest attire required when visiting religious sites",
        },
      ],
      etiquette:
        "When entering small shops, greet with 'Buongiorno' (good day) or 'Buonasera' (good evening)",
      diningTips: "Tipping is not expected, but rounding up the bill is appreciated",
    },
    {
      region: "Paris",
      customs: [
        {
          title: "Greeting",
          description:
            "The 'la bise' (cheek kiss) is common among friends, but handshakes are for formal situations",
        },
        {
          title: "Dining Hours",
          description: "Lunch from 12-2 PM, dinner typically starts at 8 PM",
        },
        {
          title: "Museum Closures",
          description: "Many museums close on Tuesdays instead of Mondays",
        },
      ],
      etiquette:
        "Always greet shop staff with 'Bonjour' when entering and 'Au revoir' when leaving",
      diningTips: "Bread is placed directly on the table, not on a bread plate",
    },
  ],

  // Feature 5: Advanced Travel Analysis
  travelInsights: {
    visitFrequency: {
      weekdays: {
        most: "Saturday",
        percentage: 45,
        insight: "You're a weekend explorer, making the most of your free time",
      },
      timeOfDay: {
        most: "Afternoon",
        percentage: 68,
        insight: "You prefer visiting attractions during less crowded afternoon hours",
      },
      season: {
        most: "Spring",
        percentage: 50,
        insight: "Your exploration peaks during comfortable spring weather",
      },
    },
    visitation: {
      averageDuration: "2.5 hours",
      averageDistance: "12 km",
      mostVisitedCity: "Paris",
    },
    patterns: [
      "You typically visit multiple related sites on the same day",
      "You show a preference for outdoor landmarks in the morning and indoor museums in the afternoon",
      "Your visits often follow historical chronology, from ancient to modern",
    ],
  },

  // Feature 6: Travel Preferences
  preferences: {
    categories: [
      { name: "Historical Sites", percentage: 80, icon: "business" },
      { name: "Urban Exploration", percentage: 65, icon: "map" },
      { name: "Cultural Venues", percentage: 60, icon: "color-palette" },
      { name: "Natural Settings", percentage: 35, icon: "leaf" },
      { name: "Religious Sites", percentage: 55, icon: "home" },
    ],
    architecturalStyles: [
      { name: "Classical", percentage: 70 },
      { name: "Renaissance", percentage: 65 },
      { name: "Gothic", percentage: 55 },
      { name: "Modern", percentage: 25 },
      { name: "Baroque", percentage: 60 },
    ],
    activities: [
      { name: "Guided Tours", percentage: 45 },
      { name: "Self-Guided Exploration", percentage: 85 },
      { name: "Photography", percentage: 70 },
      { name: "Local Cuisine", percentage: 50 },
      { name: "Historical Research", percentage: 65 },
    ],
  },

  // Feature 7: Knowledge Quest Game
  knowledgeQuest: {
    currentQuestions: [
      {
        question: "When was the Eiffel Tower completed?",
        options: ["1799", "1889", "1910", "1925"],
        correctAnswer: 1,
        difficulty: "medium",
        image: {
          uri: "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&q=80&w=1000",
        },
        explanation:
          "The Eiffel Tower was completed in 1889 for the Exposition Universelle (World's Fair) marking the 100th anniversary of the French Revolution.",
      },
      {
        question: "Which emperor initiated the construction of the Colosseum?",
        options: ["Julius Caesar", "Augustus", "Vespasian", "Constantine"],
        correctAnswer: 2,
        difficulty: "hard",
        image: {
          uri: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1000",
        },
        explanation:
          "Emperor Vespasian commissioned the Colosseum in 72 AD. It was completed by his son Titus in 80 AD.",
      },
      {
        question: "In which wing of the Louvre is the Mona Lisa displayed?",
        options: ["Richelieu", "Sully", "Denon", "Napoleon"],
        correctAnswer: 2,
        difficulty: "hard",
        image: {
          uri: "https://images.unsplash.com/photo-1565099824688-e93eb20fe622?auto=format&fit=crop&q=80&w=1000",
        },
        explanation:
          "Leonardo da Vinci's Mona Lisa is displayed in the Denon Wing of the Louvre Museum.",
      },
    ],
    statistics: {
      questionsAnswered: 24,
      correctAnswers: 18,
      accuracy: 75,
      streakRecord: 8,
      currentStreak: 3,
      lastPlayed: "2 days ago",
    },
    rewards: {
      currentPoints: 1250,
      nextMilestone: 1500,
      nextReward: "Cultural Connoisseur Badge",
      badges: ["Novice Explorer", "History Enthusiast"],
    },
  },

  // Feature 8: AI Discovery Challenges
  discoveryChallenges: {
    active: [
      {
        id: "challenge1",
        title: "Parisian Architectural Journey",
        description: "Discover 3 distinct architectural styles within 2km of your location",
        difficulty: "Medium",
        duration: "3-4 hours",
        points: 150,
        progress: 67,
        locations: [
          { name: "Eiffel Tower", completed: true, style: "Iron Lattice" },
          { name: "Notre-Dame Cathedral", completed: true, style: "Gothic" },
          { name: "Sacré-Cœur Basilica", completed: false, style: "Romano-Byzantine" },
        ],
        reward: "Architectural Visionary Badge",
      },
      {
        id: "challenge2",
        title: "Roman Empire Expedition",
        description: "Visit 3 sites showcasing Rome's imperial power",
        difficulty: "Hard",
        duration: "1-2 days",
        points: 250,
        progress: 33,
        locations: [
          { name: "Colosseum", completed: true, era: "Imperial" },
          { name: "Roman Forum", completed: false, era: "Republican/Imperial" },
          { name: "Pantheon", completed: false, era: "Imperial" },
        ],
        reward: "Roman Scholar Badge + 500 points",
      },
    ],
    suggested: [
      {
        id: "challenge3",
        title: "Hidden Paris",
        description: "Explore 4 overlooked gems that tourists often miss",
        difficulty: "Easy",
        duration: "Half-day",
        points: 100,
        locations: [
          "Rue Crémieux",
          "Musée de la Chasse et de la Nature",
          "Promenade Plantée",
          "Belleville",
        ],
      },
      {
        id: "challenge4",
        title: "Renaissance Masterpieces",
        description: "Discover 5 Renaissance works in the Louvre from different Italian masters",
        difficulty: "Medium",
        duration: "2-3 hours",
        points: 150,
        locations: [
          "Mona Lisa (da Vinci)",
          "The Wedding at Cana (Veronese)",
          "St. Francis of Assisi (Giotto)",
          "The Pastoral Concert (Titian)",
          "Apollo and Daphne (Bernini)",
        ],
      },
    ],
    completedRecent: [
      {
        id: "challenge5",
        title: "Flavors of Italy",
        description: "Sample 3 authentic Roman dishes in their traditional settings",
        difficulty: "Easy",
        completedDate: "February 17, 2025",
        points: 100,
        earnedReward: "Culinary Explorer Badge",
      },
    ],
  },
};

const LearnScreen = ({ route, navigation }) => {
  const [selectedPlaceId, setSelectedPlaceId] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [showAiExplanation, setShowAiExplanation] = useState(false);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [noPlacesFound, setNoPlacesFound] = useState(false);
  const [error, setError] = useState(null);
  const [useMockData, setUseMockData] = useState(false);
  const [showLearnIntro, setShowLearnIntro] = useState(false);

  // Knowledge Quest game state
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [showQuizResults, setShowQuizResults] = useState(false);

  // Challenge state
  const [expandedChallenge, setExpandedChallenge] = useState(null);

  //Travel profile
  const [travelProfile, setTravelProfile] = useState<TravelProfile | null>(null);

  // Feature expansion states
  const [expandedFeatures, setExpandedFeatures] = useState({
    travelProfile: false,
    culturalInsights: false,
    travelAnalysis: false,
  });

  const handleProfileUpdated = (profile: TravelProfile) => {
    setTravelProfile(profile);
    console.log("Travel profile updated:", profile.type);

    // You can use the profile data to update other parts of your UI
    // For example, you could update recommendations based on travel preferences

    // If you want to persist this information:
    // You could save it to local storage or your backend
  };
  // Create separate animation values to avoid conflicts
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const explanationAnim = useRef(new Animated.Value(0)).current;
  const cardAnimations = useRef({
    travelSnapshot: new Animated.Value(0),
    languageAssistant: new Animated.Value(0),
    recommendations: new Animated.Value(0),
    cultural: new Animated.Value(0),
    analysis: new Animated.Value(0),
    preferences: new Animated.Value(0),
    quest: new Animated.Value(0),
    challenges: new Animated.Value(0),
  }).current;

  // Fetch user's visited places from Firestore
  useEffect(() => {
    console.log("LearnScreen mounted - fetching places");
    fetchUserVisitedPlaces();
  }, []);

  // Run entrance animations when component mounts
  useEffect(() => {
    console.log("Starting entrance animations");
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered animations for each card
    const animations = Object.keys(cardAnimations).map((key, index) => {
      return Animated.timing(cardAnimations[key], {
        toValue: 1,
        duration: 500,
        delay: 100 + index * 100, // Stagger effect
        useNativeDriver: true,
      });
    });

    Animated.stagger(50, animations).start();
  }, []);

  // Create pulsing animation for AI badge
  useEffect(() => {
    console.log("Starting pulse animation");
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(pulse);
    pulseLoop.start();

    return () => {
      pulseLoop.stop();
      pulseAnim.setValue(1);
    };
  }, []);

  // Animation for AI explanation panel - using a separate animation value
  useEffect(() => {
    console.log("AI explanation toggled:", showAiExplanation);
    if (showAiExplanation) {
      Animated.timing(explanationAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(explanationAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [showAiExplanation]);

  const fetchUserVisitedPlaces = async () => {
    try {
      setLoadingPlaces(true);
      setNoPlacesFound(false);
      setError(null);
      console.log("Attempting to fetch visited places");

      // Check if user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        console.log("No authenticated user found");
        setUseMockData(true);
        setVisitedPlaces(mockPlaces);
        setNoPlacesFound(false);
        setLoadingPlaces(false);
        return;
      }

      try {
        // visitedPlaces is a subcollection under the user document
        const userVisitedPlacesRef = collection(db, "users", currentUser.uid, "visitedPlaces");
        const querySnapshot = await getDocs(userVisitedPlacesRef);

        console.log("Firestore query complete with", querySnapshot.size, "documents");

        if (querySnapshot.empty) {
          console.log("No visited places found in Firestore - using mock data");
          setUseMockData(true);
          setVisitedPlaces(mockPlaces);
          setNoPlacesFound(false);
        } else {
          // Transform Firestore documents to place objects
          const userPlacesData = querySnapshot.docs
            .filter((doc) => {
              // Filter out the initialization document
              const data = doc.data();
              return !data._isInitDocument;
            })
            .map((doc) => {
              const data = doc.data();
              console.log("Processing place:", data.name || doc.id);

              return {
                ...data, // Keep all original properties
                id: doc.id,
                place_id: data.place_id || doc.id,
                name: data.name || "Unknown Place",
                location: data.vicinity || data.location || "",
                description: data.description || "",
                geometry: data.geometry,
                photos: data.photos || [],
                images: data.photos
                  ? [
                      {
                        uri:
                          data.photos[0]?.photo_reference ||
                          "https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?q=80&w=1000",
                      },
                    ]
                  : [
                      {
                        uri: "https://images.unsplash.com/photo-1610016302534-6f67f1c968d8?q=80&w=1000",
                      },
                    ],
                rating: data.rating || 4.5,
                visitedAt: data.visitedAt,
                visitDate: data.visitedAt
                  ? new Date(data.visitedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "Recently",
                isVisited: true, // Explicitly mark as visited
              };
            });

          console.log(`Found ${userPlacesData.length} places in Firestore (excluding init doc)`);

          if (userPlacesData.length === 0) {
            console.log("No valid places found - using mock data");
            setUseMockData(true);
            setVisitedPlaces(mockPlaces);
            setNoPlacesFound(false);
          } else {
            setVisitedPlaces(userPlacesData);
            setNoPlacesFound(false);
          }
        }
      } catch (firestoreError) {
        console.error("Firestore error:", firestoreError);
        setUseMockData(true);
        setVisitedPlaces(mockPlaces);
        setNoPlacesFound(false);
      }

      setLoadingPlaces(false);
    } catch (error) {
      console.error("Error in fetchUserVisitedPlaces:", error);
      setError("Failed to load your visited places");
      setUseMockData(true);
      setVisitedPlaces(mockPlaces);
      setNoPlacesFound(false);
      setLoadingPlaces(false);
    }
  };

  // Mock AI-generated content (would be fetched from Gemini API in a real app)
  const getPlaceDetails = (place) => {
    // This would be replaced with actual Gemini API call
    const defaultDetails = {
      description: `${place.name} is a popular destination that offers visitors a unique experience. This location has been visited by people from around the world.`,
      facts: [
        "This place has historical significance dating back many decades",
        "Visitors often spend around 2-3 hours exploring all the features",
        "Local culture has been significantly influenced by this landmark",
      ],
      yearBuilt: "Unknown",
      architect: "Unknown",
      visitors: "Many annually",
      aiThoughts:
        "This location represents a significant cultural and historical landmark. Its architecture and significance have made it a destination worthy of exploration and study.",
    };

    // For demonstration, customize for known landmarks
    if (place.name.includes("Eiffel") || place.name.includes("Tower")) {
      return {
        description:
          "The Eiffel Tower is a wrought-iron lattice tower on the Champ de Mars in Paris, France. Named after engineer Gustave Eiffel, it has become a global cultural icon of France and one of the world's most recognizable structures.",
        facts: [
          "The tower is 330 meters (1,083 ft) tall, about the same height as an 81-story building",
          "It was the tallest man-made structure in the world for 41 years until 1930",
          "During cold weather, the tower shrinks by about 6 inches (15 cm)",
        ],
        yearBuilt: "1889",
        architect: "Gustave Eiffel",
        visitors: "7 million annually",
        aiThoughts:
          "This iconic structure represents Parisian innovation during the industrial revolution. The tower's enduring popularity showcases how engineering marvels can transcend their utilitarian origins to become cultural touchstones.",
      };
    } else if (place.name.includes("Statue") || place.name.includes("Liberty")) {
      return {
        description:
          "The Statue of Liberty is a colossal neoclassical sculpture on Liberty Island in New York Harbor. A gift from the people of France, it was designed by French sculptor Frédéric Auguste Bartholdi and its metal framework was built by Gustave Eiffel.",
        facts: [
          "The statue is 305 feet tall from ground to torch",
          "The seven rays on her crown represent the seven continents and seas",
          "It was dedicated on October 28, 1886",
        ],
        yearBuilt: "1886",
        architect: "Frédéric Auguste Bartholdi",
        visitors: "4.5 million annually",
        aiThoughts:
          "Lady Liberty represents the enduring friendship between France and the United States while symbolizing freedom and democracy. The statue's iconic silhouette has welcomed millions of immigrants, becoming a global symbol of hope and opportunity.",
      };
    } else if (place.name.includes("Colosseum") || place.name.includes("Rome")) {
      return {
        description:
          "The Colosseum is an oval amphitheatre in the center of Rome, Italy. It is the largest ancient amphitheatre ever built and remains the largest standing amphitheatre in the world today, despite its age.",
        facts: [
          "Construction began under emperor Vespasian in 72 AD and completed in 80 AD",
          "It could hold an estimated 50,000 to 80,000 spectators",
          "It was used for gladiatorial contests and public spectacles",
        ],
        yearBuilt: "70-80 AD",
        architect: "Vespasian",
        visitors: "6 million annually",
        aiThoughts:
          "The Colosseum stands as a testament to Roman engineering prowess. Its sophisticated design included features like the hypogeum, velarium, and travertine facade, showcasing advanced architectural knowledge that influenced structures for millennia.",
      };
    } else if (place.name.includes("Louvre")) {
      return {
        description:
          "The Louvre Museum is the world's largest art museum and a historic monument in Paris, France. A central landmark of the city, it is located on the Right Bank of the Seine.",
        facts: [
          "The museum houses approximately 38,000 objects from prehistory to the 21st century",
          "The Louvre Palace was originally built as a fortress in the late 12th century",
          "It became a public museum during the French Revolution in 1793",
        ],
        yearBuilt: "12th century (original fortress), 1989 (glass pyramid)",
        architect: "Various, including I.M. Pei (pyramid)",
        visitors: "9.6 million annually",
        aiThoughts:
          "The Louvre represents the pinnacle of artistic achievement across multiple civilizations. Its transformation from royal palace to public institution embodies the democratization of culture. The juxtaposition of classical architecture with I.M. Pei's modern pyramid symbolizes the dialogue between tradition and innovation.",
      };
    }

    return defaultDetails;
  };

  // Handle place selection
  const handlePlaceSelect = (placeId, place) => {
    console.log("Place selected:", placeId, place?.name);
    setLoading(true);
    setSelectedPlaceId(placeId);
    setSelectedPlace(place);
    setShowAiExplanation(false);

    // Simulate API call to Gemini AI
    setTimeout(() => {
      setLoading(false);
      // Reset animations for new content
      fadeAnim.setValue(0);
      slideAnim.setValue(50);

      // Start animations for new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-show AI explanation after a short delay
      setTimeout(() => {
        setShowAiExplanation(true);
      }, 1500);
    }, 1500);
  };

  const handleBackPress = () => {
    console.log("Back button pressed");
    setSelectedPlaceId(null);
    setSelectedPlace(null);
    // Reset game state when navigating back
    setActiveQuestion(null);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    setShowQuizResults(false);
  };

  // Handle Knowledge Quest selection
  const handleStartQuiz = () => {
    // Start with the first question
    setActiveQuestion(0);
    setSelectedAnswer(null);
    setAnswerSubmitted(false);
    setShowQuizResults(false);
  };

  const handleAnswerSelect = (answerIndex) => {
    if (!answerSubmitted) {
      setSelectedAnswer(answerIndex);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer !== null && !answerSubmitted) {
      setAnswerSubmitted(true);

      // Show results briefly, then move to next question or finish
      setTimeout(() => {
        if (activeQuestion < mockAiData.knowledgeQuest.currentQuestions.length - 1) {
          setActiveQuestion(activeQuestion + 1);
          setSelectedAnswer(null);
          setAnswerSubmitted(false);
        } else {
          setShowQuizResults(true);
        }
      }, 2000);
    }
  };

  // Toggle feature expansion
  const toggleFeatureExpansion = (feature) => {
    setExpandedFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }));
  };

  // Handle challenge expansion
  const toggleChallengeExpansion = (challengeId) => {
    if (expandedChallenge === challengeId) {
      setExpandedChallenge(null);
    } else {
      setExpandedChallenge(challengeId);
    }
  };

  const handleModal = () => {
    console.log("Opening Learn intro modal");
    setShowLearnIntro(true);
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyStateCard}>
        <LinearGradient
          colors={["rgba(255,255,255,0.5)", "rgba(240,240,255,0.8)"]}
          style={styles.emptyStateGradient}
        />

        {/* Background decoration */}
        <View style={styles.emptyStateDecoration}>
          <View style={[styles.decorationCircle, styles.circle1]} />
          <View style={[styles.decorationCircle, styles.circle2]} />
          <View style={[styles.decorationCircle, styles.circle3]} />
        </View>

        <View style={styles.emptyStateContent}>
          <View style={styles.emptyStateIconContainer}>
            <Ionicons name="book-outline" size={40} color={Colors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>No Places to Learn About</Text>
          <Text style={styles.emptyStateMessage}>
            Visit some places first, then come back to discover AI-powered insights about your
            travels!
          </Text>

          <TouchableOpacity
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate("Explore")}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.emptyStateButtonText}>Explore Places</Text>
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPlaceDetails = () => {
    if (!selectedPlace) {
      console.log("No selected place found for details view");
      return null;
    }

    console.log("Rendering details for place:", selectedPlace.name);
    const details = getPlaceDetails(selectedPlace);

    return (
      <ScrollView style={styles.detailsContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.detailsContent,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ImageBackground
            source={selectedPlace.images[0]}
            style={styles.placeImage}
            imageStyle={styles.placeImageStyle}
            resizeMode="cover"
          >
            <View style={styles.imageDarkOverlay}>
              <View style={styles.placeHeaderContent}>
                <Text style={styles.placeNameOverlay}>{selectedPlace.name}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location" size={16} color="white" />
                  <Text style={styles.placeLocationOverlay}>{selectedPlace.location}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.detailsCard}>
            <View style={styles.visitInfoRow}>
              <View style={styles.visitDateContainer}>
                <Ionicons name="calendar" size={20} color={Colors.primary} />
                <Text style={styles.visitDateText}>Visited on {selectedPlace.visitDate}</Text>
              </View>

              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={20} color="#FFC107" />
                <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
              </View>
            </View>

            <View style={styles.aiContentCard}>
              <View style={styles.aiLabelRow}>
                <Animated.View
                  style={[
                    styles.aiLabelContainer,
                    {
                      transform: [{ scale: pulseAnim }],
                    },
                  ]}
                >
                  <Ionicons name="flash" size={16} color={Colors.primary} />
                  <Text style={styles.aiLabel}>AI-Powered Insights</Text>
                </Animated.View>
                <TouchableOpacity
                  style={styles.aiInfoButton}
                  onPress={() => setShowAiExplanation(!showAiExplanation)}
                >
                  <Ionicons
                    name={showAiExplanation ? "information-circle" : "information-circle-outline"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {showAiExplanation && (
                <Animated.View
                  style={[
                    styles.aiExplanationBox,
                    {
                      opacity: explanationAnim,
                      transform: [
                        {
                          translateY: explanationAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-10, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <Text style={styles.aiExplanationText}>
                    This content is generated by Gemini AI based on historical data, visitor
                    information, and cultural context about {selectedPlace.name}.
                  </Text>
                </Animated.View>
              )}

              <Text style={styles.description}>{details.description}</Text>

              <View style={styles.aiThoughtsContainer}>
                <Text style={styles.aiThoughtsLabel}>Gemini's Analysis</Text>
                <Text style={styles.aiThoughtsText}>{details.aiThoughts}</Text>
              </View>

              <Text style={styles.sectionTitle}>Fast Facts</Text>
              {details.facts.map((fact, index) => (
                <View key={index} style={styles.factItem}>
                  <View style={styles.factBullet} />
                  <Text style={styles.factText}>{fact}</Text>
                </View>
              ))}

              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Year Built</Text>
                  <Text style={styles.infoValue}>{details.yearBuilt}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Architect</Text>
                  <Text style={styles.infoValue}>{details.architect}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Annual Visitors</Text>
                  <Text style={styles.infoValue}>{details.visitors}</Text>
                </View>
              </View>

              {/* Knowledge Quiz related to this place */}
              <View style={styles.placeQuizContainer}>
                <View style={styles.placeQuizHeader}>
                  <Ionicons name="school" size={22} color="#6366F1" />
                  <Text style={styles.placeQuizTitle}>Test Your Knowledge</Text>
                </View>

                <Text style={styles.placeQuizDescription}>
                  Take a quick quiz about {selectedPlace.name} to strengthen your understanding
                </Text>

                <TouchableOpacity style={styles.startQuizButton} onPress={handleStartQuiz}>
                  <Text style={styles.startQuizButtonText}>Start Quiz</Text>
                  <Ionicons name="play" size={16} color="#6366F1" />
                </TouchableOpacity>
              </View>

              {/* Cultural Context for this place */}
              {selectedPlace.location && (
                <View style={styles.culturalContextContainer}>
                  <View style={styles.culturalContextHeader}>
                    <Ionicons name="people" size={22} color="#7E22CE" />
                    <Text style={styles.culturalContextTitle}>Local Cultural Context</Text>
                  </View>

                  <Text style={styles.culturalContextDescription}>
                    Understanding local customs and traditions in{" "}
                    {selectedPlace.location.split(",")[0]}
                  </Text>

                  {mockAiData.culturalInsights
                    .filter((insight) => selectedPlace.location.includes(insight.region))
                    .map((insight, index) => (
                      <View key={index} style={styles.culturalInsightContainer}>
                        {insight.customs.slice(0, 2).map((custom, idx) => (
                          <View key={idx} style={styles.customItem}>
                            <Text style={styles.customTitle}>{custom.title}</Text>
                            <Text style={styles.customDescription}>{custom.description}</Text>
                          </View>
                        ))}

                        <View style={styles.etiquetteContainer}>
                          <Text style={styles.etiquetteLabel}>Local Etiquette</Text>
                          <Text style={styles.etiquetteText}>{insight.etiquette}</Text>
                        </View>
                      </View>
                    ))}

                  <TouchableOpacity style={styles.viewMoreButton}>
                    <Text style={styles.viewMoreButtonText}>View Complete Cultural Guide</Text>
                    <Ionicons name="chevron-forward" size={16} color="#7E22CE" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Nearby Challenges */}
              <View style={styles.nearbyChallengesContainer}>
                <View style={styles.nearbyChallengesHeader}>
                  <Ionicons name="flag" size={22} color="#15803D" />
                  <Text style={styles.nearbyChallengesTitle}>Nearby Challenges</Text>
                </View>

                <Text style={styles.nearbyChallengesDescription}>
                  Complete these exploration challenges near {selectedPlace.name}
                </Text>

                {mockAiData.discoveryChallenges.active
                  .filter((challenge) =>
                    challenge.locations.some(
                      (loc) =>
                        loc.name === selectedPlace.name ||
                        selectedPlace.location.includes(challenge.locations[0].name.split(" ")[0])
                    )
                  )
                  .map((challenge, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.nearbyChallenge}
                      onPress={() => toggleChallengeExpansion(challenge.id)}
                    >
                      <View style={styles.challengeHeader}>
                        <View style={styles.challengeTitleContainer}>
                          <Text style={styles.challengeTitle}>{challenge.title}</Text>
                          <View style={styles.challengeDifficultyContainer}>
                            <Text style={styles.challengeDifficulty}>{challenge.difficulty}</Text>
                          </View>
                        </View>
                        <Ionicons
                          name={expandedChallenge === challenge.id ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="#15803D"
                        />
                      </View>

                      {expandedChallenge === challenge.id && (
                        <View style={styles.challengeDetails}>
                          <Text style={styles.challengeDescription}>{challenge.description}</Text>
                          <View style={styles.challengeProgressBar}>
                            <View
                              style={[
                                styles.challengeProgressFill,
                                { width: `${challenge.progress}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.challengeProgressText}>
                            {challenge.progress}% Complete
                          </Text>

                          <View style={styles.challengeLocations}>
                            {challenge.locations.map((location, idx) => (
                              <View key={idx} style={styles.challengeLocation}>
                                <Ionicons
                                  name={location.completed ? "checkmark-circle" : "ellipse-outline"}
                                  size={18}
                                  color={location.completed ? "#15803D" : "#9CA3AF"}
                                />
                                <Text
                                  style={[
                                    styles.challengeLocationText,
                                    location.completed && styles.challengeLocationCompleted,
                                  ]}
                                >
                                  {location.name}
                                </Text>
                              </View>
                            ))}
                          </View>

                          <View style={styles.challengeReward}>
                            <Ionicons name="ribbon" size={18} color="#15803D" />
                            <Text style={styles.challengeRewardText}>
                              Reward: {challenge.reward}
                            </Text>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  const renderQuizMode = () => {
    const currentQuestion = mockAiData.knowledgeQuest.currentQuestions[activeQuestion];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    if (showQuizResults) {
      // Show quiz results summary
      return (
        <View style={styles.quizResultsContainer}>
          <View style={styles.quizResultsHeader}>
            <LinearGradient
              colors={["#8B5CF6", "#6366F1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.quizResultsGradient}
            >
              <Ionicons name="trophy" size={40} color="#FFFFFF" />
              <Text style={styles.quizResultsTitle}>Quiz Completed!</Text>
              <Text style={styles.quizResultsScore}>
                Score: {mockAiData.knowledgeQuest.statistics.accuracy}%
              </Text>
            </LinearGradient>
          </View>

          <View style={styles.quizResultsContent}>
            <Text style={styles.quizResultsMessage}>
              Great job! You've gained more knowledge about the places you've visited.
            </Text>

            <View style={styles.quizStatsContainer}>
              <View style={styles.quizStatItem}>
                <Text style={styles.quizStatValue}>
                  {mockAiData.knowledgeQuest.statistics.questionsAnswered}
                </Text>
                <Text style={styles.quizStatLabel}>Questions Answered</Text>
              </View>

              <View style={styles.quizStatItem}>
                <Text style={styles.quizStatValue}>
                  {mockAiData.knowledgeQuest.statistics.currentStreak}
                </Text>
                <Text style={styles.quizStatLabel}>Current Streak</Text>
              </View>

              <View style={styles.quizStatItem}>
                <Text style={styles.quizStatValue}>
                  {mockAiData.knowledgeQuest.rewards.currentPoints}
                </Text>
                <Text style={styles.quizStatLabel}>Total Points</Text>
              </View>
            </View>

            <View style={styles.quizRewardProgress}>
              <Text style={styles.quizRewardTitle}>Next Reward</Text>
              <Text style={styles.quizRewardName}>
                {mockAiData.knowledgeQuest.rewards.nextReward}
              </Text>

              <View style={styles.quizRewardProgressBar}>
                <View
                  style={[
                    styles.quizRewardProgressFill,
                    {
                      width: `${
                        (mockAiData.knowledgeQuest.rewards.currentPoints /
                          mockAiData.knowledgeQuest.rewards.nextMilestone) *
                        100
                      }%`,
                    },
                  ]}
                />
              </View>

              <Text style={styles.quizRewardProgressText}>
                {mockAiData.knowledgeQuest.rewards.currentPoints} /{" "}
                {mockAiData.knowledgeQuest.rewards.nextMilestone} points
              </Text>
            </View>

            <TouchableOpacity style={styles.quizCloseButton} onPress={handleBackPress}>
              <Text style={styles.quizCloseButtonText}>Back to Learn</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.quizModeContainer}>
        <View style={styles.quizProgressBar}>
          {mockAiData.knowledgeQuest.currentQuestions.map((_, index) => (
            <View
              key={index}
              style={[
                styles.quizProgressStep,
                activeQuestion === index
                  ? styles.quizProgressActive
                  : activeQuestion > index
                  ? styles.quizProgressComplete
                  : {},
              ]}
            />
          ))}
        </View>

        <View style={styles.quizQuestionContainer}>
          <ImageBackground
            source={currentQuestion.image}
            style={styles.quizQuestionImage}
            imageStyle={styles.quizQuestionImageStyle}
          >
            <LinearGradient
              colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.7)"]}
              style={styles.quizQuestionImageOverlay}
            />
            <Text style={styles.quizQuestionText}>{currentQuestion.question}</Text>
          </ImageBackground>

          <View style={styles.quizOptionsContainer}>
            {currentQuestion.options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.quizOption,
                  selectedAnswer === index && styles.quizOptionSelected,
                  answerSubmitted &&
                    selectedAnswer === index &&
                    (isCorrect ? styles.quizOptionCorrect : styles.quizOptionIncorrect),
                ]}
                onPress={() => handleAnswerSelect(index)}
                disabled={answerSubmitted}
              >
                <Text
                  style={[
                    styles.quizOptionText,
                    selectedAnswer === index && styles.quizOptionTextSelected,
                    answerSubmitted &&
                      selectedAnswer === index &&
                      (isCorrect ? styles.quizOptionTextCorrect : styles.quizOptionTextIncorrect),
                  ]}
                >
                  {option}
                </Text>

                {answerSubmitted && selectedAnswer === index && (
                  <Ionicons
                    name={isCorrect ? "checkmark-circle" : "close-circle"}
                    size={24}
                    color={isCorrect ? "#10B981" : "#EF4444"}
                    style={styles.quizOptionIcon}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {answerSubmitted && (
            <View
              style={[
                styles.quizFeedbackContainer,
                isCorrect ? styles.quizFeedbackCorrect : styles.quizFeedbackIncorrect,
              ]}
            >
              <Text style={styles.quizFeedbackTitle}>
                {isCorrect ? "Correct!" : "Not quite right"}
              </Text>
              <Text style={styles.quizFeedbackText}>{currentQuestion.explanation}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.quizSubmitButton,
              selectedAnswer === null && styles.quizSubmitButtonDisabled,
              answerSubmitted &&
                (isCorrect ? styles.quizSubmitButtonCorrect : styles.quizSubmitButtonIncorrect),
            ]}
            onPress={handleSubmitAnswer}
            disabled={selectedAnswer === null || answerSubmitted}
          >
            <Text style={styles.quizSubmitButtonText}>
              {answerSubmitted
                ? activeQuestion < mockAiData.knowledgeQuest.currentQuestions.length - 1
                  ? "Next Question"
                  : "See Results"
                : "Submit Answer"}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.quizCloseButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderFeatureCards = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.featuresGrid,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.featureCard}
          onPress={() => {
            navigation.navigate("Phrasebook", {
              visitedPlaces,
            });
          }}
        >
          <View style={[styles.featureIconContainer, { backgroundColor: "#E0F2FE" }]}>
            <Ionicons name="language" size={24} color="#0284C7" />
          </View>
          <Text style={styles.featureTitle}>Language Assistant</Text>
          <Text style={styles.featureDescription}>
            Phrases from local languages of places you've visited
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIconContainer, { backgroundColor: "#FFEDD5" }]}>
            <Ionicons name="school" size={24} color="#C2410C" />
          </View>
          <Text style={styles.featureTitle}>Knowledge Quest</Text>
          <Text style={styles.featureDescription}>
            Test what you've learned about visited landmarks with interactive quizzes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIconContainer, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="flag" size={24} color="#15803D" />
          </View>
          <Text style={styles.featureTitle}>Discovery Challenges</Text>
          <Text style={styles.featureDescription}>
            Complete personalized exploration challenges tailored to your interests
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.featureCard}>
          <View style={[styles.featureIconContainer, { backgroundColor: "#F3E8FF" }]}>
            <Ionicons name="people" size={24} color="#7E22CE" />
          </View>
          <Text style={styles.featureTitle}>Cultural Context</Text>
          <Text style={styles.featureDescription}>
            AI insights on local customs and traditions in places you visit
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAdvancedTravelAnalysisCard = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.aiInsightsCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.aiRibbonContainer}>
          <LinearGradient
            colors={["#4F46E5", "#818CF8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiRibbon}
          >
            <Text style={styles.aiRibbonText}>AI POWERED</Text>
          </LinearGradient>
        </View>

        <View style={styles.aiInsightsHeader}>
          <View style={styles.aiIconContainer}>
            <Ionicons name="brain" size={24} color="#4F46E5" />
          </View>
          <View style={styles.aiTitleContainer}>
            <Text style={styles.aiInsightsTitle}>Advanced Travel Analysis</Text>
            <View style={styles.geminiLabelContainer}>
              <Ionicons name="logo-google" size={10} color="#0369A1" style={{ marginRight: 4 }} />
              <Text style={styles.geminiLabel}>Gemini AI</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.aiInsightsDescriptionContainer}
          onPress={() => toggleFeatureExpansion("travelAnalysis")}
        >
          <Text style={styles.aiInsightsDescription}>
            Our multimodal AI has analyzed your travel history, photos, and preferences to generate
            these insights:
          </Text>
          <Ionicons
            name={expandedFeatures.travelAnalysis ? "chevron-up" : "chevron-down"}
            size={20}
            color="#4F46E5"
          />
        </TouchableOpacity>

        {mockAiData.travelInsights.patterns.map((insight, index) => (
          <View key={index} style={styles.insightItem}>
            <Ionicons name="sparkles" size={18} color="#4F46E5" style={styles.insightIcon} />
            <Text style={styles.insightText}>{insight}</Text>
          </View>
        ))}

        {expandedFeatures.travelAnalysis && (
          <View style={styles.extendedInsightsContainer}>
            <View style={styles.visitationStatsContainer}>
              <Text style={styles.visitationStatsTitle}>Your Travel Patterns</Text>

              <View style={styles.visitationStats}>
                <View style={styles.visitationStatItem}>
                  <Ionicons name="time" size={18} color="#4F46E5" />
                  <Text style={styles.visitationStatValue}>
                    {mockAiData.travelInsights.visitation.averageDuration}
                  </Text>
                  <Text style={styles.visitationStatLabel}>Avg. Visit Duration</Text>
                </View>

                <View style={styles.visitationStatItem}>
                  <Ionicons name="location" size={18} color="#4F46E5" />
                  <Text style={styles.visitationStatValue}>
                    {mockAiData.travelInsights.visitation.averageDistance}
                  </Text>
                  <Text style={styles.visitationStatLabel}>Avg. Travel Distance</Text>
                </View>

                <View style={styles.visitationStatItem}>
                  <Ionicons name="navigate" size={18} color="#4F46E5" />
                  <Text style={styles.visitationStatValue}>
                    {mockAiData.travelInsights.visitation.mostVisitedCity}
                  </Text>
                  <Text style={styles.visitationStatLabel}>Most Visited City</Text>
                </View>
              </View>

              <View style={styles.frequencyInsightContainer}>
                <View style={styles.frequencyInsight}>
                  <Text style={styles.frequencyInsightTitle}>Preferred Day</Text>
                  <View style={styles.frequencyInsightContent}>
                    <Text style={styles.frequencyInsightValue}>
                      {mockAiData.travelInsights.visitFrequency.weekdays.most}
                    </Text>
                    <Text style={styles.frequencyInsightPercentage}>
                      {mockAiData.travelInsights.visitFrequency.weekdays.percentage}%
                    </Text>
                  </View>
                  <Text style={styles.frequencyInsightNote}>
                    {mockAiData.travelInsights.visitFrequency.weekdays.insight}
                  </Text>
                </View>

                <View style={styles.frequencyInsight}>
                  <Text style={styles.frequencyInsightTitle}>Preferred Time</Text>
                  <View style={styles.frequencyInsightContent}>
                    <Text style={styles.frequencyInsightValue}>
                      {mockAiData.travelInsights.visitFrequency.timeOfDay.most}
                    </Text>
                    <Text style={styles.frequencyInsightPercentage}>
                      {mockAiData.travelInsights.visitFrequency.timeOfDay.percentage}%
                    </Text>
                  </View>
                  <Text style={styles.frequencyInsightNote}>
                    {mockAiData.travelInsights.visitFrequency.timeOfDay.insight}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={styles.aiSectionDivider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Travel Preferences</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.trendsContainer}>
          {mockAiData.preferences.categories.map((trend, index) => (
            <View key={index} style={styles.trendItem}>
              <View style={styles.trendLabelRow}>
                <View style={styles.trendLabelWithIcon}>
                  <Ionicons name={trend.icon} size={16} color="#4F46E5" style={styles.trendIcon} />
                  <Text style={styles.trendLabel}>{trend.name}</Text>
                </View>
                <Text style={styles.trendPercentage}>{trend.percentage}%</Text>
              </View>
              <View style={styles.trendBarBackground}>
                <View style={[styles.trendBarFill, { width: `${trend.percentage}%` }]} />
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.aiExpandButton}>
          <Text style={styles.aiExpandText}>View Complete Analysis</Text>
          <Ionicons name="chevron-forward" size={16} color="#4F46E5" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderRecommendationsCard = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.aiRecommendationsCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.aiRecommendationsHeader}>
          <Ionicons name="compass" size={22} color="#15803D" />
          <Text style={styles.aiRecommendationsTitle}>AI-Recommended Destinations</Text>
        </View>

        <Text style={styles.aiRecommendationsSubtitle}>
          Based on your travel preferences, you might enjoy:
        </Text>

        <View style={styles.recommendationsList}>
          {mockAiData.recommendedPlaces.map((place, index) => (
            <TouchableOpacity key={index} style={styles.enhancedRecommendationItem}>
              <Image source={place.image} style={styles.recommendationImage} resizeMode="cover" />
              <View style={styles.recommendationContent}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationName}>{place.name}</Text>
                  <View style={styles.matchContainer}>
                    <Text style={styles.matchText}>{place.matchPercentage}% match</Text>
                  </View>
                </View>
                <Text style={styles.recommendationLocation}>{place.location}</Text>
                <Text style={styles.recommendationReason}>{place.reason}</Text>
                <View style={styles.recommendationFooter}>
                  <View style={styles.distanceContainer}>
                    <Ionicons name="navigate" size={14} color="#64748B" />
                    <Text style={styles.distanceText}>{place.distance}</Text>
                  </View>
                  <TouchableOpacity style={styles.addToWishlistButton}>
                    <Ionicons name="heart-outline" size={16} color="#15803D" />
                    <Text style={styles.addToWishlistText}>Add to Wishlist</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  };

  const renderLanguageAssistantCard = (cardAnimation: any) => {
    return <LanguageAssistant visitedPlaces={visitedPlaces} cardAnimation={cardAnimation} />;
  };

  const renderCulturalContextCard = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.culturalContextCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.culturalContextCardHeader}>
          <Ionicons name="people" size={22} color="#7E22CE" />
          <Text style={styles.culturalContextCardTitle}>Cultural Context</Text>
        </View>

        <Text style={styles.culturalContextCardSubtitle}>
          Understanding local customs and traditions in places you've visited:
        </Text>

        <TouchableOpacity
          style={styles.culturalInsightsContainer}
          onPress={() => toggleFeatureExpansion("culturalInsights")}
        >
          <View style={styles.culturalInsightHeaderRow}>
            <Text style={styles.culturalInsightRegion}>Rome, Italy</Text>
            <Ionicons
              name={expandedFeatures.culturalInsights ? "chevron-up" : "chevron-down"}
              size={20}
              color="#7E22CE"
            />
          </View>

          <View style={styles.culturalCustomsContainer}>
            {mockAiData.culturalInsights[0].customs.slice(0, 2).map((custom, index) => (
              <View key={index} style={styles.culturalCustomItem}>
                <Text style={styles.culturalCustomTitle}>{custom.title}</Text>
                <Text style={styles.culturalCustomDescription}>{custom.description}</Text>
              </View>
            ))}
          </View>

          {expandedFeatures.culturalInsights && (
            <>
              <View style={styles.expandedCulturalContent}>
                <View style={styles.culturalSectionHeader}>
                  <Ionicons name="restaurant" size={16} color="#7E22CE" />
                  <Text style={styles.culturalSectionTitle}>Dining Etiquette</Text>
                </View>
                <Text style={styles.culturalSectionText}>
                  {mockAiData.culturalInsights[0].diningTips}
                </Text>

                <View style={styles.culturalSectionHeader}>
                  <Ionicons name="hand-left" size={16} color="#7E22CE" />
                  <Text style={styles.culturalSectionTitle}>Local Etiquette</Text>
                </View>
                <Text style={styles.culturalSectionText}>
                  {mockAiData.culturalInsights[0].etiquette}
                </Text>

                <View style={styles.culturalCustomsContainer}>
                  {mockAiData.culturalInsights[0].customs.slice(2).map((custom, index) => (
                    <View key={index} style={styles.culturalCustomItem}>
                      <Text style={styles.culturalCustomTitle}>{custom.title}</Text>
                      <Text style={styles.culturalCustomDescription}>{custom.description}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.culturalContextViewAllButton}>
          <Text style={styles.culturalContextViewAllText}>Explore All Cultural Insights</Text>
          <Ionicons name="chevron-forward" size={16} color="#7E22CE" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderKnowledgeQuestCard = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.knowledgeQuestCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={["#8B5CF6", "#6366F1"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.knowledgeQuestGradient}
        >
          <View style={styles.knowledgeQuestContent}>
            <View style={styles.knowledgeQuestHeader}>
              <Text style={styles.knowledgeQuestTitle}>Knowledge Quest</Text>
              <View style={styles.knowledgeQuestBadge}>
                <Ionicons name="school" size={12} color="#FFFFFF" />
                <Text style={styles.knowledgeQuestBadgeText}>Fun Learning</Text>
              </View>
            </View>

            <Text style={styles.knowledgeQuestDescription}>
              Test your knowledge about places you've visited and earn badges!
            </Text>

            <View style={styles.knowledgeQuestStatsRow}>
              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>
                  {mockAiData.knowledgeQuest.statistics.questionsAnswered}
                </Text>
                <Text style={styles.knowledgeQuestStatLabel}>Questions</Text>
              </View>

              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>
                  {mockAiData.knowledgeQuest.statistics.accuracy}%
                </Text>
                <Text style={styles.knowledgeQuestStatLabel}>Accuracy</Text>
              </View>

              <View style={styles.knowledgeQuestStat}>
                <Text style={styles.knowledgeQuestStatValue}>
                  {mockAiData.knowledgeQuest.rewards.badges.length}
                </Text>
                <Text style={styles.knowledgeQuestStatLabel}>Badges</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.startKnowledgeQuestButton} onPress={handleStartQuiz}>
              <Text style={styles.startKnowledgeQuestButtonText}>Start New Quiz</Text>
              <Ionicons name="play" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderDiscoveryChallengesCard = (cardAnimation) => {
    return (
      <Animated.View
        style={[
          styles.discoveryChallengesCard,
          {
            opacity: cardAnimation,
            transform: [
              {
                translateY: cardAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.discoveryChallengesHeader}>
          <Ionicons name="flag" size={22} color="#15803D" />
          <Text style={styles.discoveryChallengesTitle}>AI Discovery Challenges</Text>
        </View>

        <Text style={styles.discoveryChallengesSubtitle}>
          Complete personalized exploration challenges to discover new places:
        </Text>

        <View style={styles.activeChallengesContainer}>
          <View style={styles.challengesSectionHeader}>
            <Text style={styles.challengesSectionTitle}>Active Challenges</Text>
            <View style={styles.challengeCountBadge}>
              <Text style={styles.challengeCountText}>
                {mockAiData.discoveryChallenges.active.length}
              </Text>
            </View>
          </View>

          {mockAiData.discoveryChallenges.active.map((challenge, index) => (
            <TouchableOpacity
              key={index}
              style={styles.activeChallenge}
              onPress={() => toggleChallengeExpansion(challenge.id)}
            >
              <View style={styles.challengeHeaderRow}>
                <View style={styles.challengeTitleSection}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <View style={styles.challengeDetails}>
                    <View style={styles.challengeDifficultyBadge}>
                      <Text style={styles.challengeDifficultyText}>{challenge.difficulty}</Text>
                    </View>
                    <View style={styles.challengeDuration}>
                      <Ionicons name="time-outline" size={12} color="#64748B" />
                      <Text style={styles.challengeDurationText}>{challenge.duration}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.challengeProgress}>
                  <Text style={styles.challengeProgressText}>{challenge.progress}%</Text>
                  <Ionicons
                    name={expandedChallenge === challenge.id ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#15803D"
                  />
                </View>
              </View>

              <View style={styles.challengeProgressBar}>
                <View style={[styles.challengeProgressFill, { width: `${challenge.progress}%` }]} />
              </View>

              {expandedChallenge === challenge.id && (
                <View style={styles.expandedChallengeContent}>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>

                  <View style={styles.challengeLocationsContainer}>
                    <Text style={styles.challengeLocationsTitle}>Challenge Locations:</Text>
                    {challenge.locations.map((location, idx) => (
                      <View key={idx} style={styles.challengeLocationItem}>
                        <Ionicons
                          name={location.completed ? "checkmark-circle" : "ellipse-outline"}
                          size={16}
                          color={location.completed ? "#15803D" : "#64748B"}
                          style={styles.challengeLocationIcon}
                        />
                        <Text
                          style={[
                            styles.challengeLocationText,
                            location.completed && { color: "#15803D", fontWeight: "600" },
                          ]}
                        >
                          {location.name}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <View style={styles.challengeRewardContainer}>
                    <Ionicons name="ribbon-outline" size={16} color="#15803D" />
                    <Text style={styles.challengeRewardText}>Reward: {challenge.reward}</Text>
                  </View>

                  <TouchableOpacity style={styles.viewChallengeDetailsButton}>
                    <Text style={styles.viewChallengeDetailsText}>View Challenge Details</Text>
                    <Ionicons name="open-outline" size={16} color="#15803D" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.suggestedChallengesContainer}>
          <Text style={styles.suggestedChallengesTitle}>Suggested For You</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestedChallengesScroll}
            contentContainerStyle={styles.suggestedChallengesContent}
          >
            {mockAiData.discoveryChallenges.suggested.map((challenge, index) => (
              <View key={index} style={styles.suggestedChallengeCard}>
                <View style={styles.suggestedChallengeHeader}>
                  <Text style={styles.suggestedChallengeTitle}>{challenge.title}</Text>
                  <View style={styles.suggestedChallengeDifficulty}>
                    <Text style={styles.suggestedChallengeDifficultyText}>
                      {challenge.difficulty}
                    </Text>
                  </View>
                </View>

                <Text style={styles.suggestedChallengeDescription}>{challenge.description}</Text>

                <View style={styles.suggestedChallengeFooter}>
                  <View style={styles.suggestedChallengeDuration}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.suggestedChallengeDurationText}>{challenge.duration}</Text>
                  </View>

                  <TouchableOpacity style={styles.startChallengeButton}>
                    <Text style={styles.startChallengeButtonText}>Start</Text>
                    <Ionicons name="arrow-forward" size={14} color="#15803D" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.viewAllChallengesButton}>
          <Text style={styles.viewAllChallengesText}>Explore All Challenges</Text>
          <Ionicons name="chevron-forward" size={16} color="#15803D" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLandingScreen = () => {
    console.log(
      "Rendering landing screen. Loading:",
      loadingPlaces,
      "Places count:",
      visitedPlaces.length
    );

    if (loadingPlaces) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading your visited places...</Text>
        </View>
      );
    }

    if (error && !useMockData) {
      console.log("Rendering error state:", error);
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#ccc" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserVisitedPlaces}>
            <LinearGradient
              colors={[Colors.primary, Colors.primary + "CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      );
    }

    if ((noPlacesFound || visitedPlaces.length === 0) && !useMockData) {
      console.log("Rendering empty state");
      return renderEmptyState();
    }

    // We have places to show (either real or mock)
    const placesToShow = visitedPlaces;
    console.log("Showing places:", placesToShow.length);

    // Handle active question rendering
    if (activeQuestion !== null) {
      return renderQuizMode();
    }

    return (
      <ScrollView style={styles.landingContainer} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={[
            styles.contentContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back!</Text>
            <Text style={styles.subtitleText}>
              Explore your travel journey and discover new insights
            </Text>
          </View>

          {/* Feature 1: AI Travel Snapshot */}
          <AiTravelSnapshot
            fadeAnim={cardAnimations.travelSnapshot}
            pulseAnim={pulseAnim}
            placesToShow={placesToShow}
            onProfileUpdated={handleProfileUpdated}
          />
          {/* Feature Grid */}
          {renderFeatureCards(cardAnimations.travelSnapshot)}

          {/* Feature 5 & 6: Advanced Travel Analysis + Travel Preferences */}
          {renderAdvancedTravelAnalysisCard(cardAnimations.analysis)}

          {/* Feature 3: AI-Recommended Destinations */}
          {renderRecommendationsCard(cardAnimations.recommendations)}

          {/* Feature 2: Language Assistant */}
          {renderLanguageAssistantCard(cardAnimations.languageAssistant)}

          {/* Feature 4: Cultural Context */}
          {renderCulturalContextCard(cardAnimations.cultural)}

          {/* Feature 7: Knowledge Quest Game */}
          {renderKnowledgeQuestCard(cardAnimations.quest)}

          {/* Feature 8: AI Discovery Challenges */}
          {renderDiscoveryChallengesCard(cardAnimations.challenges)}

          <View style={styles.visitedSection}>
            <Text style={styles.sectionHeading}>Recently Visited Places</Text>
            <Text style={styles.sectionSubheading}>
              Tap on any place to explore AI-powered insights
            </Text>

            <View style={styles.carouselContainer}>
              <PlacesCarousel
                places={placesToShow}
                onPlacePress={handlePlaceSelect}
                sectionType="visited"
                cardWidth={width * 0.85}
                cardHeight={180}
              />
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    );
  };

  return (
    <ScreenWithNavBar>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={[globalStyles.container, styles.container]}>
        <Header
          title={"Learn"}
          subtitle={selectedPlaceId ? "AI-powered insights" : "Explore your visited places"}
          showBackButton={!!selectedPlaceId || activeQuestion !== null}
          onBackPress={handleBackPress}
          showIcon={true}
          iconName={selectedPlaceId ? "book" : "sparkles"}
          iconColor={Colors.primary}
          showHelp={true}
          onHelpPress={() => handleModal()}
        />

        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Gemini AI is analyzing this place...</Text>
              <Text style={styles.loadingSubtext}>Generating personalized insights for you</Text>

              <View style={styles.pulsingContainer}>
                {[...Array(3)].map((_, i) => (
                  <Animated.View
                    key={i}
                    style={[
                      styles.pulsingCircle,
                      {
                        opacity: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        }),
                        transform: [
                          {
                            scale: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1.2],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.geminiAttribution}>Powered by Gemini AI</Text>
            </View>
          </View>
        ) : selectedPlaceId ? (
          renderPlaceDetails()
        ) : (
          renderLandingScreen()
        )}
        <LearnIntroOverlay
          visible={showLearnIntro}
          onClose={() => {
            setShowLearnIntro(false);
            // Allow modal to fully close before it can be reopened
            // This ensures the component will re-mount and reset its internal state
            setTimeout(() => {
              console.log("Modal state reset complete");
            }, 100);
          }}
        />
      </View>
    </ScreenWithNavBar>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  landingContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  welcomeSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitleText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 4,
  },
  mockDataNotice: {
    marginTop: 8,
    fontSize: 12,
    color: "#EF4444",
    fontStyle: "italic",
  },

  // AI Travel Snapshot Card (Feature 1)
  aiSummaryCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  aiSummaryGradient: {
    borderRadius: 20,
    padding: 0,
  },
  aiSummaryContent: {
    padding: 20,
  },
  aiSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  aiSummaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  aiChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  aiSummaryDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  aiActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    gap: 10,
  },
  aiActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  aiActionIconContainer: {
    marginRight: 6,
  },
  aiActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4F46E5",
  },

  // Travel Profile Elements
  travelProfileContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  travelProfileTypeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  travelProfileType: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  travelProfileLevelContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  travelProfileLevel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  travelProfileBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 8,
  },
  travelProfileBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  travelProfileBadgeText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  travelProfileCompletionContainer: {
    marginTop: 12,
  },
  travelProfileCompletionText: {
    fontSize: 12,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  travelProfileCompletionBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 4,
  },
  travelProfileCompletionFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  travelProfileCompletionPercentage: {
    fontSize: 11,
    color: "#FFFFFF",
    textAlign: "right",
  },

  // Feature Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },

  // Advanced Travel Analysis Card (Feature 5 & 6)
  aiInsightsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    position: "relative",
    overflow: "hidden",
  },
  aiRibbonContainer: {
    position: "absolute",
    top: 12,
    right: -30,
    transform: [{ rotate: "45deg" }],
    zIndex: 10,
  },
  aiRibbon: {
    paddingHorizontal: 30,
    paddingVertical: 4,
  },
  aiRibbonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
  },
  aiInsightsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  aiIconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "#C7D2FE",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  aiTitleContainer: {
    flex: 1,
  },
  aiInsightsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4F46E5",
    marginBottom: 4,
  },
  geminiLabelContainer: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
  },
  geminiLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0369A1",
  },
  aiInsightsDescriptionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  aiInsightsDescription: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  insightItem: {
    flexDirection: "row",
    marginBottom: 12,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#4F46E5",
  },
  insightIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  extendedInsightsContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  visitationStatsContainer: {
    marginBottom: 12,
  },
  visitationStatsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 12,
  },
  visitationStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  visitationStatItem: {
    alignItems: "center",
    flex: 1,
  },
  visitationStatValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginVertical: 4,
  },
  visitationStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  frequencyInsightContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  frequencyInsight: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  frequencyInsightTitle: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  frequencyInsightContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  frequencyInsightValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  frequencyInsightPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
  },
  frequencyInsightNote: {
    fontSize: 11,
    color: "#6B7280",
    fontStyle: "italic",
  },
  aiSectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  trendsContainer: {
    marginBottom: 16,
  },
  trendItem: {
    marginBottom: 12,
  },
  trendLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  trendLabelWithIcon: {
    flexDirection: "row",
    alignItems: "center",
  },
  trendIcon: {
    marginRight: 6,
  },
  trendLabel: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "500",
  },
  trendPercentage: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "600",
  },
  trendBarBackground: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  trendBarFill: {
    height: "100%",
    backgroundColor: "#4F46E5",
    borderRadius: 3,
  },
  aiExpandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    marginTop: 4,
  },
  aiExpandText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 4,
  },

  // AI-Recommended Destinations Card (Feature 3)
  aiRecommendationsCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiRecommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiRecommendationsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 8,
  },
  aiRecommendationsSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  recommendationsList: {
    gap: 12,
  },
  enhancedRecommendationItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    marginBottom: 12,
  },
  recommendationImage: {
    width: "100%",
    height: 120,
  },
  recommendationContent: {
    padding: 14,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recommendationName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  matchContainer: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  recommendationLocation: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 8,
  },
  recommendationReason: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 12,
    fontStyle: "italic",
  },
  recommendationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  distanceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  distanceText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 4,
  },
  addToWishlistButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addToWishlistText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    marginLeft: 4,
  },

  // Language Assistant Card (Feature 2)
  aiLanguageCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#0369A1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  aiLanguageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiLanguageTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284C7",
    marginLeft: 8,
  },
  aiLanguageSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  phrasesScrollView: {
    marginBottom: 12,
  },
  phrasesContentContainer: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 14,
  },
  enhancedPhraseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    width: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: "relative",
  },
  phraseLanguage: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
    marginBottom: 6,
  },
  phraseText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  phraseTranslation: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  phraseContext: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 10,
  },
  pronunciationContainer: {
    backgroundColor: "#F0F9FF",
    padding: 8,
    borderRadius: 8,
    marginBottom: 28,
  },
  pronunciationLabel: {
    fontSize: 10,
    color: "#0284C7",
    marginBottom: 2,
  },
  pronunciationText: {
    fontSize: 12,
    color: "#1F2937",
    fontStyle: "italic",
  },
  playPhraseButton: {
    position: "absolute",
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },
  viewAllPhrasesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F9FF",
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewAllPhrasesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0284C7",
    marginRight: 4,
  },

  // Cultural Context Card (Feature 4)
  culturalContextCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#7E22CE",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  culturalContextCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  culturalContextCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7E22CE",
    marginLeft: 8,
  },
  culturalContextCardSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 14,
  },
  culturalInsightsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  culturalInsightHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  culturalInsightRegion: {
    fontSize: 15,
    fontWeight: "700",
    color: "#7E22CE",
  },
  culturalCustomsContainer: {
    marginBottom: 8,
    gap: 10,
  },
  culturalCustomItem: {
    backgroundColor: "#F5F3FF",
    borderRadius: 10,
    padding: 12,
  },
  culturalCustomTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginBottom: 4,
  },
  culturalCustomDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
  },
  expandedCulturalContent: {
    marginTop: 12,
  },
  culturalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginTop: 12,
  },
  culturalSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginLeft: 6,
  },
  culturalSectionText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 10,
  },
  culturalContextViewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 10,
  },
  culturalContextViewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginRight: 4,
  },

  // Knowledge Quest Card (Feature 7)
  knowledgeQuestCard: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  knowledgeQuestGradient: {
    borderRadius: 16,
  },
  knowledgeQuestContent: {
    padding: 20,
  },
  knowledgeQuestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  knowledgeQuestTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  knowledgeQuestBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  knowledgeQuestBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 4,
  },
  knowledgeQuestDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
    marginBottom: 16,
  },
  knowledgeQuestStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  knowledgeQuestStat: {
    alignItems: "center",
    flex: 1,
  },
  knowledgeQuestStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  knowledgeQuestStatLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  startKnowledgeQuestButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 12,
  },
  startKnowledgeQuestButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
    marginRight: 6,
  },

  // Quiz Mode Styles
  quizModeContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    position: "relative",
  },
  quizProgressBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  quizProgressStep: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    flex: 1,
    marginHorizontal: 2,
  },
  quizProgressActive: {
    backgroundColor: "#6366F1",
  },
  quizProgressComplete: {
    backgroundColor: "#A5B4FC",
  },
  quizQuestionContainer: {
    flex: 1,
  },
  quizQuestionImage: {
    height: 180,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  quizQuestionImageStyle: {
    borderRadius: 12,
  },
  quizQuestionImageOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  quizQuestionText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  quizOptionsContainer: {
    marginBottom: 16,
  },
  quizOption: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quizOptionSelected: {
    backgroundColor: "#E0E7FF",
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  quizOptionCorrect: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  quizOptionIncorrect: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  quizOptionText: {
    fontSize: 15,
    color: "#374151",
  },
  quizOptionTextSelected: {
    color: "#4338CA",
    fontWeight: "600",
  },
  quizOptionTextCorrect: {
    color: "#047857",
    fontWeight: "600",
  },
  quizOptionTextIncorrect: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  quizOptionIcon: {
    marginLeft: 8,
  },
  quizFeedbackContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  quizFeedbackCorrect: {
    backgroundColor: "#ECFDF5",
  },
  quizFeedbackIncorrect: {
    backgroundColor: "#FEF2F2",
  },
  quizFeedbackTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
    color: "#111827",
  },
  quizFeedbackText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  quizSubmitButton: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#6366F1",
    alignItems: "center",
    marginBottom: 16,
  },
  quizSubmitButtonDisabled: {
    backgroundColor: "#C7D2FE",
  },
  quizSubmitButtonCorrect: {
    backgroundColor: "#10B981",
  },
  quizSubmitButtonIncorrect: {
    backgroundColor: "#F87171",
  },
  quizSubmitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quizCloseButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  // Quiz Results
  quizResultsContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    margin: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quizResultsHeader: {
    overflow: "hidden",
  },
  quizResultsGradient: {
    paddingVertical: 40,
    alignItems: "center",
  },
  quizResultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 16,
    marginBottom: 8,
  },
  quizResultsScore: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  quizResultsContent: {
    padding: 24,
  },
  quizResultsMessage: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 24,
  },
  quizStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quizStatItem: {
    alignItems: "center",
    flex: 1,
  },
  quizStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  quizStatLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  quizRewardProgress: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  quizRewardTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  quizRewardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  quizRewardProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  quizRewardProgressFill: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 4,
  },
  quizRewardProgressText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "right",
  },
  quizCloseButton: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  quizCloseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4B5563",
  },

  // Discovery Challenges Card (Feature 8)
  discoveryChallengesCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#047857",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  discoveryChallengesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  discoveryChallengesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 8,
  },
  discoveryChallengesSubtitle: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 16,
  },
  activeChallengesContainer: {
    marginBottom: 20,
  },
  challengesSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  challengesSectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  challengeCountBadge: {
    backgroundColor: "#15803D",
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  challengeCountText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  activeChallenge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  challengeHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  challengeTitleSection: {
    flex: 1,
    marginRight: 8,
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#15803D",
    marginBottom: 4,
  },
  challengeDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeDifficultyBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 8,
  },
  challengeDifficultyText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  challengeDuration: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeDurationText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
  },
  challengeProgress: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeProgressText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
    marginRight: 6,
  },
  challengeProgressBar: {
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 12,
  },
  challengeProgressFill: {
    height: "100%",
    backgroundColor: "#15803D",
    borderRadius: 3,
  },
  expandedChallengeContent: {
    marginTop: 4,
  },
  challengeDescription: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  challengeLocationsContainer: {
    marginBottom: 12,
  },
  challengeLocationsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  challengeLocationItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  challengeLocationIcon: {
    marginRight: 8,
  },
  challengeLocationText: {
    fontSize: 13,
    color: "#6B7280",
  },
  challengeLocationCompleted: {
    color: "#15803D",
    fontWeight: "600",
  },
  challengeRewardContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  challengeRewardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
    marginLeft: 6,
  },
  viewChallengeDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewChallengeDetailsText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#15803D",
    marginRight: 4,
  },
  suggestedChallengesContainer: {
    marginBottom: 16,
  },
  suggestedChallengesTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  suggestedChallengesScroll: {
    marginBottom: 8,
  },
  suggestedChallengesContent: {
    paddingRight: 16,
    paddingBottom: 4,
    gap: 12,
  },
  suggestedChallengeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    width: 240,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  suggestedChallengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  suggestedChallengeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
    flex: 1,
    marginRight: 8,
  },
  suggestedChallengeDifficulty: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  suggestedChallengeDifficultyText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#15803D",
  },
  suggestedChallengeDescription: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 16,
    marginBottom: 10,
  },
  suggestedChallengeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  suggestedChallengeDuration: {
    flexDirection: "row",
    alignItems: "center",
  },
  suggestedChallengeDurationText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
  },
  startChallengeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  startChallengeButtonText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
    marginRight: 4,
  },
  viewAllChallengesButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 10,
    borderRadius: 10,
  },
  viewAllChallengesText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#15803D",
    marginRight: 4,
  },

  // Place Details Screen
  placeQuizContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 20,
  },
  placeQuizHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  placeQuizTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4F46E5",
    marginLeft: 8,
  },
  placeQuizDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  startQuizButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  startQuizButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginRight: 6,
  },
  culturalContextContainer: {
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  culturalContextHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  culturalContextTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7E22CE",
    marginLeft: 8,
  },
  culturalContextDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  culturalInsightContainer: {
    marginBottom: 12,
  },
  customItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  customTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginBottom: 4,
  },
  customDescription: {
    fontSize: 13,
    color: "#4B5563",
  },
  etiquetteContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
  },
  etiquetteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginBottom: 4,
  },
  etiquetteText: {
    fontSize: 13,
    color: "#4B5563",
    fontStyle: "italic",
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  viewMoreButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7E22CE",
    marginRight: 4,
  },
  nearbyChallengesContainer: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  nearbyChallengesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  nearbyChallengesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
    marginLeft: 8,
  },
  nearbyChallengesDescription: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 12,
  },
  nearbyChallenge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  challengeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  challengeTitleContainer: {
    flex: 1,
  },
  challengeDifficultyContainer: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  challengeDifficulty: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  challengeDetails: {
    marginTop: 12,
  },
  challengeLocations: {
    marginTop: 10,
  },
  challengeLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  challengeLocationText: {
    fontSize: 13,
    color: "#4B5563",
    marginLeft: 6,
  },
  challengeReward: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  challengeRewardText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#15803D",
    marginLeft: 6,
  },

  // Original Styles from base component
  visitedSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  sectionSubheading: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
  },
  carouselContainer: {
    marginBottom: 20,
  },
  detailsContainer: {
    flex: 1,
  },
  detailsContent: {
    flex: 1,
  },
  placeImage: {
    height: 240,
    width: "100%",
  },
  placeImageStyle: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  imageDarkOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-end",
    padding: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  placeHeaderContent: {
    marginBottom: 20,
  },
  placeNameOverlay: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeLocationOverlay: {
    fontSize: 16,
    color: "#FFFFFF",
    marginLeft: 4,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  detailsCard: {
    padding: 16,
  },
  visitInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  visitDateContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  visitDateText: {
    fontSize: 14,
    color: "#374151",
    marginLeft: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 193, 7, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#B45309",
    marginLeft: 4,
  },
  aiContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 24,
  },
  aiLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  aiLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  aiLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginLeft: 6,
  },
  aiInfoButton: {
    padding: 4,
  },
  aiExplanationBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  aiExplanationText: {
    fontSize: 13,
    color: "#4B5563",
    lineHeight: 18,
    fontStyle: "italic",
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 20,
  },
  aiThoughtsContainer: {
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  aiThoughtsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4F46E5",
    marginBottom: 6,
  },
  aiThoughtsText: {
    fontSize: 15,
    color: "#4B5563",
    lineHeight: 22,
    fontStyle: "italic",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    marginTop: 8,
  },
  factItem: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  factBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
    marginTop: 6,
    marginRight: 12,
  },
  factText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 20,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    width: "50%",
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "600",
    color: "#4F46E5",
    textAlign: "center",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
  },
  pulsingContainer: {
    width: 120,
    height: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  pulsingCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#4F46E5",
    margin: 4,
  },
  geminiAttribution: {
    marginTop: 16,
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    overflow: "hidden",
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  // Enhanced empty state styles
  emptyStateCard: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    position: "relative",
    minHeight: 250,
    marginTop: 16,
  },
  emptyStateGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  emptyStateDecoration: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decorationCircle: {
    position: "absolute",
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  circle1: {
    width: 120,
    height: 120,
    top: -60,
    right: -30,
    opacity: 0.05,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: 20,
    opacity: 0.03,
  },
  circle3: {
    width: 40,
    height: 40,
    top: 40,
    left: 30,
    opacity: 0.07,
  },
  emptyStateContent: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  emptyStateIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: NeutralColors.black,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateMessage: {
    fontSize: 14,
    color: NeutralColors.gray500,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    overflow: "hidden",
    borderRadius: 10,
  },
  emptyStateButtonText: {
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
  },
});

export default LearnScreen;
