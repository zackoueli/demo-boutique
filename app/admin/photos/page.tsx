"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, X, Check, ImageIcon, Loader2 } from "lucide-react";
import { usePhotos } from "@/lib/use-photos";

const inputCls = "w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown focus:border-transparent transition";

export default function AdminPhotosPage() {
  const { photos, loading, uploadPhoto, updateCaption, deletePhoto } = usePhotos();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState("");

  function onFileSelect(f: File) {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);
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
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelect(f);
  }

  async function handleUpload() {
    if (!file) return;
    try {
      await uploadPhoto(file, caption, setUploadProgress);
      setFile(null);
      setPreview(null);
      setCaption("");
      setUploadProgress(null);
    } catch (err) {
      console.error(err);
      setUploadProgress(null);
    }
  }

  async function saveCaption(id: string) {
    await updateCaption(id, editCaption);
    setEditingId(null);
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs text-terracotta font-medium uppercase tracking-[0.18em] mb-1">Gestion</p>
          <h1 className="font-serif text-2xl font-semibold text-brown">Photos Souvenirs</h1>
        </div>
        <span className="text-sm text-brown-light">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Zone upload */}
      <div className="bg-sand border border-border rounded-2xl p-6 mb-8 space-y-4">
        <p className="text-sm font-semibold text-brown">Ajouter une photo</p>

        {/* Drop zone */}
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => !preview && fileInputRef.current?.click()}
          className={`relative h-40 rounded-2xl border-2 transition-colors overflow-hidden ${
            isDragging
              ? "border-terracotta bg-terracotta/5 border-solid"
              : preview
              ? "border-border"
              : "border-dashed border-border hover:border-brown-light cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFileSelect(f); e.target.value = ""; }}
          />

          {uploadProgress !== null ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-sand/90">
              <Loader2 size={24} className="text-terracotta animate-spin" />
              <div className="w-32 h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-terracotta rounded-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className="text-xs text-brown-light">{uploadProgress}%</span>
            </div>
          ) : preview ? (
            <>
              <Image src={preview} alt="aperçu" fill sizes="512px" className="object-cover" />
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                className="absolute top-2 right-2 p-1.5 bg-brown/70 hover:bg-brown rounded-lg text-cream transition-colors"
              >
                <X size={14} />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-brown-light pointer-events-none">
              <ImageIcon size={28} />
              <span className="text-sm font-medium text-brown-mid">
                {isDragging ? "Déposer l'image" : "Glissez une image ou cliquez"}
              </span>
            </div>
          )}
        </div>

        {/* Légende + bouton */}
        {preview && (
          <div className="flex gap-3">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Légende (ex : Mariage de Sophie & Paul, juin 2024)"
              className={inputCls}
            />
            <button
              onClick={handleUpload}
              disabled={uploadProgress !== null}
              className="flex items-center gap-2 px-5 py-3 bg-brown text-cream text-sm font-medium rounded-xl hover:bg-brown-mid transition-colors disabled:opacity-50 flex-shrink-0"
            >
              <Plus size={15} /> Ajouter
            </button>
          </div>
        )}
      </div>

      {/* Grille photos */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-parchment rounded-2xl animate-pulse" />)}
        </div>
      ) : photos.length === 0 ? (
        <div className="py-20 text-center text-brown-light font-serif">
          <ImageIcon size={40} className="mx-auto mb-4 text-parchment" />
          Aucune photo pour l&apos;instant.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-cream border border-border rounded-2xl overflow-hidden group">
              <div className="relative aspect-square bg-sand">
                <Image src={photo.url} alt={photo.caption} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
                <button
                  onClick={() => {
                    if (confirm("Supprimer cette photo ?")) deletePhoto(photo.id, photo.storagePath);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/30 hover:bg-red-500 text-white rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                {editingId === photo.id ? (
                  <div className="flex gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveCaption(photo.id); if (e.key === "Escape") setEditingId(null); }}
                      className="flex-1 px-2 py-1 text-xs border border-border rounded-lg bg-cream text-brown focus:outline-none focus:ring-1 focus:ring-brown"
                    />
                    <button onClick={() => saveCaption(photo.id)} className="p-1 text-terracotta hover:text-terra-light"><Check size={13} /></button>
                    <button onClick={() => setEditingId(null)} className="p-1 text-brown-light hover:text-brown"><X size={13} /></button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-brown-light italic truncate flex-1">{photo.caption || <span className="not-italic text-border">Pas de légende</span>}</p>
                    <button
                      onClick={() => { setEditingId(photo.id); setEditCaption(photo.caption); }}
                      className="p-1 text-brown-light hover:text-brown transition-colors flex-shrink-0"
                    >
                      <Pencil size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
