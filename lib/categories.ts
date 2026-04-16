import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, orderBy, query, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SubCategory {
  key: string;
  label: string;
}

export interface Category {
  id: string;
  key: string;
  label: string;
  subCategories: SubCategory[];
  imageUrl?: string;
  order: number;
  createdAt?: unknown;
}

export async function updateCategoryImage(id: string, imageUrl: string): Promise<void> {
  await updateDoc(doc(db, "categories", id), { imageUrl });
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Category)));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  return { categories, loading };
}

export async function addCategory(label: string): Promise<void> {
  const key = slugify(label);
  const snap = await getDocs(query(collection(db, "categories"), orderBy("order", "asc")));
  const maxOrder = snap.docs.length > 0
    ? Math.max(...snap.docs.map((d) => (d.data().order ?? 0) as number))
    : -1;
  await addDoc(collection(db, "categories"), {
    key, label, subCategories: [], order: maxOrder + 1, createdAt: serverTimestamp(),
  });
}

export async function updateCategory(id: string, label: string): Promise<void> {
  await updateDoc(doc(db, "categories", id), { label, key: slugify(label) });
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, "categories", id));
}

export async function addSubCategory(categoryId: string, subLabel: string, current: SubCategory[]): Promise<void> {
  const newSub: SubCategory = { key: slugify(subLabel), label: subLabel };
  await updateDoc(doc(db, "categories", categoryId), {
    subCategories: [...current, newSub],
  });
}

export async function updateSubCategory(categoryId: string, subKey: string, newLabel: string, current: SubCategory[]): Promise<void> {
  const updated = current.map((s) =>
    s.key === subKey ? { key: slugify(newLabel), label: newLabel } : s
  );
  await updateDoc(doc(db, "categories", categoryId), { subCategories: updated });
}

export async function deleteSubCategory(categoryId: string, subKey: string, current: SubCategory[]): Promise<void> {
  await updateDoc(doc(db, "categories", categoryId), {
    subCategories: current.filter((s) => s.key !== subKey),
  });
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
