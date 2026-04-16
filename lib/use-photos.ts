"use client";

import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, query, orderBy,
} from "firebase/firestore";
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase";

export interface Photo {
  id: string;
  url: string;
  caption: string;
  order: number;
  storagePath: string;
  createdAt: Date;
}

export function usePhotos() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "photos"), orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setPhotos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Photo)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  async function uploadPhoto(
    file: File,
    caption: string,
    onProgress?: (pct: number) => void
  ): Promise<void> {
    const ext = file.name.split(".").pop() ?? "jpg";
    const storagePath = `photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, storagePath);
    const task = uploadBytesResumable(storageRef, file);

    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          const maxOrder = photos.length > 0 ? Math.max(...photos.map((p) => p.order)) : -1;
          await addDoc(collection(db, "photos"), {
            url,
            caption,
            order: maxOrder + 1,
            storagePath,
            createdAt: serverTimestamp(),
          });
          resolve();
        }
      );
    });
  }

  async function updateCaption(id: string, caption: string) {
    await updateDoc(doc(db, "photos", id), { caption });
  }

  async function deletePhoto(id: string, storagePath?: string) {
    await deleteDoc(doc(db, "photos", id));
    if (storagePath) {
      try {
        await deleteObject(ref(storage, storagePath));
      } catch {
        // Silencieux si déjà supprimé
      }
    }
  }

  return { photos, loading, uploadPhoto, updateCaption, deletePhoto };
}
