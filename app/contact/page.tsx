"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Mail, Send, CheckCircle, ArrowLeft, MessageSquare } from "lucide-react";

const SUBJECTS = [
  "Question sur une commande",
  "Question sur un produit",
  "Demande de personnalisation",
  "Retour / Remboursement",
  "Autre",
];

export default function ContactPage() {
  const { user, profile } = useAuth();
  const [form, setForm] = useState({
    name: profile?.displayName ?? "",
    email: user?.email ?? "",
    subject: "",
    message: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) return;
    setLoading(true); setError("");
    try {
      await addDoc(collection(db, "contactMessages"), {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
        userId: user?.uid ?? null,
        status: "unread",
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-cream min-h-screen">
      {/* En-tête */}
      <div className="bg-sand border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-brown-light hover:text-terracotta mb-5 transition-colors">
            <ArrowLeft size={14} /> Retour à l&apos;accueil
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-terracotta/10 rounded-xl flex items-center justify-center">
              <Mail size={20} className="text-terracotta" />
            </div>
            <h1 className="font-serif text-3xl font-semibold text-brown">Nous contacter</h1>
          </div>
          <p className="text-brown-light text-sm max-w-lg">
            Une question sur votre commande, une demande de personnalisation, ou simplement envie de nous dire bonjour ?
            Nous vous répondons sous 24h.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-10">
        {/* Infos de contact */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-4">Informations</p>
            <div className="space-y-4 text-sm text-brown-light">
              <div className="flex items-start gap-3">
                <Mail size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-brown-mid">Email</p>
                  <p>contact@bijouxco.fr</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MessageSquare size={15} className="text-terracotta flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-brown-mid">Réponse sous</p>
                  <p>24 heures ouvrées</p>
                </div>
              </div>
            </div>
          </div>

          {user && (
            <div className="p-4 bg-sand border border-border rounded-2xl">
              <p className="text-xs font-semibold text-brown uppercase tracking-widest mb-2">Messagerie</p>
              <p className="text-xs text-brown-light mb-3">
                Suivez vos échanges avec notre équipe directement depuis votre espace.
              </p>
              <Link
                href="/messages"
                className="inline-flex items-center gap-2 text-xs font-medium text-terracotta hover:text-terra-light transition-colors"
              >
                <MessageSquare size={13} /> Mes messages →
              </Link>
            </div>
          )}
        </div>

        {/* Formulaire */}
        <div className="md:col-span-2">
          {success ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="font-serif text-xl font-semibold text-brown mb-2">Message envoyé !</h2>
              <p className="text-brown-light text-sm max-w-xs mb-6">
                Merci pour votre message. Notre équipe vous répondra dans les plus brefs délais.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-6 py-2.5 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors"
              >
                Envoyer un autre message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brown-mid mb-1.5">
                    Nom <span className="text-terracotta">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brown-mid mb-1.5">
                    Email <span className="text-terracotta">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="votre@email.fr"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">
                  Sujet <span className="text-terracotta">*</span>
                </label>
                <select
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition appearance-none"
                >
                  <option value="">Sélectionner un sujet…</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">
                  Message <span className="text-terracotta">*</span>
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Décrivez votre demande…"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex items-center justify-center gap-2 w-full py-4 bg-brown text-cream font-medium rounded-2xl hover:bg-brown-mid transition-colors disabled:opacity-50 text-sm"
              >
                {loading ? "Envoi en cours…" : <><Send size={15} /> Envoyer le message</>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
