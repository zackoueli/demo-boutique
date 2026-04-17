"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type Mode = "login" | "register";

export default function ConnexionPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect après connexion (email ou retour Google redirect)
  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
      } else {
        if (!form.displayName.trim()) { setError("Le prénom est requis."); setLoading(false); return; }
        await signUp(form.email, form.password, form.displayName);
      }
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("invalid-credential") || msg.includes("wrong-password") || msg.includes("user-not-found")) {
        setError("Email ou mot de passe incorrect.");
      } else if (msg.includes("email-already-in-use")) {
        setError("Cet email est déjà utilisé.");
      } else if (msg.includes("weak-password")) {
        setError("Le mot de passe doit faire au moins 6 caractères.");
      } else {
        setError("Une erreur est survenue. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-cream min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <Link href="/" className="font-serif text-2xl font-semibold text-brown">Histoire Eternelle</Link>
          <p className="text-brown-light mt-3 text-sm">
            {mode === "login" ? "Bon retour parmi nous" : "Rejoignez notre communauté"}
          </p>
        </div>

        {/* Onglets */}
        <div className="flex border border-border rounded-2xl p-1 mb-7 bg-sand">
          {(["login", "register"] as Mode[]).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                mode === m ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"
              }`}>
              {m === "login" ? "Connexion" : "Inscription"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <Field label="Prénom" name="displayName" value={form.displayName} onChange={handleChange} placeholder="Marie" />
          )}
          <Field label="Email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="vous@exemple.com" required />
          <Field label="Mot de passe" name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" required />

          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-brown text-cream font-medium rounded-2xl hover:bg-brown-mid transition-colors disabled:opacity-50 text-sm mt-2">
            {loading ? "Chargement…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-brown-light">ou</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={async () => { setLoading(true); setError(""); try { await signInWithGoogle(); } catch { setError("Connexion Google échouée."); setLoading(false); } }}
          disabled={loading}
          className="w-full py-3.5 border border-border rounded-2xl text-sm font-medium text-brown hover:bg-sand transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuer avec Google
        </button>
      </div>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", placeholder, required }: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-brown-mid mb-1.5">{label}</label>
      <input id={name} name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
      />
    </div>
  );
}
