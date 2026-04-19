"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp, orderBy, query, limit, startAfter, QueryDocumentSnapshot, DocumentData,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import type { Product, CustomizationField } from "@/lib/types";
import { formatPrice, slugify } from "@/lib/utils";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, ImageIcon, Wand2, ChevronDown, ChevronUp, Upload, Loader2 } from "lucide-react";
import { useCategories } from "@/lib/categories";

const EMPTY_FORM = {
  name: "", description: "", price: "",
  category: "",
  subCategory: "",
  stock: "", featured: false,
  imageUrl: "", images: "",
  materials: "", careInstructions: "",
};

const EMPTY_CUSTOM_FIELD: Omit<CustomizationField, "id"> = {
  type: "text",
  label: "",
  options: [],
  required: false,
};

const inputCls = "w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition";

const PROD_PAGE_SIZE = 50;

export default function AdminProduitsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const { categories } = useCategories();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [customFields, setCustomFields] = useState<CustomizationField[]>([]);
  const [showCustomSection, setShowCustomSection] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  async function load() {
    try {
      const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(PROD_PAGE_SIZE)));
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PROD_PAGE_SIZE);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }

  async function loadMore() {
    if (!lastDoc || loadingMore) return;
    setLoadingMore(true);
    try {
      const snap = await getDocs(query(collection(db, "products"), orderBy("createdAt", "desc"), limit(PROD_PAGE_SIZE), startAfter(lastDoc)));
      setProducts((prev) => [...prev, ...snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product))]);
      setLastDoc(snap.docs[snap.docs.length - 1] ?? null);
      setHasMore(snap.docs.length === PROD_PAGE_SIZE);
    } catch { /* */ }
    finally { setLoadingMore(false); }
  }

  useEffect(() => { load(); }, []);

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `products/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => { setUploadProgress(null); reject(err); },
        async () => {
          setUploadProgress(null);
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  }, []);

  async function handleFileDrop(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadError(null);
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, imageUrl: url }));
    } catch (err) {
      console.error("Upload failed:", err);
      setUploadError("Échec de l'upload. Vérifiez votre connexion ou les règles Firebase Storage.");
    }
  }

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setIsDragging(true);
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileDrop(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileDrop(file);
    e.target.value = "";
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCustomFields([]);
    setShowCustomSection(false);
    setUploadProgress(null);
    setUploadError(null);
    dragCounter.current = 0;
    setIsDragging(false);
    setShowModal(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name, description: p.description, price: String(p.price / 100),
      category: p.category, subCategory: p.subCategory ?? "",
      stock: String(p.stock), featured: p.featured,
      imageUrl: p.imageUrl, images: (p.images ?? []).join("\n"),
      materials: p.materials ?? "", careInstructions: p.careInstructions ?? "",
    });
    setCustomFields(p.customizationFields ?? []);
    setShowCustomSection((p.customizationFields ?? []).length > 0);
    setUploadProgress(null);
    setUploadError(null);
    dragCounter.current = 0;
    setIsDragging(false);
    setShowModal(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const extraImages = form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const mainImage = form.imageUrl || extraImages[0] || "";

      const data = {
        name: form.name, slug: slugify(form.name), description: form.description,
        price: Math.round(parseFloat(form.price) * 100),
        category: form.category, subCategory: form.subCategory || "",
        stock: parseInt(form.stock), featured: form.featured,
        imageUrl: mainImage, imageStoragePath: "",
        images: extraImages.length ? extraImages : [],
        materials: form.materials || "",
        careInstructions: form.careInstructions || "",
        customizationFields: customFields
          .filter((f) => f.label.trim())
          .map((f) => ({ ...f, options: (f.options ?? []).filter(Boolean) })),
      };
      if (editing) {
        await updateDoc(doc(db, "products", editing.id), data);
      } else {
        await addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false);
      load();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  async function handleDelete(p: Product) {
    setProductToDelete(p);
  }

  async function confirmDelete() {
    if (!productToDelete) return;
    await deleteDoc(doc(db, "products", productToDelete.id));
    setProductToDelete(null);
    load();
  }

  function addCustomField() {
    const newField: CustomizationField = {
      id: `field_${Date.now()}`,
      ...EMPTY_CUSTOM_FIELD,
      options: [],
    };
    setCustomFields((prev) => [...prev, newField]);
  }

  function updateCustomField(id: string, updates: Partial<CustomizationField>) {
    setCustomFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }

  function removeCustomField(id: string) {
    setCustomFields((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Gestion</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Produits</h1>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-brown text-cream text-sm font-medium rounded-xl hover:bg-brown-mid transition-colors">
          <Plus size={15} /> Nouveau produit
        </button>
      </div>

      <div className="bg-sand border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-parchment rounded-xl animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-brown-light font-serif">Aucun produit pour l&apos;instant.</p>
            <button onClick={openCreate} className="mt-3 text-sm text-terracotta hover:text-terra-light font-medium">Créer le premier →</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-xs text-brown-light uppercase bg-parchment/50 border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left">Produit</th>
                <th className="px-4 py-3 text-left">Catégorie</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-center">Vedette</th>
                <th className="px-4 py-3 text-center">Perso.</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-parchment/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 bg-parchment rounded-lg overflow-hidden flex-shrink-0">
                        {p.imageUrl
                          ? <Image src={p.imageUrl} alt={p.name} fill sizes="40px" className="object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-border" /></div>
                        }
                      </div>
                      <span className="font-medium text-brown truncate max-w-40">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brown-light">
                    <span>{categories.find((c) => c.key === p.category)?.label ?? p.category}</span>
                    {p.subCategory && (
                      <span className="text-xs text-brown-light/70 block">
                        {categories.find((c) => c.key === p.category)?.subCategories?.find((s) => s.key === p.subCategory)?.label ?? p.subCategory}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-terracotta">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.stock === 0 ? "text-red-500" : "text-brown-mid"}>{p.stock}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={p.featured ? "text-terracotta" : "text-border"}>★</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(p.customizationFields ?? []).length > 0 ? (
                      <span className="text-xs bg-terracotta/10 text-terracotta px-2 py-0.5 rounded-lg">
                        {p.customizationFields!.length} champ{p.customizationFields!.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-brown-light text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-brown-light hover:text-brown transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 text-brown-light hover:text-terracotta transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-2.5 border border-border rounded-xl text-sm text-brown-mid hover:bg-sand transition-colors disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : null}
            {loadingMore ? "Chargement…" : "Charger plus de produits"}
          </button>
        </div>
      )}

      {/* Modale confirmation suppression */}
      {productToDelete && (
        <div className="fixed inset-0 bg-brown/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl w-full max-w-sm shadow-2xl border border-border p-6">
            <h3 className="font-serif font-semibold text-brown text-lg mb-2">Supprimer ce produit ?</h3>
            <p className="text-sm text-brown-light mb-1">
              <span className="font-medium text-brown">{productToDelete.name}</span> sera définitivement supprimé.
            </p>
            <p className="text-xs text-brown-light mb-6">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 border border-border text-brown-mid rounded-xl text-sm font-medium hover:bg-sand transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-brown/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-border">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-serif font-semibold text-brown">
                {editing ? "Modifier le produit" : "Nouveau produit"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-brown-light hover:text-brown transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">

              {/* Zone drag & drop + aperçu */}
              <div
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onClick={() => !form.imageUrl && fileInputRef.current?.click()}
                className={`relative h-44 rounded-2xl overflow-hidden border-2 transition-colors ${
                  isDragging
                    ? "border-terracotta bg-terracotta/5 border-solid"
                    : form.imageUrl
                    ? "border-border bg-sand"
                    : "border-dashed border-border bg-sand hover:border-brown-light cursor-pointer"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onFileChange}
                />

                {uploadProgress !== null ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sand/80">
                    <Loader2 size={24} className="text-terracotta animate-spin" />
                    <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className="h-full bg-terracotta rounded-full transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <span className="text-xs text-brown-light">{uploadProgress}%</span>
                  </div>
                ) : form.imageUrl ? (
                  <>
                    <Image src={form.imageUrl} alt="aperçu" fill sizes="(max-width: 640px) 100vw, 512px" className="object-cover" onError={() => setForm((f) => ({ ...f, imageUrl: "" }))} />
                    <div className="absolute inset-0 bg-brown/0 hover:bg-brown/30 transition-colors flex items-center justify-center group">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity bg-cream/90 text-brown text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                      >
                        <Upload size={12} /> Remplacer
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brown-light pointer-events-none">
                    {isDragging ? (
                      <>
                        <Upload size={28} className="text-terracotta" />
                        <span className="text-sm text-terracotta font-medium">Déposer l&apos;image</span>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={28} />
                        <span className="text-sm font-medium text-brown-mid">Glissez une image ici</span>
                        <span className="text-xs">ou cliquez pour sélectionner</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {uploadError && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{uploadError}</p>
              )}

              <FormField label="URLs images supplémentaires" required={false}>
                <textarea
                  value={form.images}
                  onChange={(e) => setForm((f) => ({ ...f, images: e.target.value }))}
                  rows={3}
                  placeholder={"https://url-image-2.jpg\nhttps://url-image-3.jpg"}
                  className={inputCls + " resize-none font-mono text-xs"}
                />
                <p className="text-xs text-brown-light mt-1">Une URL par ligne. S&apos;affichent dans le carousel de la fiche produit.</p>
              </FormField>

              <FormField label="Nom" required>
                <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className={inputCls} />
              </FormField>

              <FormField label="Description">
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className={inputCls + " resize-none"} />
              </FormField>

              <div className="grid grid-cols-2 gap-4">
                <FormField label="Prix (€)" required>
                  <input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required placeholder="49.90" className={inputCls} />
                </FormField>
                <FormField label="Stock" required>
                  <input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} required className={inputCls} />
                </FormField>
              </div>

              <FormField label="Catégorie" required>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subCategory: "" }))}
                  className={inputCls}
                  required
                >
                  <option value="">— Choisir une catégorie —</option>
                  {categories.map((cat) => (
                    <option key={cat.key} value={cat.key}>{cat.label}</option>
                  ))}
                </select>
              </FormField>

              {form.category && (() => {
                const cat = categories.find((c) => c.key === form.category);
                return cat && (cat.subCategories ?? []).length > 0 ? (
                  <FormField label="Sous-catégorie">
                    <select
                      value={form.subCategory}
                      onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="">— Aucune sous-catégorie —</option>
                      {cat.subCategories.map((sub) => (
                        <option key={sub.key} value={sub.key}>{sub.label}</option>
                      ))}
                    </select>
                  </FormField>
                ) : null;
              })()}

              <FormField label="Matériaux">
                <textarea
                  value={form.materials}
                  onChange={(e) => setForm((f) => ({ ...f, materials: e.target.value }))}
                  rows={2}
                  placeholder="Ex : Or 18 carats, Diamant 0.5ct, Platine"
                  className={inputCls + " resize-none"}
                />
              </FormField>

              <FormField label="Conseils d'entretien">
                <textarea
                  value={form.careInstructions}
                  onChange={(e) => setForm((f) => ({ ...f, careInstructions: e.target.value }))}
                  rows={2}
                  placeholder="Ex : Éviter le contact avec l'eau, ranger dans un écrin..."
                  className={inputCls + " resize-none"}
                />
              </FormField>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))} className="w-4 h-4 rounded accent-terracotta" />
                <span className="text-sm font-medium text-brown-mid">Mettre en vedette (homepage)</span>
              </label>

              {/* ─── Section personnalisation ─── */}
              <div className="border border-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowCustomSection((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-sand hover:bg-parchment transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Wand2 size={14} className="text-terracotta" />
                    <span className="text-sm font-semibold text-brown">
                      Personnalisation
                      {customFields.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-terracotta">
                          ({customFields.length} champ{customFields.length > 1 ? "s" : ""})
                        </span>
                      )}
                    </span>
                  </div>
                  {showCustomSection ? <ChevronUp size={15} className="text-brown-light" /> : <ChevronDown size={15} className="text-brown-light" />}
                </button>

                {showCustomSection && (
                  <div className="p-4 space-y-4">
                    <p className="text-xs text-brown-light">
                      Ajoutez des options de personnalisation (couleur, taille de paillettes, prénom…) que le client devra renseigner avant d&apos;ajouter au panier.
                    </p>

                    {customFields.map((field, idx) => (
                      <div key={field.id} className="bg-sand border border-border rounded-xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-brown-mid">Champ {idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeCustomField(field.id)}
                            className="p-1 text-brown-light hover:text-terracotta transition-colors"
                          >
                            <X size={13} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-brown-mid mb-1">Libellé *</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                              placeholder="Ex : Prénom, Couleur…"
                              className={inputCls + " text-xs py-2"}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-brown-mid mb-1">Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomField(field.id, {
                                type: e.target.value as CustomizationField["type"],
                                options: e.target.value === "text" ? [] : field.options,
                              })}
                              className={inputCls + " text-xs py-2"}
                            >
                              <option value="text">Texte libre</option>
                              <option value="select">Liste d&apos;options</option>
                              <option value="color">Palette de couleurs</option>
                            </select>
                          </div>
                        </div>

                        {field.type === "text" && (
                          <div>
                            <label className="block text-xs font-medium text-brown-mid mb-1">
                              Supplément prix <span className="text-brown-light font-normal">(€, si renseigné)</span>
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={field.extraPrice !== undefined ? field.extraPrice / 100 : ""}
                              onChange={(e) => updateCustomField(field.id, {
                                extraPrice: e.target.value ? Math.round(parseFloat(e.target.value) * 100) : undefined,
                              })}
                              placeholder="Ex : 5 pour +5,00 €"
                              className={inputCls + " text-xs py-2"}
                            />
                          </div>
                        )}

                        {(field.type === "select" || field.type === "color") && (
                          <div>
                            <label className="block text-xs font-medium text-brown-mid mb-1">
                              Options <span className="text-brown-light font-normal">(une par ligne)</span>
                            </label>
                            <textarea
                              value={(field.options ?? []).join("\n")}
                              onChange={(e) => updateCustomField(field.id, {
                                options: e.target.value.split("\n").map((s) => s.trim()),
                              })}
                              rows={3}
                              placeholder={field.type === "color"
                                ? "Or\nArgent:10\nRose:5\nBronze"
                                : "Petite\nMoyenne:3\nGrande:5"
                              }
                              className={inputCls + " resize-none text-xs py-2"}
                            />
                            <p className="text-xs text-brown-light mt-1">
                              Pour ajouter un supplément : <span className="font-mono">NomOption:prix</span> — ex. <span className="font-mono">Or:10</span> = +10,00 €
                            </p>
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                            className="w-3.5 h-3.5 rounded accent-terracotta"
                          />
                          <span className="text-xs text-brown-mid">Champ obligatoire</span>
                        </label>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addCustomField}
                      className="flex items-center gap-2 w-full py-2.5 border border-dashed border-border rounded-xl text-xs text-brown-light hover:text-brown hover:border-brown-light transition-colors justify-center"
                    >
                      <Plus size={13} /> Ajouter un champ
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-border text-brown-mid rounded-xl text-sm font-medium hover:bg-sand transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50">
                  {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-brown-mid mb-1.5">
        {label}{required && <span className="text-terracotta ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
