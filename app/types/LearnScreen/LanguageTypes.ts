export interface Phrase {
  id?: string;
  language: string;
  phrase: string;
  translation: string;
  useContext: string;
  pronunciation: string;
  isFavorite?: boolean;
  region?: string;
  category?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LanguageGroup {
  language: string;
  phrases: Phrase[];
}

export interface RequestLimitInfo {
  requestCount: number;
  lastRequestDate: string;
  nextAvailableTime?: string;
}

export interface PhrasebookSettings {
  lastUpdatedAt: number;
  favoriteLanguages: string[];
  explorableCountries: string[];
  requestLimits?: RequestLimitInfo;
}
