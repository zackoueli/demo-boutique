"use client";

import { useEffect, useState } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Plus, Trash2, X, Tag } from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  active: boolean;
  usageCount: number;
}

const inputCls = "w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition";

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "", minOrder: "" });

  async function load() {
    try {
      const snap = await getDocs(collection(db, "promoCodes"));
      setPromos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoCode)));
    } catch { setPromos([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addDoc(collection(db, "promoCodes"), {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: parseFloat(form.value),
        minOrder: parseFloat(form.minOrder || "0") * 100,
        active: true,
        usageCount: 0,
        createdAt: serverTimestamp(),
      });
      setShowModal(false);
      setForm({ code: "", type: "percent", value: "", minOrder: "" });
      load();
    } finally { setSaving(false); }
  }

  async function toggleActive(p: PromoCode) {
    await updateDoc(doc(db, "promoCodes", p.id), { active: !p.active });
    load();
  }

  async function handleDelete(p: PromoCode) {
    if (!confirm(`Supprimer le code "${p.code}" ?`)) return;
    await deleteDoc(doc(db, "promoCodes", p.id));
    load();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Promotions</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Codes promo</h1>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brown text-cream text-sm font-medium rounded-xl hover:bg-brown-mid transition-colors">
          <Plus size={15} /> Nouveau code
        </button>
      </div>

      <div className="bg-sand border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-parchment rounded-xl animate-pulse" />)}</div>
        ) : promos.length === 0 ? (
          <div className="py-16 text-center">
            <Tag size={32} className="mx-auto mb-3 text-parchment" />
            <p className="text-brown-light font-serif">Aucun code promo pour l&apos;instant.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-terracotta hover:text-terra-light font-medium">Créer le premier →</button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-brown-light uppercase bg-parchment/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Réduction</th>
                <th className="px-4 py-3 text-left">Commande min.</th>
                <th className="px-4 py-3 text-center">Utilisations</th>
                <th className="px-4 py-3 text-center">Actif</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {promos.map((p) => (
                <tr key={p.id} className="hover:bg-parchment/30 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-brown tracking-wider">{p.code}</td>
                  <td className="px-4 py-3 text-terracotta font-semibold">
                    {p.type === "percent" ? `−${p.value}%` : `−${(p.value / 100).toFixed(2).replace(".", ",")} €`}
                  </td>
                  <td className="px-4 py-3 text-brown-light">
                    {p.minOrder > 0 ? `${(p.minOrder / 100).toFixed(0)} €` : "Aucun"}
                  </td>
                  <td className="px-4 py-3 text-center text-brown-mid">{p.usageCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${p.active ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600" : "bg-red-100 text-red-600 hover:bg-green-100 hover:text-green-700"}`}>
                      {p.active ? "Actif" : "Inactif"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p)} className="p-1.5 text-brown-light hover:text-terracotta transition-colors float-right">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-brown/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl w-full max-w-md shadow-2xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif font-semibold text-brown">Nouveau code promo</h2>
              <button onClick={() => setShowModal(false)} className="text-brown-light hover:text-brown">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">Code <span className="text-terracotta">*</span></label>
                <input type="text" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="EX : BIENVENUE10" required className={inputCls + " font-mono tracking-widest uppercase"} />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">Type de réduction <span className="text-terracotta">*</span></label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "percent" | "fixed" }))} className={inputCls}>
                  <option value="percent">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (€)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">
                  Valeur <span className="text-terracotta">*</span>
                  <span className="text-brown-light font-normal ml-1">({form.type === "percent" ? "%" : "€"})</span>
                </label>
                <input type="number" step="0.01" min="0" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percent" ? "10" : "5.00"} required className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-brown-mid mb-1.5">Commande minimum (€) <span className="text-brown-light font-normal">— optionnel</span></label>
                <input type="number" step="1" min="0" value={form.minOrder} onChange={(e) => setForm((f) => ({ ...f, minOrder: e.target.value }))}
                  placeholder="0" className={inputCls} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-border text-brown-mid rounded-xl text-sm font-medium hover:bg-sand transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50">
                  {saving ? "Création…" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
