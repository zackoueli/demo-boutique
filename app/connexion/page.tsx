"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

type Mode = "login" | "register";

export default function ConnexionPage() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
