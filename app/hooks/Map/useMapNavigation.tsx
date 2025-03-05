// useMapNavigation.ts - Hook for handling navigation instructions and speech
import { useState, useRef, useCallback, useEffect } from "react";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { haversineDistance } from "../../utils/mapUtils";
import { ANNOUNCEMENT_COOLDOWN } from "../../constants/Map/mapConstants";
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

  // Refs for tracking navigation state
  const lastAnnouncedPositionRef = useRef<Coordinate | null>(null);
  const lastAnnouncementTimeRef = useRef<number>(0);

  /**
   * Process the speech queue whenever it changes
   */
  const processSpeechQueue = useCallback(async (): Promise<void> => {
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

        // Wait a moment before speaking
        setTimeout(() => {
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
      }
    } catch (error) {
      console.warn("Error with text-to-speech:", error);
      // Recover from error
      setSpeechQueue((prev) => prev.slice(1));
      setIsSpeaking(false);
    }
  }, [speechQueue, isSpeaking, soundEnabled]);

  // Process speech queue when it changes
  useEffect(() => {
    processSpeechQueue();
  }, [processSpeechQueue, speechQueue, soundEnabled]);

  /**
   * Add instruction to speech queue
   */
  const speak = useCallback(
    (instruction: string): void => {
      if (!instruction || !soundEnabled) return;
      setSpeechQueue((prev) => [...prev, instruction]);
    },
    [soundEnabled]
  );

  /**
   * Update navigation instructions based on user location
   */
  const updateNavigationInstructions = useCallback(
    (userLocation: Coordinate, journeyStarted: boolean): boolean => {
      if (!userLocation || !journeyStarted || navigationSteps.length === 0) return false;

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

      // Only allow announcements if user has moved at least 10 meters
      const hasMovedEnough = distanceMoved > 10;
      let announcementMade = false;

      // Moving to a new step - announce only once when we first detect the step change
      if (closestStepIndex > stepIndex) {
        setCurrentStep(navigationSteps[closestStepIndex]);
        setStepIndex(closestStepIndex);

        // Speak only when moving to a new step AND we haven't announced it yet
        if (closestStepIndex !== lastAnnouncedStep && canAnnounce) {
          const instruction = navigationSteps[closestStepIndex].instructions;
          speak(instruction);
          setLastAnnouncedStep(closestStepIndex);
          lastAnnouncementTimeRef.current = now;
          // Store position where announcement was made
          lastAnnouncedPositionRef.current = { ...userLocation };
          announcementMade = true;
        }
      }
      // First announcement only happens once at the beginning
      else if (stepIndex === 0 && lastAnnouncedStep === -1 && canAnnounce) {
        // This is the very first announcement for the initial step
        const instruction = `Starting navigation. ${navigationSteps[0].instructions}`;
        speak(instruction);
        setLastAnnouncedStep(0);
        lastAnnouncementTimeRef.current = now;
        // Store position where announcement was made
        lastAnnouncedPositionRef.current = { ...userLocation };
        announcementMade = true;
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

        // Only announce "approaching" when:
        // 1. We're in the right distance range
        // 2. We're still on the same step to avoid duplication
        // 3. Enough time has passed
        // 4. User has moved at least 10 meters since last announcement
        if (
          distanceToNextStep < 50 &&
          distanceToNextStep > 20 &&
          closestStepIndex === lastAnnouncedStep &&
          canAnnounce &&
          hasMovedEnough
        ) {
          const instruction = `In ${Math.round(distanceToNextStep)} meters, ${
            navigationSteps[closestStepIndex].instructions
          }`;
          speak(instruction);
          lastAnnouncementTimeRef.current = now;
          // Store position where announcement was made
          lastAnnouncedPositionRef.current = { ...userLocation };
          announcementMade = true;
        }
      }

      return announcementMade;
    },
    [navigationSteps, stepIndex, lastAnnouncedStep, speak]
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
    }

    console.log(`Route loaded with ${steps.length} navigation steps`);
    return true;
  }, []);

  /**
   * Announce destination reached
   */
  const announceDestinationReached = useCallback((): void => {
    const instruction = "You have reached your destination.";
    speak(instruction);
  }, [speak]);

  /**
   * Reset navigation state
   */
  const resetNavigation = useCallback((): void => {
    setNavigationSteps([]);
    setCurrentStep(null);
    setStepIndex(0);
    setLastAnnouncedStep(-1);
    setNavigationVisible(true);

    // Clear speech queue and stop any speaking
    setSpeechQueue([]);
    setIsSpeaking(false);
    Speech.stop();
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

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

// Make sure to properly export the hook as a function
export default useMapNavigation;
