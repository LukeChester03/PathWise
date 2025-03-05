// useMapNavigation.ts - Updated with fixed audio handling
import { useState, useRef, useCallback, useEffect } from "react";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { haversineDistance } from "../../utils/mapUtils";
import { ANNOUNCEMENT_COOLDOWN, INITIAL_NAVIGATION_DELAY } from "../../constants/Map/mapConstants";
import { Coordinate, NavigationStep } from "../../types/MapTypes";

export interface UseMapNavigationReturn {
  navigationSteps: NavigationStep[];
  currentStep: NavigationStep | null;
  nextStepDistance: string | null;
  stepIndex: number;
  navigationVisible: boolean;
  soundEnabled: boolean;
  isSpeaking: boolean;
  updateNavigationInstructions: (userLocation: Coordinate, journeyStarted: boolean) => boolean;
  setNavigationStepsFromRoute: (steps: NavigationStep[]) => boolean;
  announceDestinationReached: () => void;
  resetNavigation: () => void;
  getManeuverIcon: (maneuver: string, MaterialIcon: any, FontAwesome: any) => JSX.Element;
  setSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  setNavigationVisible: React.Dispatch<React.SetStateAction<boolean>>;
}

// Make sure to define the hook as a function that returns the interface
const useMapNavigation = (): UseMapNavigationReturn => {
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [nextStepDistance, setNextStepDistance] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [lastAnnouncedStep, setLastAnnouncedStep] = useState<number>(-1);
  const [navigationVisible, setNavigationVisible] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [speechQueue, setSpeechQueue] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Add a journey active state
  const [isJourneyActive, setIsJourneyActive] = useState<boolean>(false);
  const initialInstructionGivenRef = useRef<boolean>(false);

  // Refs for tracking navigation state
  const lastAnnouncedPositionRef = useRef<Coordinate | null>(null);
  const lastAnnouncementTimeRef = useRef<number>(0);
  const audioInitializedRef = useRef<boolean>(false);

  // Initialize audio system
  useEffect(() => {
    const initAudio = async () => {
      if (audioInitializedRef.current) return;

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        console.log("Audio system initialized successfully");
        audioInitializedRef.current = true;
      } catch (error) {
        console.error("Failed to initialize audio:", error);
      }
    };

    initAudio();

    // Clean up on unmount
    return () => {
      Speech.stop();
    };
  }, []);

  /**
   * Process the speech queue whenever it changes
   */
  const processSpeechQueue = useCallback(async (): Promise<void> => {
    // Skip speech processing if journey is not active
    if (!isJourneyActive) {
      // Clear queue if journey inactive
      if (speechQueue.length > 0) {
        setSpeechQueue([]);
      }
      return;
    }

    if (speechQueue.length === 0 || isSpeaking || !soundEnabled) return;

    setIsSpeaking(true);
    const instruction = speechQueue[0];

    try {
      // Stop any currently speaking instruction
      await Speech.stop();

      // Play notification sound before speaking
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/navigation-alert.mp3")
        );

        await sound.playAsync();
        console.log("Playing notification sound for instruction:", instruction);

        // Wait a moment before speaking
        setTimeout(() => {
          // Check again if journey is still active before speaking
          if (!isJourneyActive) {
            setIsSpeaking(false);
            setSpeechQueue([]);
            return;
          }

          Speech.speak(instruction, {
            language: "en-US",
            pitch: 1.0,
            rate: 0.9,
            onDone: () => {
              console.log("Finished speaking instruction");
              // Remove the spoken instruction from queue and set speaking to false
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
            onError: (error) => {
              console.warn("Error speaking instruction:", error);
              // Even on error, remove from queue and continue
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
          });
        }, 700);
      } catch (soundError) {
        console.warn("Error playing notification sound:", soundError);
        // Fallback if sound file can't be loaded
        if (isJourneyActive) {
          Speech.speak(instruction, {
            language: "en-US",
            pitch: 1.0,
            rate: 0.9,
            onDone: () => {
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
            onError: () => {
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
          });
        } else {
          setIsSpeaking(false);
          setSpeechQueue([]);
        }
      }
    } catch (error) {
      console.warn("Error with text-to-speech:", error);
      // Recover from error
      setSpeechQueue((prev) => prev.slice(1));
      setIsSpeaking(false);
    }
  }, [speechQueue, isSpeaking, soundEnabled, isJourneyActive]);

  // Process speech queue when it changes
  useEffect(() => {
    processSpeechQueue();
  }, [processSpeechQueue, speechQueue, soundEnabled, isJourneyActive]);

  /**
   * Add instruction to speech queue
   */
  const speak = useCallback(
    (instruction: string): void => {
      if (!instruction || !soundEnabled || !isJourneyActive) return;
      console.log("Adding to speech queue:", instruction);
      setSpeechQueue((prev) => [...prev, instruction]);
    },
    [soundEnabled, isJourneyActive]
  );

  /**
   * Update navigation instructions based on user location
   */
  const updateNavigationInstructions = useCallback(
    (userLocation: Coordinate, journeyStarted: boolean): boolean => {
      // Update journey active state
      if (journeyStarted !== isJourneyActive) {
        setIsJourneyActive(journeyStarted);

        // If journey just ended, clear speech queue and stop speaking
        if (!journeyStarted) {
          setSpeechQueue([]);
          Speech.stop();
          setIsSpeaking(false);
          initialInstructionGivenRef.current = false;
          console.log("Journey ended - cleared speech queue");
          return false;
        } else {
          console.log("Journey started");
        }
      }

      if (!userLocation || !journeyStarted || navigationSteps.length === 0) return false;

      // Initial instruction with delay
      if (journeyStarted && !initialInstructionGivenRef.current && navigationSteps.length > 0) {
        // Set timeout to give initial instruction after delay
        setTimeout(() => {
          if (isJourneyActive && navigationSteps.length > 0) {
            const instruction = `Starting navigation. ${navigationSteps[0].instructions}`;
            console.log("Giving initial instruction with delay:", instruction);
            speak(instruction);
            setLastAnnouncedStep(0);
            lastAnnouncementTimeRef.current = Date.now();
            initialInstructionGivenRef.current = true;
            lastAnnouncedPositionRef.current = { ...userLocation };
          }
        }, INITIAL_NAVIGATION_DELAY);

        return false;
      }

      // Find the closest upcoming step
      let minDistance = Infinity;
      let closestStepIndex = stepIndex;

      // Only check from current step index onwards to avoid going backwards
      for (let i = stepIndex; i < navigationSteps.length; i++) {
        const step = navigationSteps[i];
        const distanceToStep = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          step.endLocation.latitude,
          step.endLocation.longitude
        );

        if (distanceToStep < minDistance) {
          minDistance = distanceToStep;
          closestStepIndex = i;
        }
      }

      // Get current time to enforce cooldown
      const now = Date.now();
      const timeSinceLastAnnouncement = now - lastAnnouncementTimeRef.current;
      const canAnnounce = timeSinceLastAnnouncement > ANNOUNCEMENT_COOLDOWN;

      // Calculate how far user has moved since last announcement
      let distanceMoved = Infinity;
      if (lastAnnouncedPositionRef.current) {
        distanceMoved = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          lastAnnouncedPositionRef.current.latitude,
          lastAnnouncedPositionRef.current.longitude
        );
      }

      // Only allow announcements if user has moved at least 20 meters (increased from 10)
      const hasMovedEnough = distanceMoved > 20;
      let announcementMade = false;

      // Moving to a new step - announce only once when we first detect the step change
      if (closestStepIndex > stepIndex) {
        console.log(`Moving to new step: ${closestStepIndex} from ${stepIndex}`);
        setCurrentStep(navigationSteps[closestStepIndex]);
        setStepIndex(closestStepIndex);

        // Speak only when moving to a new step AND we haven't announced it yet AND cooldown passed
        if (closestStepIndex !== lastAnnouncedStep && canAnnounce) {
          const instruction = navigationSteps[closestStepIndex].instructions;
          console.log("Announcing new step:", instruction);
          speak(instruction);
          setLastAnnouncedStep(closestStepIndex);
          lastAnnouncementTimeRef.current = now;
          // Store position where announcement was made
          lastAnnouncedPositionRef.current = { ...userLocation };
          announcementMade = true;
        }
      }

      // Update the distance to the next maneuver
      if (closestStepIndex < navigationSteps.length) {
        const distanceToNextStep = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          navigationSteps[closestStepIndex].endLocation.latitude,
          navigationSteps[closestStepIndex].endLocation.longitude
        );

        // Format the distance for display
        if (distanceToNextStep > 1000) {
          setNextStepDistance(`${(distanceToNextStep / 1000).toFixed(1)} km`);
        } else {
          setNextStepDistance(`${Math.round(distanceToNextStep)} m`);
        }

        // Announce approaching maneuver at key distances
        // More structured approach to avoid strange announcement points
        if (canAnnounce && hasMovedEnough) {
          // Only announce at specific distance thresholds
          if (distanceToNextStep <= 100 && distanceToNextStep >= 90) {
            const instruction = `In 100 meters, ${navigationSteps[closestStepIndex].instructions}`;
            console.log("Announcing 100m approach:", instruction);
            speak(instruction);
            lastAnnouncementTimeRef.current = now;
            lastAnnouncedPositionRef.current = { ...userLocation };
            announcementMade = true;
          } else if (distanceToNextStep <= 50 && distanceToNextStep >= 40) {
            const instruction = `In 50 meters, ${navigationSteps[closestStepIndex].instructions}`;
            console.log("Announcing 50m approach:", instruction);
            speak(instruction);
            lastAnnouncementTimeRef.current = now;
            lastAnnouncedPositionRef.current = { ...userLocation };
            announcementMade = true;
          }
        }
      }

      return announcementMade;
    },
    [navigationSteps, stepIndex, lastAnnouncedStep, speak, isJourneyActive]
  );

  /**
   * Set navigation steps from route data
   */
  const setNavigationStepsFromRoute = useCallback((steps: NavigationStep[]): boolean => {
    if (!steps || !steps.length) return false;

    setNavigationSteps(steps);

    // Initialize with the first step
    if (steps.length > 0) {
      setCurrentStep(steps[0]);
      setStepIndex(0);
      setLastAnnouncedStep(-1); // Reset so we announce first step
      initialInstructionGivenRef.current = false;
    }

    console.log(`Route loaded with ${steps.length} navigation steps`);
    return true;
  }, []);

  /**
   * Announce destination reached
   */
  const announceDestinationReached = useCallback((): void => {
    if (!isJourneyActive) return;

    // Clear any existing queue
    setSpeechQueue([]);
    Speech.stop();

    const instruction = "You have reached your destination.";
    console.log("Announcing destination reached");
    speak(instruction);

    // After destination announcement, consider journey over
    setTimeout(() => {
      setIsJourneyActive(false);
    }, 5000);
  }, [speak, isJourneyActive]);

  /**
   * Reset navigation state
   */
  const resetNavigation = useCallback((): void => {
    setNavigationSteps([]);
    setCurrentStep(null);
    setStepIndex(0);
    setLastAnnouncedStep(-1);
    setNavigationVisible(true);
    setIsJourneyActive(false);
    initialInstructionGivenRef.current = false;

    // Clear speech queue and stop any speaking
    setSpeechQueue([]);
    setIsSpeaking(false);
    Speech.stop();

    console.log("Navigation reset complete");
  }, []);

  /**
   * Function to determine which maneuver icon to show
   */
  const getManeuverIcon = useCallback(
    (maneuver: string, MaterialIcon: any, FontAwesome: any): JSX.Element => {
      switch (maneuver) {
        case "turn-right":
          return <MaterialIcon name="turn-right" size={28} color="#fff" />;
        case "turn-slight-right":
          return <MaterialIcon name="turn-slight-right" size={28} color="#fff" />;
        case "turn-sharp-right":
          return <MaterialIcon name="turn-sharp-right" size={28} color="#fff" />;
        case "turn-left":
          return <MaterialIcon name="turn-left" size={28} color="#fff" />;
        case "turn-slight-left":
          return <MaterialIcon name="turn-slight-left" size={28} color="#fff" />;
        case "turn-sharp-left":
          return <MaterialIcon name="turn-sharp-left" size={28} color="#fff" />;
        case "roundabout-right":
        case "roundabout-left":
          return <MaterialIcon name="rotate-right" size={28} color="#fff" />;
        case "uturn-right":
        case "uturn-left":
          return <MaterialIcon name="u-turn-right" size={28} color="#fff" />;
        case "ramp-right":
        case "ramp-left":
          return <MaterialIcon name="turn-slight-right" size={28} color="#fff" />;
        case "merge":
          return <MaterialIcon name="merge-type" size={28} color="#fff" />;
        case "fork-right":
        case "fork-left":
          return <FontAwesome name="code-fork" size={28} color="#fff" />;
        case "straight":
          return <MaterialIcon name="arrow-upward" size={28} color="#fff" />;
        default:
          return <MaterialIcon name="directions" size={28} color="#fff" />;
      }
    },
    []
  );

  return {
    navigationSteps,
    currentStep,
    nextStepDistance,
    stepIndex,
    navigationVisible,
    soundEnabled,
    isSpeaking,
    updateNavigationInstructions,
    setNavigationStepsFromRoute,
    announceDestinationReached,
    resetNavigation,
    getManeuverIcon,
    setSoundEnabled,
    setNavigationVisible,
  };
};

export default useMapNavigation;
