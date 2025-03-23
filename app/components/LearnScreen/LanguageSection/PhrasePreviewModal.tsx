// components/PhrasePreviewModal.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Phrase } from "../../../types/LearnScreen/LanguageTypes";
import { Colors } from "../../../constants/colours";
import PhrasePreviewCard from "./PhrasePreviewCard";

interface PhrasePreviewModalProps {
  visible: boolean;
  phrases: Phrase[];
  countryName: string | null;
  isLoading: boolean;
  onClose: () => void;
  onAddAll: () => void;
}

const PhrasePreviewModal: React.FC<PhrasePreviewModalProps> = ({
  visible,
  phrases,
  countryName,
  isLoading,
  onClose,
  onAddAll,
}) => {
  // Function to get a flag emoji from country name
  const getCountryFlag = (countryName: string) => {
    const flags: { [key: string]: string } = {
      France: "🇫🇷",
      Italy: "🇮🇹",
      Spain: "🇪🇸",
      Japan: "🇯🇵",
      China: "🇨🇳",
      Germany: "🇩🇪",
      Thailand: "🇹🇭",
      Mexico: "🇲🇽",
      Brazil: "🇧🇷",
      "United Kingdom": "🇬🇧",
      "United States": "🇺🇸",
      Canada: "🇨🇦",
      Australia: "🇦🇺",
      Russia: "🇷🇺",
      India: "🇮🇳",
      Greece: "🇬🇷",
      Portugal: "🇵🇹",
      Netherlands: "🇳🇱",
      Sweden: "🇸🇪",
      Norway: "🇳🇴",
      Finland: "🇫🇮",
      Denmark: "🇩🇰",
      Poland: "🇵🇱",
      Switzerland: "🇨🇭",
      Austria: "🇦🇹",
      Belgium: "🇧🇪",
      Ireland: "🇮🇪",
      "New Zealand": "🇳🇿",
      "South Korea": "🇰🇷",
      Singapore: "🇸🇬",
    };

    return flags[countryName] || "🌍";
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.previewModalContainer}>
          <View style={styles.modalDragIndicator} />

          {/* Header */}
          <View style={styles.previewModalHeader}>
            <Text style={styles.previewModalFlag}>{getCountryFlag(countryName || "")}</Text>
            <View style={styles.previewModalTitleContainer}>
              <Text style={styles.previewModalTitle}>{`${phrases.length} New Phrases`}</Text>
              <Text style={styles.previewModalSubtitle}>
                {`Learn some ${phrases[0]?.language || ""} phrases from ${countryName}`}
              </Text>
            </View>
            <TouchableOpacity style={styles.previewModalCloseButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Preview List */}
          <FlatList
            data={phrases.slice(0, 3)} // Show just the first 3 phrases as a preview
            renderItem={({ item }) => <PhrasePreviewCard phrase={item} />}
            keyExtractor={(item) => item.id || `preview-${Math.random()}`}
            contentContainerStyle={styles.previewListContainer}
            ItemSeparatorComponent={() => <View style={styles.previewSeparator} />}
            ListFooterComponent={
              phrases.length > 3 ? (
                <View style={styles.previewMoreContainer}>
                  <Text style={styles.previewMoreText}>
                    {`+ ${phrases.length - 3} more phrases`}
                  </Text>
                </View>
              ) : null
            }
          />

          {/* Action Buttons */}
          <View style={styles.previewActionContainer}>
            <TouchableOpacity style={styles.previewCancelButton} onPress={onClose}>
              <Text style={styles.previewCancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewAddButton}
              onPress={onAddAll}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="heart" size={18} color="#FFFFFF" style={styles.previewAddIcon} />
                  <Text style={styles.previewAddButtonText}>Add All to Phrasebook</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  previewModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "90%",
  },
  modalDragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  previewModalFlag: {
    fontSize: 36,
    marginRight: 12,
  },
  previewModalTitleContainer: {
    flex: 1,
  },
  previewModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  previewModalSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  previewModalCloseButton: {
    padding: 4,
  },
  previewListContainer: {
    paddingBottom: 16,
  },
  previewSeparator: {
    height: 12,
  },
  previewMoreContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  previewMoreText: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  previewActionContainer: {
    flexDirection: "row",
    marginTop: 24,
  },
  previewCancelButton: {
    flex: 1,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    marginRight: 12,
  },
  previewCancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#4B5563",
  },
  previewAddButton: {
    flex: 2,
    flexDirection: "row",
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  previewAddButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  previewAddIcon: {
    marginRight: 8,
  },
});

export default PhrasePreviewModal;
