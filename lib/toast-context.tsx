"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, X } from "lucide-react";
import Image from "next/image";

interface Toast {
  id: string;
  message: string;
  imageUrl?: string;
  price?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-3 bg-brown text-cream px-4 py-3 rounded-2xl shadow-xl min-w-64 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            {toast.imageUrl ? (
              <div className="relative w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-brown-mid">
                <Image src={toast.imageUrl} alt="" fill className="object-cover" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-green-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={16} className="text-cream" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{toast.message}</p>
              {toast.price && (
                <p className="text-xs text-cream/60 mt-0.5">{toast.price}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-cream/50 hover:text-cream transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
