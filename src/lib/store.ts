import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MOCK_ASSETS } from "./mock-data";

export type AssetType = "gameday" | "final-score" | "poster" | "highlight";
export type AssetStatus = "draft" | "published" | "archived";

export interface StoreAsset {
  id: string;
  title: string;
  tagline: string;
  type: AssetType;
  status: AssetStatus;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  eventDate: string;
  imageUrl: string;
  style: string;
  format: string;
  likes: number;
  likedBy: string[];
  designerName: string;
  createdAt: string;
}

// Seed with existing mock assets (keeps the app populated from the start)
const SEED: StoreAsset[] = MOCK_ASSETS.map((a) => ({
  id: a.id,
  title: a.title,
  tagline: "",
  type: a.type,
  status: a.status,
  sport: a.sport,
  homeTeam: a.homeTeam,
  awayTeam: a.awayTeam,
  homeScore: a.homeScore,
  awayScore: a.awayScore,
  eventDate: a.eventDate,
  imageUrl: a.imageUrl,
  style: "illustrated",
  format: "story",
  likes: a.likes,
  likedBy: [],           // current session starts with nothing liked
  designerName: a.designerName,
  createdAt: a.createdAt,
}));

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AppState {
  assets: StoreAsset[];
  sessionId: string;
  /** Add a new asset (published or draft). Returns the new id. */
  addAsset: (data: Omit<StoreAsset, "id" | "likes" | "likedBy" | "createdAt">) => string;
  /** Promote/demote a draft to published or vice-versa. */
  updateStatus: (id: string, status: AssetStatus) => void;
  /** Toggle the current session's like on an asset. */
  toggleLike: (id: string) => void;
  /** Whether the current session has liked an asset. */
  isLiked: (id: string) => boolean;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      assets: SEED,
      sessionId: uid(),

      addAsset(data) {
        const id = uid();
        set((s) => ({
          assets: [
            { ...data, id, likes: 0, likedBy: [], createdAt: new Date().toISOString() },
            ...s.assets,
          ],
        }));
        return id;
      },

      updateStatus(id, status) {
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? { ...a, status } : a)),
        }));
      },

      toggleLike(id) {
        const sid = get().sessionId;
        set((s) => ({
          assets: s.assets.map((a) => {
            if (a.id !== id) return a;
            const has = a.likedBy.includes(sid);
            return {
              ...a,
              likes: has ? a.likes - 1 : a.likes + 1,
              likedBy: has ? a.likedBy.filter((x) => x !== sid) : [...a.likedBy, sid],
            };
          }),
        }));
      },

      isLiked(id) {
        const { assets, sessionId } = get();
        return assets.find((a) => a.id === id)?.likedBy.includes(sessionId) ?? false;
      },
    }),
    {
      name: "sideline-v1",
      storage: createJSONStorage(() => ({
        getItem: (name: string) =>
          typeof window !== "undefined" ? localStorage.getItem(name) : null,
        setItem: (name: string, value: string) => {
          if (typeof window !== "undefined") localStorage.setItem(name, value);
        },
        removeItem: (name: string) => {
          if (typeof window !== "undefined") localStorage.removeItem(name);
        },
      })),
      partialize: (s) => ({ assets: s.assets, sessionId: s.sessionId }),
    }
  )
);
