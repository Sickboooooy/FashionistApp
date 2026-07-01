import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Send, X, MessageCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

/** Tarjeta de producto que el backend surface vía tool-calling de Grok. */
interface ProductCard {
  id: number;
  name: string;
  category: string;
  price: string;
  imageUrl: string | null;
  description: string | null;
  inStock: boolean;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  products?: ProductCard[];
}

const GREETING: ChatMsg = {
  role: "assistant",
  content:
    "¡Hola! Soy Anna, tu estilista personal ✨ Cuéntame la ocasión o la prenda que buscas y armo tu look perfecto con lo que hay en la tienda.",
};

const QUICK_PROMPTS = [
  "¿Qué me pongo para una boda de día?",
  "Busca un vestido negro elegante",
  "Arma un look casual de oficina",
];

/** Normaliza la ruta de imagen del producto para el <img src>. */
function productImage(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("data:")) return url;
  return "/" + url.replace(/^\/+/, "");
}

function ProductRow({ products }: { products: ProductCard[] }) {
  if (!products?.length) return null;
  return (
    <div className="mt-2 flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {products.map((p) => {
        const img = productImage(p.imageUrl);
        return (
          <div
            key={p.id}
            className="shrink-0 w-32 rounded-xl border border-amber-500/20 bg-white/[0.03] overflow-hidden hover:border-amber-500/40 transition-colors"
          >
            <div className="h-24 w-full bg-stone-800/60 flex items-center justify-center overflow-hidden">
              {img ? (
                <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <Sparkles className="w-5 h-5 text-amber-500/40" />
              )}
            </div>
            <div className="p-2">
              <p className="text-stone-200 text-xs font-medium leading-tight line-clamp-2">{p.name}</p>
              <p className="text-amber-400 text-sm font-semibold mt-1">{p.price}</p>
              {!p.inStock && <p className="text-stone-500 text-[10px] mt-0.5">Agotado</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Anna está escribiendo">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-bounce"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

export default function StylistChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, isOpen]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const next: ChatMsg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(next);
    setInput("");
    setIsLoading(true);

    try {
      const res = await apiRequest("POST", "/api/chat", {
        messages: next.map((m) => ({ role: m.role, content: m.content })),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, products: data.products },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Ups, tuve un problema para responder. ¿Lo intentamos de nuevo en un momento? 🙏",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => setIsOpen(true)}
            aria-label="Abrir asistente de estilo"
            className="fixed z-[60] bottom-5 right-5 md:bottom-6 md:right-6 group flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900 shadow-[0_8px_30px_-6px_rgba(245,158,11,0.5)] hover:shadow-[0_10px_40px_-6px_rgba(245,158,11,0.7)] transition-shadow cursor-pointer"
          >
            <span className="absolute inset-0 rounded-full bg-amber-400/40 animate-ping [animation-duration:2.5s]" />
            <MessageCircle className="w-6 h-6 relative z-10" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel de chat */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            role="dialog"
            aria-label="Asistente de estilo Anna"
            className="fixed z-[60] bottom-0 right-0 left-0 md:bottom-6 md:right-6 md:left-auto md:w-[380px] h-[85vh] md:h-[70vh] md:max-h-[620px] flex flex-col glass-card glass-sheen rounded-t-2xl md:rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-amber-500/15 bg-white/[0.02]">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900">
                <Sparkles className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-stone-950" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-montserrat text-sm text-stone-100 leading-tight">Anna · Estilista IA</p>
                <p className="text-[11px] text-stone-400 leading-tight">En línea · potenciada por Grok</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar chat"
                className="flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mensajes */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div className={m.role === "user" ? "max-w-[85%]" : "max-w-[90%]"}>
                    <div
                      className={
                        m.role === "user"
                          ? "rounded-2xl rounded-br-sm bg-amber-500/90 text-stone-900 px-3.5 py-2 text-sm leading-relaxed"
                          : "rounded-2xl rounded-bl-sm bg-white/[0.05] border border-white/[0.06] text-stone-200 px-3.5 py-2 text-sm leading-relaxed"
                      }
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {m.content}
                    </div>
                    {m.role === "assistant" && m.products && <ProductRow products={m.products} />}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-sm bg-white/[0.05] border border-white/[0.06] px-3.5 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}

              {/* Sugerencias rápidas (solo al inicio) */}
              {messages.length === 1 && !isLoading && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_PROMPTS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="text-xs text-amber-300 border border-amber-500/30 rounded-full px-3 py-1.5 hover:bg-amber-500/10 transition-colors cursor-pointer"
                      style={{ fontFamily: "'Montserrat', sans-serif" }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 px-3 py-3 border-t border-amber-500/15 bg-white/[0.02]"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje…"
                maxLength={1000}
                aria-label="Mensaje para Anna"
                className="flex-1 bg-white/[0.05] border border-white/[0.08] focus:border-amber-500/50 rounded-xl px-3.5 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 outline-none transition-colors"
                style={{ fontFamily: "'Montserrat', sans-serif" }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="Enviar mensaje"
                className="flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-[0_0_20px_-4px_rgba(245,158,11,0.5)] transition-shadow cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
