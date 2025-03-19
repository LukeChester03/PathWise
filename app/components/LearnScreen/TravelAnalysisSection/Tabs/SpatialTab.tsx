// components/AdvancedAnalysis/tabs/SpatialTab.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, NeutralColors } from "../../../../constants/colours";
import SectionCard, { NoDataText } from "../SectionCard";
import TabContainer from "../TabContainer";

type SpatialTabProps = {
  spatialAnalysis: any; // Use proper type from your TravelAnalysisTypes
};

const SpatialTab: React.FC<SpatialTabProps> = ({ spatialAnalysis }) => {
  if (!spatialAnalysis) return null;

  return (
    <TabContainer>
      <SectionCard
        title="Exploration Radius"
        description="How far you typically travel from your home base"
        icon="locate"
      >
        {spatialAnalysis.explorationRadius ? (
          <View style={styles.radiusMetricsContainer}>
            <View style={styles.radiusMetric}>
              <View style={styles.radiusMetricValue}>
                <Text style={styles.radiusValue}>{spatialAnalysis.explorationRadius.average}</Text>
                <Text style={styles.radiusUnit}>km</Text>
              </View>
              <Text style={styles.radiusLabel}>Average</Text>
            </View>

            <View style={styles.radiusMetric}>
              <View style={styles.radiusMetricValue}>
                <Text style={styles.radiusValue}>{spatialAnalysis.explorationRadius.maximum}</Text>
                <Text style={styles.radiusUnit}>km</Text>
              </View>
              <Text style={styles.radiusLabel}>Maximum</Text>
            </View>

            <View style={styles.radiusMetric}>
              <View style={styles.radiusMetricValue}>
                <Text style={styles.radiusValue}>
                  {spatialAnalysis.explorationRadius.growthRate}
                </Text>
                <Text style={styles.radiusUnit}>%</Text>
              </View>
              <Text style={styles.radiusLabel}>Growth Rate</Text>
            </View>
          </View>
        ) : (
          <NoDataText text="No exploration radius data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Location Clusters"
        description="Concentrations of your visited locations"
        icon="git-branch"
      >
        {spatialAnalysis.locationClusters && spatialAnalysis.locationClusters.length > 0 ? (
          <View style={styles.clustersContainer}>
            {spatialAnalysis.locationClusters.map((cluster: any, index: number) => (
              <View key={index} style={styles.clusterCard}>
                <View style={styles.clusterHeader}>
                  <Text style={styles.clusterName}>{cluster.clusterName}</Text>
                  <View style={styles.clusterVisits}>
                    <Text style={styles.clusterVisitsText}>{cluster.numberOfVisits} visits</Text>
                  </View>
                </View>

                <Text style={styles.clusterCenter}>Center point: {cluster.centerPoint}</Text>

                <View style={styles.clusterCategories}>
                  <Text style={styles.clusterCategoriesLabel}>Top categories:</Text>
                  <View style={styles.categoryTags}>
                    {(cluster.topCategories || []).map((category: string, idx: number) => (
                      <View key={idx} style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{category}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <NoDataText text="No cluster data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Directional Tendencies"
        description="Your preferred travel directions"
        icon="compass"
      >
        {spatialAnalysis.directionTendencies ? (
          <View style={styles.directionContainer}>
            <View style={styles.compassRose}>
              {spatialAnalysis.directionTendencies.directionPercentages &&
                Object.entries(spatialAnalysis.directionTendencies.directionPercentages).map(
                  ([direction, percentage]: [string, any]) => (
                    <View
                      key={direction}
                      style={[
                        styles.directionSegment,
                        direction === "N" && styles.northSegment,
                        direction === "S" && styles.southSegment,
                        direction === "E" && styles.eastSegment,
                        direction === "W" && styles.westSegment,
                        direction === "NE" && styles.northeastSegment,
                        direction === "NW" && styles.northwestSegment,
                        direction === "SE" && styles.southeastSegment,
                        direction === "SW" && styles.southwestSegment,
                        spatialAnalysis.directionTendencies.primaryDirection === direction &&
                          styles.primaryDirectionSegment,
                        spatialAnalysis.directionTendencies.secondaryDirection === direction &&
                          styles.secondaryDirectionSegment,
                      ]}
                    >
                      <Text style={styles.directionLetter}>{direction}</Text>
                      <Text style={styles.directionPercentage}>{percentage}%</Text>
                    </View>
                  )
                )}
              <View style={styles.compassCenter} />
            </View>

            <View style={styles.directionInsight}>
              <Text style={styles.directionInsightText}>
                {spatialAnalysis.directionTendencies.insight || "No directional insight available"}
              </Text>
            </View>
          </View>
        ) : (
          <NoDataText text="No directional tendencies data available" />
        )}
      </SectionCard>

      <SectionCard
        title="Regional Diversity"
        description="The breadth of your geographical exploration"
        icon="globe"
      >
        {spatialAnalysis.regionDiversity ? (
          <View style={styles.regionDiversityContainer}>
            <View style={styles.regionMetrics}>
              <View style={styles.regionMetric}>
                <Text style={styles.regionMetricValue}>
                  {spatialAnalysis.regionDiversity.uniqueRegions}
                </Text>
                <Text style={styles.regionMetricLabel}>Unique Regions</Text>
              </View>

              <View style={styles.regionMetric}>
                <Text style={styles.regionMetricValue}>
                  {spatialAnalysis.regionDiversity.regionSpread}
                </Text>
                <Text style={styles.regionMetricLabel}>Region Spread</Text>
              </View>
            </View>

            <View style={styles.regionExplorationContainer}>
              <View style={styles.regionExploration}>
                <Text style={styles.regionExplorationLabel}>Most Explored:</Text>
                <Text style={styles.regionExplorationValue}>
                  {spatialAnalysis.regionDiversity.mostExploredRegion}
                </Text>
              </View>

              <View style={styles.regionExploration}>
                <Text style={styles.regionExplorationLabel}>Least Explored:</Text>
                <Text style={styles.regionExplorationValue}>
                  {spatialAnalysis.regionDiversity.leastExploredRegion}
                </Text>
              </View>
            </View>

            <View style={styles.diversityInsight}>
              <Text style={styles.diversityInsightText}>
                {spatialAnalysis.regionDiversity.diversityInsight ||
                  "No diversity insight available"}
              </Text>
            </View>
          </View>
        ) : (
          <NoDataText text="No regional diversity data available" />
        )}
      </SectionCard>
    </TabContainer>
  );
};

const styles = StyleSheet.create({
  radiusMetricsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  radiusMetric: {
    alignItems: "center",
    flex: 1,
  },
  radiusMetricValue: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  radiusValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  radiusUnit: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginLeft: 2,
    marginBottom: 2,
  },
  radiusLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
  clustersContainer: {
    marginTop: 16,
  },
  clusterCard: {
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  clusterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clusterName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  clusterVisits: {
    backgroundColor: `${Colors.primary}33`, // 20% opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  clusterVisitsText: {
    fontSize: 12,
    fontWeight: "500",
    color: Colors.primary,
  },
  clusterCenter: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  clusterCategories: {
    marginTop: 4,
  },
  clusterCategoriesLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginBottom: 4,
  },
  categoryTags: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  categoryTag: {
    backgroundColor: `${Colors.primary}26`, // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryTagText: {
    fontSize: 12,
    color: Colors.primary,
  },
  directionContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  compassRose: {
    width: 200,
    height: 200,
    position: "relative",
    marginBottom: 16,
  },
  directionSegment: {
    position: "absolute",
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${Colors.primary}1A`, // 10% opacity
    borderRadius: 8,
  },
  northSegment: {
    top: 0,
    left: 70,
  },
  southSegment: {
    bottom: 0,
    left: 70,
  },
  eastSegment: {
    right: 0,
    top: 70,
  },
  westSegment: {
    left: 0,
    top: 70,
  },
  northeastSegment: {
    top: 15,
    right: 15,
  },
  northwestSegment: {
    top: 15,
    left: 15,
  },
  southeastSegment: {
    bottom: 15,
    right: 15,
  },
  southwestSegment: {
    bottom: 15,
    left: 15,
  },
  primaryDirectionSegment: {
    backgroundColor: `${Colors.primary}66`, // 40% opacity
  },
  secondaryDirectionSegment: {
    backgroundColor: `${Colors.primary}40`, // 25% opacity
  },
  compassCenter: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    top: 90,
    left: 90,
  },
  directionLetter: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  directionPercentage: {
    fontSize: 12,
    color: NeutralColors.gray600,
  },
  directionInsight: {
    marginTop: 8,
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    width: "100%",
  },
  directionInsightText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: "center",
    fontStyle: "italic",
  },
  regionDiversityContainer: {
    marginTop: 16,
  },
  regionMetrics: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
  },
  regionMetric: {
    alignItems: "center",
  },
  regionMetricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.primary,
  },
  regionMetricLabel: {
    fontSize: 12,
    color: NeutralColors.gray600,
    marginTop: 4,
  },
  regionExplorationContainer: {
    marginBottom: 16,
  },
  regionExploration: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  regionExplorationLabel: {
    fontSize: 14,
    color: NeutralColors.gray600,
  },
  regionExplorationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  diversityInsight: {
    padding: 12,
    backgroundColor: NeutralColors.gray100,
    borderRadius: 8,
  },
  diversityInsightText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: "italic",
    textAlign: "center",
  },
});

export default SpatialTab;
