import { useCallback } from "react";
import * as Speech from "expo-speech";

export const useTextToSpeech = () => {
  const languageCodeMap: { [key: string]: string } = {
    French: "fr-FR",
    Spanish: "es-ES",
    Italian: "it-IT",
    German: "de-DE",
    Japanese: "ja-JP",
    Chinese: "zh-CN",
    Mandarin: "zh-CN",
    Cantonese: "zh-HK",
    Korean: "ko-KR",
  };

  const speakPhrase = useCallback((phrase: string, language: string) => {
    const languageCode = languageCodeMap[language] || "en-US";

    const options = {
      language: languageCode,
      pitch: 1.0,
      rate: 0.75,
    };

    Speech.stop();

    Speech.speak(phrase, options);

    console.log(`Speaking phrase in ${language} (${languageCode}): "${phrase}"`);
  }, []);

  return { speakPhrase };
};

export default useTextToSpeech;
