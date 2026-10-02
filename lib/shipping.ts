/* ─── Frais de port : source unique, partagée entre le client et le serveur ─── */

export type DeliveryType = "home" | "relay" | "pickup";

export interface Carrier {
  id: string;
  name: string;
  abbr: string;
  bgColor: string;
  textColor?: string;
  desc: string;
  price: number; // centimes
  available: boolean;
}

/** Seuil de livraison offerte, en centimes */
export const FREE_SHIPPING_THRESHOLD = 8000;

/** Délai de préparation avant expédition (cf. CGV, article Livraison) */
export const PREPARATION_DELAY = "2 à 5 jours ouvrés";

/* ─── Transporteurs point relais ─── */
export const RELAY_CARRIERS: Carrier[] = [
  {
    id: "mondial-relay",
    name: "Mondial Relay",
    abbr: "MR",
    bgColor: "#E30613",
    desc: "2–4 jours ouvrés",
    price: 450,
    available: true,
  },
];

/* ─── Transporteurs livraison à domicile ─── */
export const HOME_CARRIERS: Carrier[] = [
  {
    id: "colissimo",
    name: "Colissimo",
    abbr: "COL",
    bgColor: "#FFCD00",
    textColor: "#003189",
    desc: "2–3 jours ouvrés",
    price: 599,
    available: false,
  },
  {
    id: "dpd-home",
    name: "DPD",
    abbr: "DPD",
    bgColor: "#DC0032",
    desc: "2–3 jours ouvrés",
    price: 499,
    available: false,
  },
];

/** Tarif affiché avant le choix de la livraison (panier, fiche produit) */
export const DEFAULT_SHIPPING_PRICE = RELAY_CARRIERS[0].price;

export function findCarrier(deliveryType: DeliveryType, carrierId?: string): Carrier | null {
  if (deliveryType === "pickup") return null;
  const list = deliveryType === "relay" ? RELAY_CARRIERS : HOME_CARRIERS;
  return list.find((c) => c.id === carrierId) ?? list[0];
}

/** Frais de port en centimes, calculés sur le montant après réduction */
export function computeShippingCost(deliveryType: DeliveryType, carrierId: string | undefined, afterDiscount: number): number {
  const carrier = findCarrier(deliveryType, carrierId);
  if (!carrier) return 0;
  return afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : carrier.price;
}

/** Montant restant avant la livraison offerte (0 si le seuil est atteint) */
export function amountToFreeShipping(amount: number): number {
  return Math.max(0, FREE_SHIPPING_THRESHOLD - amount);
}
