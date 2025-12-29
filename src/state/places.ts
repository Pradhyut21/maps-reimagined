import { atom } from 'recoil';

export type RecentSearch = {
  id: string;
  query: string;
  createdAt: number;
};

export type SavedPlace = {
  id: string;
  name: string;
  type: string;
  createdAt: number;
};

export const recentSearchesState = atom<RecentSearch[]>({
  key: 'recentSearchesState',
  default: [],
});

export const savedPlacesState = atom<SavedPlace[]>({
  key: 'savedPlacesState',
  default: [],
});
