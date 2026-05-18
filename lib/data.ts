export const EVENTS = [
  { id: 1, date: "7", month: "JUN", title: "Nuuk Summer Sprint Race", location: "Nuuk Community Center, Nuuk", type: "Race" as const, spots: 14 },
  { id: 2, date: "21", month: "JUN", title: "Beginner Build Workshop", location: "Hans Egede Skole, Nuuk", type: "Workshop" as const, spots: 18 },
  { id: 3, date: "5", month: "JUL", title: "Open Track Friday Night", location: "Nuuk Community Center, Nuuk", type: "Open Track" as const, spots: null },
];

export const GALLERY_ITEMS = [
  { id: 1, label: "Race Day", emoji: "🏎️" },
  { id: 2, label: "Custom Builds", emoji: "🔧" },
  { id: 3, label: "Team Photo", emoji: "📸" },
  { id: 4, label: "Workshop", emoji: "🛠️" },
  { id: 5, label: "Track Setup", emoji: "🏁" },
  { id: 6, label: "Awards Night", emoji: "🏆" },
];

export const BLOG_POSTS = [
  {
    id: 1, tag: "NEWS", date: "May 10, 2026", emoji: "📢",
    title: "Club Membership Now Open for 2026 Season",
    excerpt: "We're officially opening registration for our growing Nuuk community. First 50 members get a free starter kit and club sticker.",
  },
  {
    id: 2, tag: "GUIDE", date: "May 3, 2026", emoji: "🔧",
    title: "Choosing Your First Mini 4WD: A Beginner's Guide",
    excerpt: "Not sure where to start? We break down the best entry-level Tamiya kits for new racers joining us here in Greenland.",
  },
];

export const SHOP_ITEMS = [
  { id: 1, name: "Tamiya Avante", category: "Chassis Kit", price: "DKK 299", emoji: "🚗" },
  { id: 2, name: "Club Racing Tires", category: "Parts", price: "DKK 89", emoji: "🔩" },
  { id: 3, name: "GM4WD Jersey", category: "Apparel", price: "DKK 199", emoji: "👕" },
  { id: 4, name: "Motor Upgrade Set", category: "Parts", price: "DKK 149", emoji: "⚡" },
];