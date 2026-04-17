"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight, FolderOpen, Tag, ImageIcon, Loader2 } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import {
  useCategories, addCategory, updateCategory, deleteCategory,
  addSubCategory, updateSubCategory, deleteSubCategory, updateCategoryImage,
} from "@/lib/categories";

const inputCls = "px-3 py-2 border border-border rounded-lg text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition";

export default function AdminCategoriesPage() {
  const { categories, loading } = useCategories();

  const [newCatLabel, setNewCatLabel] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatLabel, setEditingCatLabel] = useState("");

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const [newSubLabel, setNewSubLabel] = useState<Record<string, string>>({});
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);

  const [editingSub, setEditingSub] = useState<{ catId: string; subKey: string } | null>(null);
  const [editingSubLabel, setEditingSubLabel] = useState("");

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function toggleExpand(id: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAddCat() {
    const label = newCatLabel.trim();
    if (!label) return;
    await addCategory(label);
    setNewCatLabel("");
    setAddingCat(false);
  }

  async function handleUpdateCat(id: string) {
    const label = editingCatLabel.trim();
    if (!label) return;
    await updateCategory(id, label);
    setEditingCatId(null);
  }

  async function handleDeleteCat(id: string, label: string) {
    if (!confirm(`Supprimer la catégorie "${label}" et toutes ses sous-catégories ?`)) return;
    await deleteCategory(id);
  }

  async function handleAddSub(catId: string, subs: { key: string; label: string }[]) {
    const label = (newSubLabel[catId] ?? "").trim();
    if (!label) return;
    await addSubCategory(catId, label, subs);
    setNewSubLabel((prev) => ({ ...prev, [catId]: "" }));
    setAddingSubFor(null);
  }

  async function handleUpdateSub(catId: string, subKey: string, subs: { key: string; label: string }[]) {
    const label = editingSubLabel.trim();
    if (!label) return;
    await updateSubCategory(catId, subKey, label, subs);
    setEditingSub(null);
  }

  async function handleDeleteSub(catId: string, subKey: string, subLabel: string, subs: { key: string; label: string }[]) {
    if (!confirm(`Supprimer la sous-catégorie "${subLabel}" ?`)) return;
    await deleteSubCategory(catId, subKey, subs);
  }

  async function handleImageUpload(catId: string, file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploadingFor(catId);
    setUploadProgress(0);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `photos/categories/${catId}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      "state_changed",
      (snap) => setUploadProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setUploadingFor(null),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        await updateCategoryImage(catId, url);
        setUploadingFor(null);
      }
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Gestion</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Catégories</h1>
        </div>
        <button
          onClick={() => setAddingCat(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brown text-cream text-sm font-medium rounded-xl hover:bg-brown-mid transition-colors"
        >
          <Plus size={15} /> Nouvelle catégorie
        </button>
      </div>

      {addingCat && (
        <div className="bg-sand border border-border rounded-2xl p-4 mb-6 flex gap-3 items-center">
          <FolderOpen size={16} className="text-terracotta flex-shrink-0" />
          <input
            autoFocus type="text" value={newCatLabel}
            onChange={(e) => setNewCatLabel(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddCat(); if (e.key === "Escape") setAddingCat(false); }}
            placeholder="Nom de la catégorie"
            className={`${inputCls} flex-1`}
          />
          <button onClick={handleAddCat} className="p-2 text-terracotta hover:text-terra-light"><Check size={16} /></button>
          <button onClick={() => setAddingCat(false)} className="p-2 text-brown-light hover:text-brown"><X size={16} /></button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-parchment rounded-2xl animate-pulse" />)}
        </div>
      ) : categories.length === 0 ? (
        <div className="py-16 text-center text-brown-light font-serif">
          <FolderOpen size={36} className="mx-auto mb-4 text-parchment" />
          Aucune catégorie. Créez-en une !
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const isExpanded = expandedCats.has(cat.id);
            const isUploading = uploadingFor === cat.id;
            return (
              <div key={cat.id} className="bg-cream border border-border rounded-2xl overflow-hidden">
                {/* Ligne catégorie */}
                <div className="flex items-center gap-3 px-4 py-3.5 group">
                  <button onClick={() => toggleExpand(cat.id)} className="text-brown-light hover:text-brown transition-colors">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {/* Miniature image */}
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 relative cursor-pointer border border-border"
                    onClick={() => fileRefs.current[cat.id]?.click()}
                    title="Cliquer pour changer la photo"
                  >
                    {isUploading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-parchment gap-1">
                        <Loader2 size={12} className="text-terracotta animate-spin" />
                        <span className="text-[9px] text-brown-light">{uploadProgress}%</span>
                      </div>
                    ) : cat.imageUrl ? (
                      <Image src={cat.imageUrl} alt={cat.label} fill sizes="40px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-parchment hover:bg-sand transition-colors">
                        <ImageIcon size={14} className="text-brown-light" />
                      </div>
                    )}
                    <input
                      ref={(el) => { fileRefs.current[cat.id] = el; }}
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(cat.id, f); e.target.value = ""; }}
                    />
                  </div>

                  {editingCatId === cat.id ? (
                    <input
                      autoFocus type="text" value={editingCatLabel}
                      onChange={(e) => setEditingCatLabel(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleUpdateCat(cat.id); if (e.key === "Escape") setEditingCatId(null); }}
                      className={`${inputCls} flex-1`}
                    />
                  ) : (
                    <span className="flex-1 font-medium text-brown">{cat.label}</span>
                  )}

                  <span className="text-xs text-brown-light mr-2">{cat.subCategories?.length ?? 0} sous-cat.</span>

                  {editingCatId === cat.id ? (
                    <>
                      <button onClick={() => handleUpdateCat(cat.id)} className="p-1.5 text-terracotta hover:text-terra-light"><Check size={14} /></button>
                      <button onClick={() => setEditingCatId(null)} className="p-1.5 text-brown-light hover:text-brown"><X size={14} /></button>
                    </>
                  ) : (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingCatId(cat.id); setEditingCatLabel(cat.label); }} className="p-1.5 text-brown-light hover:text-brown transition-colors"><Pencil size={13} /></button>
                      <button onClick={() => handleDeleteCat(cat.id, cat.label)} className="p-1.5 text-brown-light hover:text-red-500 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  )}
                </div>

                {/* Sous-catégories */}
                {isExpanded && (
                  <div className="border-t border-border bg-sand/50 px-4 py-3 space-y-2">
                    {(cat.subCategories ?? []).length === 0 && addingSubFor !== cat.id && (
                      <p className="text-xs text-brown-light italic">Aucune sous-catégorie</p>
                    )}
                    {(cat.subCategories ?? []).map((sub) => (
                      <div key={sub.key} className="flex items-center gap-2 group/sub pl-2">
                        <Tag size={12} className="text-brown-light flex-shrink-0" />
                        {editingSub?.catId === cat.id && editingSub.subKey === sub.key ? (
                          <input
                            autoFocus type="text" value={editingSubLabel}
                            onChange={(e) => setEditingSubLabel(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateSub(cat.id, sub.key, cat.subCategories); if (e.key === "Escape") setEditingSub(null); }}
                            className={`${inputCls} flex-1 text-xs py-1.5`}
                          />
                        ) : (
                          <span className="flex-1 text-sm text-brown-light">{sub.label}</span>
                        )}
                        {editingSub?.catId === cat.id && editingSub.subKey === sub.key ? (
                          <>
                            <button onClick={() => handleUpdateSub(cat.id, sub.key, cat.subCategories)} className="p-1 text-terracotta"><Check size={12} /></button>
                            <button onClick={() => setEditingSub(null)} className="p-1 text-brown-light"><X size={12} /></button>
                          </>
                        ) : (
                          <div className="flex gap-1 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                            <button onClick={() => { setEditingSub({ catId: cat.id, subKey: sub.key }); setEditingSubLabel(sub.label); }} className="p-1 text-brown-light hover:text-brown"><Pencil size={11} /></button>
                            <button onClick={() => handleDeleteSub(cat.id, sub.key, sub.label, cat.subCategories)} className="p-1 text-brown-light hover:text-red-500"><Trash2 size={11} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                    {addingSubFor === cat.id ? (
                      <div className="flex items-center gap-2 pl-2 mt-2">
                        <Tag size={12} className="text-terracotta flex-shrink-0" />
                        <input
                          autoFocus type="text" value={newSubLabel[cat.id] ?? ""}
                          onChange={(e) => setNewSubLabel((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") handleAddSub(cat.id, cat.subCategories); if (e.key === "Escape") setAddingSubFor(null); }}
                          placeholder="Nom de la sous-catégorie"
                          className={`${inputCls} flex-1 text-xs py-1.5`}
                        />
                        <button onClick={() => handleAddSub(cat.id, cat.subCategories)} className="p-1 text-terracotta"><Check size={13} /></button>
                        <button onClick={() => setAddingSubFor(null)} className="p-1 text-brown-light"><X size={13} /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSubFor(cat.id)}
                        className="flex items-center gap-1.5 text-xs text-brown-light hover:text-terracotta transition-colors mt-1 pl-2"
                      >
                        <Plus size={12} /> Ajouter une sous-catégorie
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
