import { getAdminDb } from "@/lib/firebase-admin";
import { calcExtra, optionLabel } from "@/lib/customization";
import type { CustomizationField } from "@/lib/types";

/* Paniers sauvegardés pour le rappel par email (collection "carts", accès serveur uniquement).
   Seuls l'identifiant produit, la quantité et la personnalisation sont stockés : noms, prix et
   images sont toujours relus depuis le catalogue. */

export interface SavedCartLine {
  productId: string;
  quantity: number;
  customization?: Record<string, string>;
}

export interface ResolvedCartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  basePrice: number;
  imageUrl: string;
  quantity: number;
  maxQuantity: number;
  careInstructions?: string;
  customization?: Record<string, string>;
  customizationLabels?: Record<string, string>;
  customizationExtra?: number;
}

/** Garde les lignes exploitables d'un panier reçu du navigateur */
export function sanitizeCartLines(input: unknown): SavedCartLine[] {
  if (!Array.isArray(input)) return [];
  const lines: SavedCartLine[] = [];
  for (const raw of input.slice(0, 20)) {
    const { productId, quantity, customization } = (raw ?? {}) as Partial<SavedCartLine>;
    if (typeof productId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(productId)) continue;
    if (!Number.isInteger(quantity) || quantity! < 1 || quantity! > 99) continue;
    const custom: Record<string, string> = {};
    if (customization && typeof customization === "object") {
      for (const [key, value] of Object.entries(customization).slice(0, 20)) {
        if (typeof value === "string" && value.trim()) custom[key.slice(0, 64)] = value.trim().slice(0, 200);
      }
    }
    lines.push({ productId, quantity: quantity!, ...(Object.keys(custom).length > 0 ? { customization: custom } : {}) });
  }
  return lines;
}

/** Relit le catalogue : produits disparus ou en rupture écartés, prix recalculés */
export async function resolveCartLines(lines: SavedCartLine[]): Promise<ResolvedCartItem[]> {
  const db = getAdminDb();
  const items: ResolvedCartItem[] = [];

  for (const line of lines) {
    const snap = await db.collection("products").doc(line.productId).get();
    if (!snap.exists) continue;
    const product = snap.data() as {
      name: string; slug: string; price: number; stock: number; imageUrl?: string;
      careInstructions?: string; customizationFields?: CustomizationField[];
    };
    if (!product.stock || product.stock < 1) continue;

    const fields = product.customizationFields ?? [];
    const customization: Record<string, string> = {};
    const customizationLabels: Record<string, string> = {};
    for (const field of fields) {
      const value = line.customization?.[field.id];
      if (!value) continue;
      if (field.type !== "text" && !field.options?.some((o) => optionLabel(o) === value)) continue;
      customization[field.id] = value;
      customizationLabels[field.label] = value;
    }
    const extra = calcExtra(fields, customization);

    items.push({
      productId: line.productId,
      slug: product.slug,
      name: product.name,
      price: product.price + extra,
      basePrice: product.price,
      imageUrl: product.imageUrl ?? "",
      quantity: Math.min(line.quantity, product.stock),
      maxQuantity: product.stock,
      ...(product.careInstructions ? { careInstructions: product.careInstructions } : {}),
      ...(Object.keys(customization).length > 0 ? { customization, customizationLabels } : {}),
      ...(extra > 0 ? { customizationExtra: extra } : {}),
    });
  }
  return items;
}
