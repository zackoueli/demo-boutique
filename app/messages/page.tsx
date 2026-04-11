"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  collection, addDoc, query, where, orderBy,
  onSnapshot, serverTimestamp, doc, updateDoc, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import type { Conversation, Message } from "@/lib/types";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send, Plus, ChevronRight } from "lucide-react";

function formatDate(date: Date | { seconds: number } | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date((date as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ─── Vue liste des conversations ─── */
function ConversationList({
  conversations,
  selected,
  onSelect,
  onNew,
}: {
  conversations: Conversation[];
  selected: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <p className="font-semibold text-brown text-sm">Mes conversations</p>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brown text-cream rounded-xl text-xs font-medium hover:bg-brown-mid transition-colors"
        >
          <Plus size={12} /> Nouveau
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageSquare size={28} className="text-parchment mx-auto mb-3" />
            <p className="text-sm text-brown-light">Aucune conversation</p>
            <p className="text-xs text-brown-light mt-1">Démarrez un nouveau fil de discussion</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={`w-full text-left p-4 border-b border-border hover:bg-sand transition-colors ${
                selected === conv.id ? "bg-sand" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-brown truncate flex-1">{conv.subject}</p>
                <ChevronRight size={14} className="text-brown-light flex-shrink-0 mt-0.5" />
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-brown-light truncate mt-0.5">{conv.lastMessage}</p>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                  conv.status === "open"
                    ? "bg-green-50 text-green-700"
                    : "bg-sand text-brown-light border border-border"
                }`}>
                  {conv.status === "open" ? "Ouvert" : "Fermé"}
                </span>
                <span className="text-xs text-brown-light">{formatDate(conv.lastMessageAt as unknown as { seconds: number })}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Vue détail conversation ─── */
function ConversationDetail({
  conversationId,
  status,
  onBack,
}: {
  conversationId: string;
  status: "open" | "closed";
  onBack: () => void;
}) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || sending || !user) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    try {
      await addDoc(collection(db, "conversations", conversationId, "messages"), {
        sender: "user",
        content,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", conversationId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 hover:bg-sand rounded-lg transition-colors md:hidden">
          <ArrowLeft size={16} className="text-brown-mid" />
        </button>
        <p className="font-semibold text-brown text-sm">Conversation</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-brown-light py-6">Démarrez la conversation ci-dessous.</p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                msg.sender === "user"
                  ? "bg-brown text-cream rounded-tr-sm"
                  : "bg-sand border border-border text-brown rounded-tl-sm"
              }`}
            >
              {msg.sender === "admin" && (
                <p className="text-xs font-semibold mb-1 text-terracotta">Bijoux & Co</p>
              )}
              <p className="leading-relaxed">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.sender === "user" ? "text-cream/60" : "text-brown-light"}`}>
                {formatDate(msg.createdAt as unknown as { seconds: number })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {status === "open" ? (
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
              placeholder="Votre message…"
              className="flex-1 px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim()}
              className="p-3 bg-brown text-cream rounded-xl hover:bg-brown-mid transition-colors disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 border-t border-border">
          <p className="text-center text-xs text-brown-light bg-sand border border-border rounded-xl py-3 px-4">
            Cette conversation a été clôturée. Contactez-nous pour la rouvrir.
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Formulaire nouvelle conversation ─── */
function NewConversationForm({
  onCreated,
  onCancel,
}: {
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const { user, profile } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const SUBJECTS = [
    "Question sur une commande",
    "Question sur un produit",
    "Demande de personnalisation",
    "Retour / Remboursement",
    "Autre",
  ];

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!subject || !message.trim() || !user) return;
    setLoading(true);
    try {
      const convRef = await addDoc(collection(db, "conversations"), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName ?? user.email,
        subject,
        status: "open",
        lastMessage: message.trim(),
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      await addDoc(collection(db, "conversations", convRef.id, "messages"), {
        sender: "user",
        content: message.trim(),
        createdAt: serverTimestamp(),
      });
      onCreated(convRef.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onCancel} className="p-1.5 hover:bg-sand rounded-lg transition-colors">
          <ArrowLeft size={16} className="text-brown-mid" />
        </button>
        <h2 className="font-serif font-semibold text-brown">Nouvelle conversation</h2>
      </div>
      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brown-mid mb-1.5">
            Sujet <span className="text-terracotta">*</span>
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown focus:outline-none focus:ring-2 focus:ring-brown transition appearance-none"
          >
            <option value="">Choisir un sujet…</option>
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
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={5}
            placeholder="Décrivez votre demande…"
            className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition resize-none"
          />
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 border border-border rounded-xl text-sm text-brown-mid hover:bg-sand transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-3 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Envoyer"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ─── Page principale ─── */
export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/connexion");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "conversations"),
      where("userId", "==", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation)));
    });
    return unsub;
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="bg-cream min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-border border-t-terracotta rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-sand border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <Link href="/compte" className="inline-flex items-center gap-2 text-sm text-brown-light hover:text-terracotta mb-4 transition-colors">
            <ArrowLeft size={14} /> Mon compte
          </Link>
          <div className="flex items-center gap-3">
            <MessageSquare size={20} className="text-terracotta" />
            <h1 className="font-serif text-3xl font-semibold text-brown">Mes messages</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="border border-border rounded-2xl overflow-hidden bg-cream" style={{ height: "600px" }}>
          <div className="flex h-full">
            {/* Colonne liste */}
            <div className={`w-full md:w-72 border-r border-border flex-shrink-0 ${selectedId || showNew ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
              {showNew ? (
                <NewConversationForm
                  onCreated={(id) => { setSelectedId(id); setShowNew(false); }}
                  onCancel={() => setShowNew(false)}
                />
              ) : (
                <ConversationList
                  conversations={conversations}
                  selected={selectedId}
                  onSelect={(id) => { setSelectedId(id); setShowNew(false); }}
                  onNew={() => { setShowNew(true); setSelectedId(null); }}
                />
              )}
            </div>

            {/* Colonne détail */}
            <div className={`flex-1 flex flex-col ${!selectedId && !showNew ? "hidden md:flex" : "flex"}`}>
              {selectedId ? (
                <ConversationDetail
                  key={selectedId}
                  conversationId={selectedId}
                  status={conversations.find((c) => c.id === selectedId)?.status ?? "open"}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <MessageSquare size={36} className="text-parchment mb-4" />
                  <p className="font-serif text-lg font-semibold text-brown mb-2">Vos échanges avec notre équipe</p>
                  <p className="text-sm text-brown-light mb-6 max-w-xs">
                    Sélectionnez une conversation ou démarrez-en une nouvelle.
                  </p>
                  <button
                    onClick={() => setShowNew(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors"
                  >
                    <Plus size={15} /> Nouvelle conversation
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
