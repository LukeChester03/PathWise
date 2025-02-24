export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface Place {
  id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  description?: string;
}

export interface PlaceDetails {
  result: {
    name: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
    desc: string;
  };
}
