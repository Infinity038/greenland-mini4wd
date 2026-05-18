export interface Event {
  id: number;
  date: string;
  month: string;
  title: string;
  location: string;
  type: "Race" | "Workshop" | "Open Track";
  spots: number | null;
}

export interface GalleryItem {
  id: number;
  label: string;
  emoji: string;
}

export interface BlogPost {
  id: number;
  tag: string;
  date: string;
  title: string;
  excerpt: string;
  emoji: string;
}

export interface ShopItem {
  id: number;
  name: string;
  category: string;
  price: string;
  emoji: string;
}