import React from "react";
import { StyleSheet } from "react-native";
import MapView, { PROVIDER_DEFAULT } from "react-native-maps";

const HUD_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#000913" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#3a7a9c" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000913" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#0a2040" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#061629" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#00d4ff" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#020d1e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#00d4ff" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#020d1e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0a1829" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#000913" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#0a2040" }] },
];

interface Props {
  latitude: number;
  longitude: number;
}

export default function NativeMapView({ latitude, longitude }: Props) {
  return (
    <MapView
      style={StyleSheet.absoluteFillObject}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      customMapStyle={HUD_MAP_STYLE}
      showsUserLocation
      showsMyLocationButton={false}
      provider={PROVIDER_DEFAULT}
    />
  );
}
