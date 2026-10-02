/* Lecture Firestore via l'API REST, pour le rendu serveur des pages publiques
   (produits, catégories, avis : collections en lecture publique). */

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "fir-boutique-754bb";
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type FirestoreValue = {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  nullValue?: null;
  timestampValue?: string;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
};

function decodeValue(v: FirestoreValue): unknown {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(decodeValue);
  if (v.mapValue) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

function encodeValue(v: string | number | boolean): FirestoreValue {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
}

export interface RestDoc {
  id: string;
  data: Record<string, unknown>;
}

interface QueryOptions {
  where?: [field: string, value: string | number | boolean];
  orderBy?: { field: string; direction?: "ASCENDING" | "DESCENDING" };
  limit?: number;
  /** Durée de cache en secondes */
  revalidate?: number;
}

/** Requête sur une collection ; renvoie [] en cas d'erreur pour ne jamais casser le rendu */
export async function queryCollection(collectionId: string, opts: QueryOptions = {}): Promise<RestDoc[]> {
  try {
    const structuredQuery: Record<string, unknown> = { from: [{ collectionId }] };
    if (opts.where) {
      structuredQuery.where = {
        fieldFilter: { field: { fieldPath: opts.where[0] }, op: "EQUAL", value: encodeValue(opts.where[1]) },
      };
    }
    if (opts.orderBy) {
      structuredQuery.orderBy = [{ field: { fieldPath: opts.orderBy.field }, direction: opts.orderBy.direction ?? "ASCENDING" }];
    }
    if (opts.limit) structuredQuery.limit = opts.limit;

    const res = await fetch(`${BASE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery }),
      next: { revalidate: opts.revalidate ?? 60 },
    });
    if (!res.ok) return [];

    const rows = (await res.json()) as { document?: { name: string; fields?: Record<string, FirestoreValue> } }[];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((r) => r.document)
      .map((r) => ({
        id: r.document!.name.split("/").pop()!,
        data: decodeFields(r.document!.fields ?? {}),
      }));
  } catch {
    return [];
  }
}
