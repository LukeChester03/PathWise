import { useCallback } from "react";
import * as Speech from "expo-speech";

/**
 * Custom hook for text-to-speech functionality
 * Provides a function to speak phrases in different languages
 */
export const useTextToSpeech = () => {
  // Map language names to language codes for better TTS
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
    Portuguese: "pt-PT",
    "Brazilian Portuguese": "pt-BR",
    Russian: "ru-RU",
    Arabic: "ar-SA",
    Hindi: "hi-IN",
    Thai: "th-TH",
    Dutch: "nl-NL",
    Swedish: "sv-SE",
    Greek: "el-GR",
    Turkish: "tr-TR",
    Polish: "pl-PL",
    Norwegian: "no-NO",
    Finnish: "fi-FI",
    Danish: "da-DK",
    Indonesian: "id-ID",
    Vietnamese: "vi-VN",
    Czech: "cs-CZ",
    Hungarian: "hu-HU",
    Ukrainian: "uk-UA",
    Hebrew: "he-IL",
    // Add more language mappings as needed
  };

  /**
   * Speak a phrase in the specified language
   * @param phrase - The text to speak
   * @param language - The language name (e.g., "French", "Spanish")
   */
  const speakPhrase = useCallback((phrase: string, language: string) => {
    // Get the language code, or fall back to English if not found
    const languageCode = languageCodeMap[language] || "en-US";

    // Configure speech options
    const options = {
      language: languageCode,
      pitch: 1.0,
      rate: 0.75, // Slightly slower for better clarity
    };

    // Stop any currently speaking voice
    Speech.stop();

    // Start speaking the phrase
    Speech.speak(phrase, options);

    console.log(`Speaking phrase in ${language} (${languageCode}): "${phrase}"`);
  }, []);

  return { speakPhrase };
};

export default useTextToSpeech;
