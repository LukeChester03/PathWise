import React, { useEffect, useState, useRef } from "react";
import MapView, { PROVIDER_GOOGLE, Circle, Marker } from "react-native-maps";
import { View, StyleSheet, ActivityIndicator, TouchableOpacity, Text } from "react-native";
import MapViewDirections from "react-native-maps-directions";
import { initializeMap } from "../../controllers/Map/mapController";
import {
  handleMarkerPress,
  handleStartJourney,
  handleCancel,
  handleRegionChangeComplete,
} from "../../handlers/Map/mapHandlers";
import { requestLocationPermission } from "../../controllers/Map/locationController";
import { Region, Place } from "../../types/MapTypes";
import ExploreCard from "./ExploreCard";
import DetailsCard from "./DetailsCard";
import { Colors } from "../../constants/colours";
import { customMapStyle } from "../../constants/mapStyle";

const GOOGLE_MAPS_APIKEY = "AIzaSyDAGq_6eJGQpR3RcO0NrVOowel9-DxZkvA";

export default function Map() {
  const [region, setRegion] = useState<Region | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<
    { latitude: number; longitude: number }[]
  >([]);
  const [travelTime, setTravelTime] = useState<string | null>(null);
  const [distance, setDistance] = useState<string | null>(null);
  const [showCard, setShowCard] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [journeyStarted, setJourneyStarted] = useState<boolean>(false);
  const [confirmEndJourney, setConfirmEndJourney] = useState<boolean>(false);
  const [userLocation, setUserLocation] = useState<Region | null>(null);
  const [isMapFocused, setIsMapFocused] = useState<boolean>(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const init = async () => {
      const mapData = await initializeMap();
      if (mapData) {
        setRegion(mapData.region);
        setUserLocation(mapData.region);
        setPlaces(mapData.places);
        setLoading(false);
      }
    };
    init();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const markersToDisplay = journeyStarted && selectedPlace ? [selectedPlace] : places;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region || undefined}
        customMapStyle={customMapStyle}
        showsPointsOfInterest={false}
        showsUserLocation
        showsMyLocationButton
        provider={PROVIDER_GOOGLE}
        onRegionChangeComplete={(region) =>
          handleRegionChangeComplete(journeyStarted, setIsMapFocused, mapRef, userLocation)
        }
      >
        <Circle center={userLocation || region} radius={250} strokeColor={Colors.primary} />
        {markersToDisplay.map((place) => (
          <Marker
            key={place.place_id}
            coordinate={{
              latitude: place.geometry.location.lat,
              longitude: place.geometry.location.lng,
            }}
            title={place.name}
            description={place.description}
            pinColor={Colors.primary}
            onPress={() =>
              !journeyStarted &&
              handleMarkerPress(
                place,
                region,
                setSelectedPlace,
                setRouteCoordinates,
                setTravelTime,
                setShowCard
              )
            }
          />
        ))}
        {routeCoordinates.length > 0 && journeyStarted && (
          <MapViewDirections
            origin={userLocation || region}
            mode="WALKING"
            destination={{
              latitude: selectedPlace?.geometry.location.lat || 0,
              longitude: selectedPlace?.geometry.location.lng || 0,
            }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={8}
            strokeColor={Colors.primary}
            optimizeWaypoints={true}
            onReady={(result) => {
              if (result.distance && result.duration) {
                setTravelTime(`${parseFloat(result.duration.toString()).toFixed(1)} min`);
                setDistance(`${parseFloat(result.distance.toString()).toFixed(1)} km`);
              }
            }}
            onError={(errorMessage) => {
              console.log(errorMessage);
            }}
          />
        )}
      </MapView>
      {showCard && selectedPlace && travelTime && (
        <ExploreCard
          placeName={selectedPlace.name}
          travelTime={travelTime}
          onStartJourney={() =>
            handleStartJourney(
              requestLocationPermission,
              setShowCard,
              setJourneyStarted,
              setIsMapFocused,
              mapRef,
              userLocation
            )
          }
          onCancel={() =>
            handleCancel(
              setConfirmEndJourney,
              setSelectedPlace,
              setRouteCoordinates,
              setTravelTime,
              setDistance,
              setShowCard,
              setJourneyStarted
            )
          }
        />
      )}
      {journeyStarted && selectedPlace && travelTime && distance && (
        <DetailsCard placeName={selectedPlace.name} travelTime={travelTime} distance={distance} />
      )}
      {journeyStarted && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() =>
              handleCancel(
                setConfirmEndJourney,
                setSelectedPlace,
                setRouteCoordinates,
                setTravelTime,
                setDistance,
                setShowCard,
                setJourneyStarted
              )
            }
          >
            <Text style={styles.cancelButtonText}>End Journey</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    width: "50%",
    backgroundColor: Colors.danger,
    padding: 15,
    borderRadius: 5,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});
