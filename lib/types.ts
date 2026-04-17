export interface CustomizationField {
  id: string;
  type: "text" | "select" | "color";
  label: string;
  /** Pour type "select"/"color" : "NomOption" ou "NomOption:prixEnEuros" ex. "Or:10" */
  options?: string[];
  /** Pour type "text" : supplément fixe en centimes si le champ est renseigné */
  extraPrice?: number;
  required: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number; // cents
  category: string;
  subCategory?: string;
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
  price: number; // prix unitaire final (base + personnalisation)
  basePrice: number; // prix de base du produit (sans personnalisation)
  imageUrl: string;
  quantity: number;
  customization?: Record<string, string>; // fieldId -> valeur choisie
  customizationLabels?: Record<string, string>; // fieldLabel -> valeur choisie (pour affichage)
  customizationExtra?: number; // supplément de personnalisation en centimes (pour affichage)
}

export interface RelayPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  distance?: string;
  hours?: string;
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
  adminRead?: boolean;
}

export interface Message {
  id: string;
  sender: "user" | "admin";
  content: string;
  createdAt: Date;
}
