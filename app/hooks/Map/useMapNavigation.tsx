import { useState, useRef, useCallback, useEffect } from "react";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { calcDist } from "../../utils/mapUtils";
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

  const [isJourneyActive, setIsJourneyActive] = useState<boolean>(false);
  const initialInstructionGivenRef = useRef<boolean>(false);

  const lastAnnouncedPositionRef = useRef<Coordinate | null>(null);
  const lastAnnouncementTimeRef = useRef<number>(0);
  const audioInitializedRef = useRef<boolean>(false);

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

    return () => {
      Speech.stop();
    };
  }, []);

  const processSpeechQueue = useCallback(async (): Promise<void> => {
    if (!isJourneyActive) {
      if (speechQueue.length > 0) {
        setSpeechQueue([]);
      }
      return;
    }

    if (speechQueue.length === 0 || isSpeaking || !soundEnabled) return;

    setIsSpeaking(true);
    const instruction = speechQueue[0];

    try {
      await Speech.stop();
      try {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/navigation-alert.mp3")
        );

        await sound.playAsync();
        console.log("Playing notification sound for instruction:", instruction);
        setTimeout(() => {
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
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
            onError: (error) => {
              console.warn("Error speaking instruction:", error);
              setSpeechQueue((prev) => prev.slice(1));
              setIsSpeaking(false);
            },
          });
        }, 700);
      } catch (soundError) {
        console.warn("Error playing notification sound:", soundError);
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
      setSpeechQueue((prev) => prev.slice(1));
      setIsSpeaking(false);
    }
  }, [speechQueue, isSpeaking, soundEnabled, isJourneyActive]);

  useEffect(() => {
    processSpeechQueue();
  }, [processSpeechQueue, speechQueue, soundEnabled, isJourneyActive]);

  const speak = useCallback(
    (instruction: string): void => {
      if (!instruction || !soundEnabled || !isJourneyActive) return;
      console.log("Adding to speech queue:", instruction);
      setSpeechQueue((prev) => [...prev, instruction]);
    },
    [soundEnabled, isJourneyActive]
  );

  const updateNavigationInstructions = useCallback(
    (userLocation: Coordinate, journeyStarted: boolean): boolean => {
      if (journeyStarted !== isJourneyActive) {
        setIsJourneyActive(journeyStarted);

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

      if (journeyStarted && !initialInstructionGivenRef.current && navigationSteps.length > 0) {
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

      let minDistance = Infinity;
      let closestStepIndex = stepIndex;

      for (let i = stepIndex; i < navigationSteps.length; i++) {
        const step = navigationSteps[i];
        const distanceToStep = calcDist(
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

      const now = Date.now();
      const timeSinceLastAnnouncement = now - lastAnnouncementTimeRef.current;
      const canAnnounce = timeSinceLastAnnouncement > ANNOUNCEMENT_COOLDOWN;

      let distanceMoved = Infinity;
      if (lastAnnouncedPositionRef.current) {
        distanceMoved = calcDist(
          userLocation.latitude,
          userLocation.longitude,
          lastAnnouncedPositionRef.current.latitude,
          lastAnnouncedPositionRef.current.longitude
        );
      }

      const hasMovedEnough = distanceMoved > 20;
      let announcementMade = false;

      if (closestStepIndex > stepIndex) {
        console.log(`Moving to new step: ${closestStepIndex} from ${stepIndex}`);
        setCurrentStep(navigationSteps[closestStepIndex]);
        setStepIndex(closestStepIndex);

        if (closestStepIndex !== lastAnnouncedStep && canAnnounce) {
          const instruction = navigationSteps[closestStepIndex].instructions;
          console.log("Announcing new step:", instruction);
          speak(instruction);
          setLastAnnouncedStep(closestStepIndex);
          lastAnnouncementTimeRef.current = now;
          lastAnnouncedPositionRef.current = { ...userLocation };
          announcementMade = true;
        }
      }

      if (closestStepIndex < navigationSteps.length) {
        const distanceToNextStep = calcDist(
          userLocation.latitude,
          userLocation.longitude,
          navigationSteps[closestStepIndex].endLocation.latitude,
          navigationSteps[closestStepIndex].endLocation.longitude
        );

        if (distanceToNextStep > 1000) {
          setNextStepDistance(`${(distanceToNextStep / 1000).toFixed(1)} km`);
        } else {
          setNextStepDistance(`${Math.round(distanceToNextStep)} m`);
        }

        if (canAnnounce && hasMovedEnough) {
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

  const setNavigationStepsFromRoute = useCallback((steps: NavigationStep[]): boolean => {
    if (!steps || !steps.length) return false;

    setNavigationSteps(steps);

    if (steps.length > 0) {
      setCurrentStep(steps[0]);
      setStepIndex(0);
      setLastAnnouncedStep(-1);
      initialInstructionGivenRef.current = false;
    }

    console.log(`Route loaded with ${steps.length} navigation steps`);
    return true;
  }, []);

  const announceDestinationReached = useCallback((): void => {
    if (!isJourneyActive) return;

    setSpeechQueue([]);
    Speech.stop();

    const instruction = "You have reached your destination.";
    console.log("Announcing destination reached");
    speak(instruction);
    setTimeout(() => {
      setIsJourneyActive(false);
    }, 5000);
  }, [speak, isJourneyActive]);

  const resetNavigation = useCallback((): void => {
    setNavigationSteps([]);
    setCurrentStep(null);
    setStepIndex(0);
    setLastAnnouncedStep(-1);
    setNavigationVisible(true);
    setIsJourneyActive(false);
    initialInstructionGivenRef.current = false;
    setSpeechQueue([]);
    setIsSpeaking(false);
    Speech.stop();

    console.log("Navigation reset complete");
  }, []);

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
