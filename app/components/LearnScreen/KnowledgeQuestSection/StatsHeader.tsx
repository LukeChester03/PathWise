// components/LearnScreen/KnowledgeQuestSection/StatsHeader.tsx
import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { KnowledgeQuestStats } from "../../../types/LearnScreen/KnowledgeQuestTypes";

interface StatsHeaderProps {
  stats: KnowledgeQuestStats | null;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({ stats }) => {
  return (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={["#8B5CF6", "#6366F1"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.statsContainer}>
          {stats ? (
            <>
              {/* <View style={styles.topStatsRow}> */}
              {/* <View style={styles.statCard}>
                  <Text style={styles.statValue}>{stats.level}</Text>
                  <Text style={styles.statLabel}>Level</Text>
                </View> */}

              {/* <View style={styles.levelProgressContainer}>
                  <View style={styles.levelProgress}>
                    <View
                      style={[
                        styles.levelProgressFill,
                        {
                          width: `${Math.min(
                            100,
                            Math.max(0, 100 - (stats.pointsToNextLevel / 150) * 100)
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.levelProgressText}>
                    {stats.pointsToNextLevel} points to next level
                  </Text>
                </View> */}
              {/* </View> */}

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalQuizzesTaken}</Text>
                  <Text style={styles.statLabel}>Quizzes</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.accuracy}%</Text>
                  <Text style={styles.statLabel}>Accuracy</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.streakDays}</Text>
                  <Text style={styles.statLabel}>Day Streak</Text>
                </View>
              </View>
            </>
          ) : (
            <ActivityIndicator color="#FFFFFF" size="small" />
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  headerGradient: {
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  statsContainer: {
    padding: 16,
  },
  topStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  statCard: {
    alignItems: "center",
    marginRight: 16,
  },
  levelProgressContainer: {
    flex: 1,
  },
  levelProgress: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  levelProgressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
  },
  levelProgressText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 8,
  },
});

export default StatsHeader;
