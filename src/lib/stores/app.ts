import { createStore } from "solid-js/store";
import { config } from "@lib/utils/config";

const storeInit: {
  invidious: string[],
  index: number
  api: string,
  updater?: () => void,
  actionsMenu?: CollectionItem,
  snackbar?: string,
  syncState?: SyncState,
  homeView: '' | 'Hub' | 'Library' | 'Search',
} = {
  // Fallback Invidious instances used when Uma fails to provide a list,
  // so search and playback keep working out of the box.
  invidious: [
    'https://invidious.nikkosphere.com',
    'https://inv.nadeko.net',
    'https://invidious.jing.rocks',
    'https://yt.omada.cafe',
  ],
  index: 0,
  api: Backend[Math.floor(Math.random() * Backend.length)],
  homeView: (config.home || 'Hub') as "" | "Hub" | "Library" | "Search",
};

export const [store, setStore] = createStore(storeInit);
