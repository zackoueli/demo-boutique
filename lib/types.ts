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
  createdAt: Date;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  quantity: number;
}

export interface Order {
  id: string;
  userId: string | null;
  userEmail: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  items: CartItem[];
  shipping: {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  payment: {
    last4: string;
    method: string;
  };
  subtotal: number;
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
