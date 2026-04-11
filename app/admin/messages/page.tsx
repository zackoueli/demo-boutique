"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp, getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Conversation, Message, ContactMessage } from "@/lib/types";
import { MessageSquare, Mail, Send, CheckCircle, X, ChevronRight, Inbox } from "lucide-react";

function formatDate(date: { seconds: number } | Date | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date((date as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type AdminTab = "conversations" | "contact";

/* ─── Panneau conversations ─── */
function ConversationsPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "conversations"), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation)));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    const q = query(
      collection(db, "conversations", selectedId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message)));
    });
    return unsub;
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendReply() {
    if (!reply.trim() || sending || !selectedId) return;
    setSending(true);
    const content = reply.trim();
    setReply("");
    try {
      await addDoc(collection(db, "conversations", selectedId, "messages"), {
        sender: "admin",
        content,
        createdAt: serverTimestamp(),
      });
      await updateDoc(doc(db, "conversations", selectedId), {
        lastMessage: content,
        lastMessageAt: serverTimestamp(),
      });
    } finally {
      setSending(false);
    }
  }

  async function closeConversation(id: string) {
    await updateDoc(doc(db, "conversations", id), { status: "closed" });
    if (selectedId === id) setSelectedId(null);
  }

  async function reopenConversation(id: string) {
    await updateDoc(doc(db, "conversations", id), { status: "open" });
  }

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="flex h-full">
      {/* Liste */}
      <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-brown uppercase tracking-widest">
            Conversations ({conversations.length})
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare size={24} className="text-parchment mx-auto mb-2" />
              <p className="text-sm text-brown-light">Aucune conversation</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedId(conv.id)}
                className={`w-full text-left p-4 border-b border-border hover:bg-sand transition-colors ${
                  selectedId === conv.id ? "bg-sand" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brown truncate">{conv.subject}</p>
                    <p className="text-xs text-brown-light truncate mt-0.5">{conv.userEmail}</p>
                    {conv.lastMessage && (
                      <p className="text-xs text-brown-light truncate mt-0.5 italic">{conv.lastMessage}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-md ${
                        conv.status === "open"
                          ? "bg-green-50 text-green-700"
                          : "bg-sand text-brown-light border border-border"
                      }`}>
                        {conv.status === "open" ? "Ouvert" : "Fermé"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-brown-light flex-shrink-0 mt-1" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Détail */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <div>
                <p className="font-semibold text-brown text-sm">{selected.subject}</p>
                <p className="text-xs text-brown-light">{selected.userName} · {selected.userEmail}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.status === "open" ? (
                  <button
                    onClick={() => closeConversation(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-xl hover:bg-sand transition-colors text-brown-mid"
                  >
                    <X size={12} /> Fermer
                  </button>
                ) : (
                  <button
                    onClick={() => reopenConversation(selected.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-xl hover:bg-sand transition-colors text-green-700"
                  >
                    <CheckCircle size={12} /> Rouvrir
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender === "admin"
                        ? "bg-brown text-cream rounded-tr-sm"
                        : "bg-sand border border-border text-brown rounded-tl-sm"
                    }`}
                  >
                    {msg.sender === "user" && (
                      <p className="text-xs font-semibold mb-1 text-terracotta">{selected.userName}</p>
                    )}
                    {msg.sender === "admin" && (
                      <p className="text-xs font-semibold mb-1 text-cream/70">Bijoux & Co</p>
                    )}
                    <p className="leading-relaxed">{msg.content}</p>
                    <p className={`text-xs mt-1 ${msg.sender === "admin" ? "text-cream/60" : "text-brown-light"}`}>
                      {formatDate(msg.createdAt as unknown as { seconds: number })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {selected.status === "open" && (
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendReply())}
                    placeholder="Votre réponse…"
                    className="flex-1 px-4 py-3 border border-border rounded-xl text-sm bg-cream text-brown placeholder:text-brown-light focus:outline-none focus:ring-2 focus:ring-brown transition"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="p-3 bg-brown text-cream rounded-xl hover:bg-brown-mid transition-colors disabled:opacity-40"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <MessageSquare size={36} className="text-parchment mb-4" />
            <p className="font-serif text-lg font-semibold text-brown mb-2">Conversations clients</p>
            <p className="text-sm text-brown-light max-w-xs">
              Sélectionnez une conversation pour voir l&apos;échange et répondre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Panneau messages de contact ─── */
function ContactMessagesPanel() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "contactMessages"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ContactMessage)));
      setLoading(false);
    });
    return unsub;
  }, []);

  async function markAsRead(msg: ContactMessage) {
    if (msg.status === "unread") {
      await updateDoc(doc(db, "contactMessages", msg.id), { status: "read" });
    }
    setSelected({ ...msg, status: msg.status === "unread" ? "read" : msg.status });
  }

  async function markAsReplied(id: string) {
    await updateDoc(doc(db, "contactMessages", id), { status: "replied" });
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "replied" } : m));
    if (selected?.id === id) setSelected((s) => s ? { ...s, status: "replied" } : null);
  }

  const statusColors: Record<ContactMessage["status"], string> = {
    unread: "bg-terracotta/10 text-terracotta",
    read: "bg-sand text-brown-mid border border-border",
    replied: "bg-green-50 text-green-700",
  };
  const statusLabels: Record<ContactMessage["status"], string> = {
    unread: "Non lu",
    read: "Lu",
    replied: "Répondu",
  };

  return (
    <div className="flex h-full">
      {/* Liste */}
      <div className="w-80 border-r border-border flex flex-col flex-shrink-0">
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-brown uppercase tracking-widest">
            Messages ({messages.filter((m) => m.status === "unread").length} non lus)
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-border border-t-terracotta rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="p-6 text-center">
              <Inbox size={24} className="text-parchment mx-auto mb-2" />
              <p className="text-sm text-brown-light">Aucun message</p>
            </div>
          ) : (
            messages.map((msg) => (
              <button
                key={msg.id}
                onClick={() => markAsRead(msg)}
                className={`w-full text-left p-4 border-b border-border hover:bg-sand transition-colors ${
                  selected?.id === msg.id ? "bg-sand" : ""
                } ${msg.status === "unread" ? "bg-terracotta/5" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {msg.status === "unread" && (
                        <span className="w-2 h-2 rounded-full bg-terracotta flex-shrink-0" />
                      )}
                      <p className="text-sm font-medium text-brown truncate">{msg.subject}</p>
                    </div>
                    <p className="text-xs text-brown-light mt-0.5">{msg.name} · {msg.email}</p>
                    <p className="text-xs text-brown-light truncate mt-0.5 italic">{msg.message}</p>
                    <span className={`inline-block text-xs px-1.5 py-0.5 rounded-md mt-1.5 ${statusColors[msg.status]}`}>
                      {statusLabels[msg.status]}
                    </span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Détail */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <div className="p-6 flex flex-col h-full overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h3 className="font-serif font-semibold text-brown text-lg">{selected.subject}</h3>
                <p className="text-sm text-brown-light mt-1">
                  De : <span className="font-medium text-brown-mid">{selected.name}</span>
                  {" · "}<a href={`mailto:${selected.email}`} className="hover:text-terracotta transition-colors">{selected.email}</a>
                </p>
                <p className="text-xs text-brown-light mt-1">{formatDate(selected.createdAt as unknown as { seconds: number })}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-xl flex-shrink-0 ${statusColors[selected.status]}`}>
                {statusLabels[selected.status]}
              </span>
            </div>

            <div className="flex-1 bg-sand border border-border rounded-2xl p-5 mb-6">
              <p className="text-sm text-brown leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            </div>

            <div className="flex gap-3">
              <a
                href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
                className="flex items-center gap-2 px-5 py-2.5 bg-brown text-cream rounded-xl text-sm font-medium hover:bg-brown-mid transition-colors"
              >
                <Mail size={14} /> Répondre par email
              </a>
              {selected.status !== "replied" && (
                <button
                  onClick={() => markAsReplied(selected.id)}
                  className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm text-brown-mid hover:bg-sand transition-colors"
                >
                  <CheckCircle size={14} /> Marquer comme répondu
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Mail size={36} className="text-parchment mb-4" />
            <p className="font-serif text-lg font-semibold text-brown mb-2">Messages de contact</p>
            <p className="text-sm text-brown-light max-w-xs">
              Sélectionnez un message pour le lire et y répondre.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Page admin messages ─── */
export default function AdminMessagesPage() {
  const [tab, setTab] = useState<AdminTab>("conversations");

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold text-brown">Messages</h1>
        <p className="text-sm text-brown-light mt-1">Gérez vos échanges avec les clients</p>
      </div>

      <div className="flex gap-1 bg-sand border border-border rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setTab("conversations")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "conversations" ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"
          }`}
        >
          <MessageSquare size={14} /> Conversations
        </button>
        <button
          onClick={() => setTab("contact")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === "contact" ? "bg-cream text-brown shadow-sm" : "text-brown-light hover:text-brown"
          }`}
        >
          <Mail size={14} /> Formulaire de contact
        </button>
      </div>

      <div className="flex-1 border border-border rounded-2xl overflow-hidden">
        {tab === "conversations" ? <ConversationsPanel /> : <ContactMessagesPanel />}
      </div>
    </div>
  );
}
