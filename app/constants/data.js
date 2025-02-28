// constants/data.js
export const USER_STATS = [
  {
    id: 1,
    icon: "map",
    value: 14,
    label: "Places",
    gradientColors: ["#4A90E2", "#5DA9FF"],
  },
  {
    id: 2,
    icon: "earth",
    value: 3,
    label: "Countries",
    gradientColors: ["#FF7043", "#FF8A65"],
  },
  {
    id: 3,
    icon: "flame",
    value: 5,
    label: "Day Streak",
    gradientColors: ["#d03f74", "#ff1493"],
  },
  {
    id: 4,
    icon: "star",
    value: 24,
    label: "Achievements",
    gradientColors: ["#50C878", "#63E08C"],
  },
];

export const DISCOVERED_LOCATIONS = [
  {
    id: 1,
    name: "Eiffel Tower",
    city: "Paris",
    image:
      "https://images.unsplash.com/photo-1543349689-9a4d426bee8e?q=80&w=1501&auto=format&fit=crop",
    date: "2 days ago",
  },
  {
    id: 2,
    name: "Colosseum",
    city: "Rome",
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=1396&auto=format&fit=crop",
    date: "1 week ago",
  },
  {
    id: 3,
    name: "Big Ben",
    city: "London",
    image:
      "https://images.unsplash.com/photo-1500380804539-4e1e8c1e7118?q=80&w=1450&auto=format&fit=crop",
    date: "2 weeks ago",
  },
  {
    id: 4,
    name: "Sagrada Familia",
    city: "Barcelona",
    image:
      "https://images.unsplash.com/photo-1583779457094-ab6f9164f5e8?q=80&w=1374&auto=format&fit=crop",
    date: "3 weeks ago",
  },
  {
    id: 5,
    name: "Acropolis",
    city: "Athens",
    image:
      "https://images.unsplash.com/photo-1603565816030-6b389eeb23cb?q=80&w=1470&auto=format&fit=crop",
    date: "1 month ago",
  },
  {
    id: 6,
    name: "Burj Khalifa",
    city: "Dubai",
    image:
      "https://images.unsplash.com/photo-1582672060674-bc2bd808a8f5?q=80&w=1335&auto=format&fit=crop",
    date: "1 month ago",
  },
];

export const FEATURE_CARDS = [
  {
    id: 1,
    title: "Discover",
    description: "Explore new locations and get guided directions to exciting places around you.",
    icon: "compass",
    screen: "Discover",
    gradientColors: ["#4A90E2", "#5DA9FF"],
  },
  {
    id: 2,
    title: "Learn",
    description:
      "Get AI-powered information tailored to each location, like having a personal tour guide.",
    icon: "sparkles",
    screen: "Learn",
    gradientColors: ["#50C878", "#63E08C"],
  },
  {
    id: 3,
    title: "Places",
    description: "View and collect places you've visited to build your personal travel journal.",
    icon: "location",
    screen: "Places",
    gradientColors: ["#FF7043", "#FF8A65"],
  },
];
