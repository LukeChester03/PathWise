import React from "react";
import { View } from "react-native";
import { TabSection } from "../../../screens/AdvancedTravelAnalysisScreen";
import { AdvancedTravelAnalysis } from "../../../types/LearnScreen/TravelAnalysisTypes";
import TemporalTab from "./Tabs/TemporalTab";
import SpatialTab from "./Tabs/SpatialTab";
import BehavioralTab from "./Tabs/BehaviouralTab";
import PredictiveTab from "./Tabs/PredictiveTab";
import InsightsTab from "./Tabs/InsightsTab";
import ComparativeTab from "./Tabs/ComparitiveTab";

type TabContentProps = {
  activeTab: TabSection;
  analysis: AdvancedTravelAnalysis | null;
};

const TabContent: React.FC<TabContentProps> = ({ activeTab, analysis }) => {
  if (!analysis) return null;

  switch (activeTab) {
    case "temporal":
      return <TemporalTab temporalAnalysis={analysis.temporalAnalysis} />;
    case "spatial":
      return <SpatialTab spatialAnalysis={analysis.spatialAnalysis} />;
    case "behavioral":
      return <BehavioralTab behavioralAnalysis={analysis.behavioralAnalysis} />;
    case "predictive":
      return <PredictiveTab predictiveAnalysis={analysis.predictiveAnalysis} />;
    case "insights":
      return <InsightsTab analyticalInsights={analysis.analyticalInsights} />;
    case "comparative":
      return <ComparativeTab comparativeAnalysis={analysis.comparativeAnalysis} />;
    default:
      return <View />;
  }
};

export default TabContent;
