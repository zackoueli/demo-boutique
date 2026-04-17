"use client";

import { useState, useEffect, useRef } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Conversation, Message } from "@/lib/types";
import { MessageSquare, Send, CheckCircle, X, ChevronRight, ChevronLeft, Mail } from "lucide-react";

function formatDate(date: { seconds: number } | Date | undefined): string {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date((date as { seconds: number }).seconds * 1000);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type ConvWithSource = Conversation & { source?: "contact" | "direct" };

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<ConvWithSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Charge toutes les conversations (messagerie + formulaire de contact = même collection)
  useEffect(() => {
    const q = query(collection(db, "conversations"), orderBy("lastMessageAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setConversations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ConvWithSource)));
    });
    return unsub;
  }, []);

  // Messages de la conversation sélectionnée
  useEffect(() => {
    if (!selectedId) { setMessages([]); return; }
    // Marquer comme lu par l'admin
    updateDoc(doc(db, "conversations", selectedId), { adminRead: true }).catch(() => {});
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
        status: "open",
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
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="mb-4 md:mb-6">
        <h1 className="font-serif text-2xl font-semibold text-brown">Messages</h1>
        <p className="text-sm text-brown-light mt-1">
          Formulaire de contact et messagerie — tous vos échanges clients au même endroit
        </p>
      </div>

      <div className="flex-1 border border-border rounded-2xl overflow-hidden flex flex-col md:flex-row">

        {/* ─── Liste des conversations ─── */}
        <div className={`${selectedId ? "hidden md:flex" : "flex"} md:w-80 border-b md:border-b-0 md:border-r border-border flex-col flex-shrink-0`}>
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-brown uppercase tracking-widest">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
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
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        {/* Badge source */}
                        {conv.source === "contact" ? (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700 flex-shrink-0">
                            <Mail size={9} /> Contact
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 flex-shrink-0">
                            <MessageSquare size={9} /> Messagerie
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          conv.status === "open"
                            ? "bg-green-50 text-green-700"
                            : "bg-sand text-brown-light border border-border"
                        }`}>
                          {conv.status === "open" ? "Ouvert" : "Fermé"}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-brown truncate">{conv.subject}</p>
                      <p className="text-xs text-brown-light truncate">{conv.userEmail}</p>
                      {conv.lastMessage && (
                        <p className="text-xs text-brown-light truncate mt-0.5 italic">{conv.lastMessage}</p>
                      )}
                      <p className="text-xs text-brown-light mt-1">{formatDate(conv.lastMessageAt as unknown as { seconds: number })}</p>
                    </div>
                    <ChevronRight size={14} className="text-brown-light flex-shrink-0 mt-1" />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ─── Détail conversation ─── */}
        <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 flex-col`}>
          {selected ? (
            <>
              {/* En-tête conversation */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1 -ml-1 text-brown-light hover:text-brown flex-shrink-0"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      {selected.source === "contact" ? (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                          <Mail size={9} /> Formulaire de contact
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700">
                          <MessageSquare size={9} /> Messagerie
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-brown text-sm truncate">{selected.subject}</p>
                    <p className="text-xs text-brown-light">{selected.userName} · {selected.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      msg.sender === "admin"
                        ? "bg-brown text-cream rounded-tr-sm"
                        : "bg-sand border border-border text-brown rounded-tl-sm"
                    }`}>
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

              {/* Zone de réponse */}
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
              <p className="font-serif text-lg font-semibold text-brown mb-2">Tous vos échanges clients</p>
              <p className="text-sm text-brown-light max-w-xs">
                Formulaire de contact et messagerie sont regroupés ici. Sélectionnez une conversation pour répondre.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
