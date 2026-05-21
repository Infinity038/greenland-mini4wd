export type ProductCategory = 'standard' | 'premium' | 'limited';
export type ProductStatus = 'in stock' | 'preorder only' | 'limited' | 'sold out' | 'coming soon';
export type ProductType = 'boxed' | 'built';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  chassis: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  unbuiltPrice: number;
  builtPrice: number;
  image: string;
  imageAlt?: string;
  status: ProductStatus;
  preorder: boolean;
  collector: boolean;
  featured: boolean;
  description: string;
  badge?: string;
  badgeColor?: string;
}

// Real Tamiya product images from official/distributor sources
// Fallback to chassis name if image fails to load
export const PRODUCTS: Product[] = [
  {
    id: 'ray-spear',
    name: 'Ray Spear',
    category: 'standard',
    chassis: 'AR',
    rarity: 1,
    unbuiltPrice: 449,
    builtPrice: 649,
    image: 'https://www.tamiya.com/english/products/18091ray_spear/ray.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/18091.jpg',
    status: 'in stock',
    preorder: false,
    collector: false,
    featured: true,
    description: 'Classic aerodynamic design on the versatile AR chassis. The perfect entry point for new racers with great compatibility.',
    badge: 'POPULAR',
    badgeColor: '#22C55E',
  },
  {
    id: 'flame-astute',
    name: 'Flame Astute',
    category: 'standard',
    chassis: 'MA',
    rarity: 1,
    unbuiltPrice: 449,
    builtPrice: 649,
    image: 'https://www.tamiya.com/english/products/18090flame_astute/flame.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/18090.jpg',
    status: 'in stock',
    preorder: false,
    collector: false,
    featured: true,
    description: 'High-speed body design with the balanced MA chassis. A favorite for technical tracks and intermediate racers.',
  },
  {
    id: 'shadow-shark',
    name: 'Shadow Shark',
    category: 'standard',
    chassis: 'MS',
    rarity: 1,
    unbuiltPrice: 499,
    builtPrice: 699,
    image: 'https://www.tamiya.com/english/products/95567shadow_shark/shadow.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95567.jpg',
    status: 'in stock',
    preorder: false,
    collector: false,
    featured: false,
    description: 'Aggressive shark-inspired body on the mid-ship MS chassis. Excellent stability and acceleration at high speed.',
  },
  {
    id: 'diospada-premium',
    name: 'Diospada Premium',
    category: 'standard',
    chassis: 'AR',
    rarity: 2,
    unbuiltPrice: 549,
    builtPrice: 799,
    image: 'https://www.tamiya.com/english/products/95542diospada/dios.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95542.jpg',
    status: 'preorder only',
    preorder: true,
    collector: false,
    featured: false,
    description: 'Premium sword-inspired body with upgraded AR chassis components. Race-tuned out of the box.',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  {
    id: 'gun-bluster',
    name: 'Gun Bluster XTO Premium',
    category: 'standard',
    chassis: 'FM-A',
    rarity: 2,
    unbuiltPrice: 599,
    builtPrice: 849,
    image: 'https://www.tamiya.com/english/products/95569gun_bluster/gun.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95569.jpg',
    status: 'preorder only',
    preorder: true,
    collector: false,
    featured: false,
    description: 'Front-motor FM-A chassis with the iconic Gun Bluster body. Unique handling and cornering characteristics.',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  {
    id: 'beak-stinger',
    name: 'Beak Stinger G',
    category: 'standard',
    chassis: 'VS',
    rarity: 2,
    unbuiltPrice: 649,
    builtPrice: 899,
    image: 'https://www.tamiya.com/english/products/95570beak_stinger/beak.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95570.jpg',
    status: 'preorder only',
    preorder: true,
    collector: false,
    featured: false,
    description: 'Vertical layout VS chassis with the aggressive Beak Stinger G body. Low center of gravity speed machine.',
    badge: 'PREORDER',
    badgeColor: '#3B82F6',
  },
  {
    id: 'exflowly-purple',
    name: 'Exflowly Polycarbonate Special',
    category: 'premium',
    chassis: 'MA',
    rarity: 3,
    unbuiltPrice: 799,
    builtPrice: 1099,
    image: 'https://www.tamiya.com/english/products/95557exflowly/exflowly.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95557.jpg',
    status: 'limited',
    preorder: true,
    collector: true,
    featured: true,
    description: 'Stunning purple polycarbonate body with precision MA chassis. A showpiece and a serious racer.',
    badge: 'SPECIAL EDITION',
    badgeColor: '#A855F7',
  },
  {
    id: 'mach-frame-ph',
    name: 'Mach Frame Philippine Cup Special',
    category: 'premium',
    chassis: 'AR',
    rarity: 4,
    unbuiltPrice: 999,
    builtPrice: 1299,
    image: 'https://www.tamiya.com/english/products/95554mach_frame/mach.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95554.jpg',
    status: 'limited',
    preorder: true,
    collector: true,
    featured: false,
    description: 'Philippine Cup exclusive colorway on the Mach Frame body. Built for champions, designed for collectors.',
    badge: 'EXCLUSIVE',
    badgeColor: '#DC2626',
  },
  {
    id: 'cyclone-25th',
    name: 'Cyclone Magnum 25th Anniversary',
    category: 'limited',
    chassis: 'AR',
    rarity: 5,
    unbuiltPrice: 1299,
    builtPrice: 1699,
    image: 'https://www.tamiya.com/english/products/95551cyclone_magnum/cyclone.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95551.jpg',
    status: 'limited',
    preorder: true,
    collector: true,
    featured: true,
    description: '25th anniversary edition of the legendary Cyclone Magnum. Gold-accented chassis, collector packaging.',
    badge: '25TH ANNIVERSARY',
    badgeColor: '#FACC15',
  },
  {
    id: 'geo-glider-2026',
    name: 'Geo Glider Asia Challenge 2026',
    category: 'limited',
    chassis: 'MS',
    rarity: 5,
    unbuiltPrice: 1499,
    builtPrice: 1899,
    image: 'https://www.tamiya.com/english/products/95568geo_glider/geo.jpg',
    imageAlt: 'https://images.tamiyausa.com/uploads/items/95568.jpg',
    status: 'limited',
    preorder: true,
    collector: true,
    featured: true,
    description: 'Asia Challenge 2026 special edition. Extremely limited quantities. May not be restocked once sold.',
    badge: 'COLLECTOR',
    badgeColor: '#FACC15',
  },
];

export const STOCK_COLORS: Record<ProductStatus, string> = {
  'in stock': '#22C55E',
  'preorder only': '#3B82F6',
  'limited': '#FACC15',
  'sold out': '#DC2626',
  'coming soon': '#6B7280',
};

export const CATEGORY_LABEL: Record<ProductCategory, string> = {
  standard: 'Standard',
  premium: 'Premium',
  limited: 'Limited / Rare',
};