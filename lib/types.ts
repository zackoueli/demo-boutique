export interface CustomizationField {
  id: string;
  type: "text" | "select" | "color";
  label: string;
  options?: string[]; // pour select et color
  required: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // cents
  category: "rings" | "necklaces" | "bracelets" | "earrings";
  imageUrl: string;
  imageStoragePath: string;
  images?: string[]; // galerie multi-photos
  materials?: string;
  careInstructions?: string;
  stock: number;
  featured: boolean;
  customizationFields?: CustomizationField[];
  createdAt: Date;
}

export interface CartItem {
  cartItemId: string; // productId ou productId_hash pour articles personnalisés
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
  customization?: Record<string, string>; // fieldId -> valeur choisie
  customizationLabels?: Record<string, string>; // fieldLabel -> valeur choisie (pour affichage)
}

export interface RelayPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  distance?: string;
}

export interface Order {
  id: string;
  userId: string | null;
  userEmail: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: CartItem[];
  shipping: {
    type: "home" | "relay";
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    relayPoint?: RelayPoint;
  };
  payment: {
    last4: string;
    method: string;
  };
  subtotal: number;
  discount?: number;
  promoCode?: string | null;
  total: number;
  createdAt: Date;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  createdAt: Date;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "unread" | "read" | "replied";
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  subject: string;
  status: "open" | "closed";
  lastMessage?: string;
  lastMessageAt: Date;
  createdAt: Date;
}

export interface Message {
  id: string;
  sender: "user" | "admin";
  content: string;
  createdAt: Date;
}
