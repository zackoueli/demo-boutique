import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function ensureApp() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
}

export function getAdminDb() {
  ensureApp();
  return getFirestore();
}

export function getAdminAuth() {
  ensureApp();
  return getAuth();
}

/** uid du porteur du jeton Firebase (header Authorization: Bearer …), ou null */
export async function getRequestUid(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

/** true si la requête porte le jeton d'un utilisateur dont le rôle est "admin" */
export async function isAdminRequest(req: Request): Promise<boolean> {
  const uid = await getRequestUid(req);
  if (!uid) return false;
  const userSnap = await getAdminDb().collection("users").doc(uid).get();
  return userSnap.exists && userSnap.data()?.role === "admin";
}
