import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Sparkles, Shirt, X, Download } from "lucide-react";

// Forma del producto que devuelve /api/products (ProductView del backend)
interface Product {
  id: number;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  priceFormatted: string;
  inStock: boolean;
}

type CategoryFilter = "all" | "top" | "bottom";

const VirtualTryOnPage = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paso 1: foto del usuario
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [modelPreview, setModelPreview] = useState<string | null>(null);

  // Paso 2: prenda elegida
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<CategoryFilter>("all");

  // Paso 3: resultado
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);

  // Catálogo de la tienda
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const visibleProducts = products.filter((p) =>
    filter === "all" ? true : p.category === filter
  );
  const selectedProduct = products.find((p) => p.id === selectedId) || null;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo no válido", description: "Sube una imagen (JPG o PNG).", variant: "destructive" });
      return;
    }
    if (modelPreview) URL.revokeObjectURL(modelPreview);
    setModelFile(file);
    setModelPreview(URL.createObjectURL(file));
    setResultImage(null);
  };

  const clearPhoto = () => {
    if (modelPreview) URL.revokeObjectURL(modelPreview);
    setModelFile(null);
    setModelPreview(null);
    setResultImage(null);
  };

  const handleTryOn = async () => {
    if (!modelFile || !selectedId) return;
    setIsLoading(true);
    setResultImage(null);
    try {
      const form = new FormData();
      form.append("modelImage", modelFile);

      const res = await fetch(`/api/products/${selectedId}/try-on`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Error ${res.status}`);
      }
      // El backend devuelve una ruta relativa (uploads/...). La servimos desde la raíz.
      const path = (data.image as string).startsWith("/") ? data.image : `/${data.image}`;
      setResultImage(path);
      toast({ title: "¡Listo!", description: `Probaste: ${data.product?.name ?? "la prenda"}.` });
    } catch (err: any) {
      toast({ title: "No se pudo generar la prueba", description: err.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const canTryOn = !!modelFile && !!selectedId && !isLoading;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <p className="text-amber-400/80 text-xs uppercase tracking-[0.3em] mb-3">
          Anna &middot; AI Fitting Room
        </p>
        <h1 className="font-playfair text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent leading-tight">
          Probador Virtual
        </h1>
        <p className="font-cormorant text-amber-100/70 mt-3 max-w-2xl mx-auto text-lg">
          Sube tu foto, elige una prenda de la tienda y mira cómo te queda. En 3 sencillos pasos.
        </p>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mt-6 text-xs">
          {[
            { n: 1, label: "Foto", done: !!modelFile },
            { n: 2, label: "Prenda", done: !!selectedId },
            { n: 3, label: "Resultado", done: !!resultImage },
          ].map((s, i) => (
            <div key={s.n} className="flex items-center gap-2">
              <span
                className={`flex items-center justify-center w-6 h-6 rounded-full border transition-colors ${
                  s.done
                    ? "bg-amber-500 border-amber-500 text-black font-bold"
                    : "border-amber-700/50 text-amber-300/70"
                }`}
              >
                {s.done ? "✓" : s.n}
              </span>
              <span className={s.done ? "text-amber-200" : "text-amber-300/50"}>{s.label}</span>
              {i < 2 && <span className="w-6 h-px bg-amber-700/40 mx-1" />}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* PASO 1: Tu foto */}
        <div className="glass-card glass-sheen h-full text-amber-50">
          <div className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 text-amber-300 font-semibold">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-black text-sm font-bold">1</span>
                Tu foto
              </h2>

              {!modelPreview ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  className="w-full aspect-[3/4] rounded-lg border-2 border-dashed border-amber-700/60 hover:border-amber-500 hover:bg-amber-900/10 transition-colors flex flex-col items-center justify-center gap-3 text-amber-300/80 cursor-pointer"
                >
                  <Upload className="h-10 w-10" />
                  <span className="text-sm font-medium">Sube tu foto</span>
                  <span className="text-xs text-amber-300/50">Arrastra o haz clic · JPG o PNG</span>
                  <span className="text-xs text-amber-300/40 px-6 text-center">
                    Para mejores resultados, usa una foto de cuerpo completo bien iluminada.
                  </span>
                </button>
              ) : (
                <div className="relative group">
                  <img
                    src={modelPreview}
                    alt="Tu foto"
                    className="w-full aspect-[3/4] object-cover rounded-lg border border-amber-700/50"
                  />
                  <button
                    onClick={clearPhoto}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-red-900/80 text-white rounded-full p-1.5 transition-colors"
                    title="Quitar foto"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-3 border-amber-600 text-amber-300 hover:bg-amber-900/30"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" /> Cambiar foto
                  </Button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
          </div>
        </div>

        {/* PASO 2: Elige una prenda */}
        <div className="glass-card glass-sheen h-full text-amber-50">
          <div className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 text-amber-300 font-semibold">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-black text-sm font-bold">2</span>
                Elige una prenda
              </h2>

              <div className="flex gap-2">
                {([
                  { key: "all", label: "Todas" },
                  { key: "top", label: "Tops" },
                  { key: "bottom", label: "Pantalones" },
                ] as { key: CategoryFilter; label: string }[]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors cursor-pointer ${
                      filter === f.key
                        ? "bg-amber-600 text-black border-amber-600 font-semibold"
                        : "border-amber-700/50 text-amber-300 hover:bg-amber-900/30"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {loadingProducts ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[28rem] overflow-y-auto pr-1">
                  {visibleProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedId(p.id);
                        setResultImage(null);
                      }}
                      className={`group text-left rounded-lg overflow-hidden border transition-all cursor-pointer ${
                        selectedId === p.id
                          ? "border-amber-500 ring-2 ring-amber-500/60"
                          : "border-amber-700/30 hover:border-amber-600"
                      }`}
                    >
                      <div className="aspect-square bg-black-elegant overflow-hidden">
                        <img
                          src={p.imageUrl || ""}
                          alt={p.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-amber-50 leading-tight line-clamp-2">{p.name}</p>
                        <p className="text-xs text-amber-400 font-semibold mt-1">{p.priceFormatted}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>

        {/* PASO 3: Resultado */}
        <div className="glass-card glass-sheen h-full text-amber-50">
          <div className="p-5 space-y-4">
              <h2 className="flex items-center gap-2 text-amber-300 font-semibold">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-600 text-black text-sm font-bold">3</span>
                Resultado
              </h2>

              <div className="w-full aspect-[3/4] rounded-lg border border-amber-700/50 bg-black-elegant flex items-center justify-center overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-col items-center gap-3 text-amber-300/70">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-amber-600" />
                    <p className="text-sm animate-pulse">Generando tu prueba...</p>
                  </div>
                ) : resultImage ? (
                  resultImage.endsWith(".svg") ? (
                    <object data={resultImage} type="image/svg+xml" className="w-full h-full object-contain">
                      <img src={resultImage} alt="Resultado" className="w-full h-full object-contain" />
                    </object>
                  ) : (
                    <img src={resultImage} alt="Resultado de la prueba" className="w-full h-full object-contain" />
                  )
                ) : (
                  <div className="text-center text-amber-300/50 px-6">
                    <Shirt className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-sm">Tu prueba aparecerá aquí</p>
                  </div>
                )}
              </div>

              {selectedProduct && (
                <p className="text-xs text-amber-300/70 text-center">
                  Prenda: <span className="text-amber-200">{selectedProduct.name}</span>
                </p>
              )}

              <Button
                onClick={handleTryOn}
                disabled={!canTryOn}
                className="gold-shine w-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generando...</>
                ) : (
                  <><Sparkles className="mr-2 h-4 w-4" /> Probar prenda</>
                )}
              </Button>

              {!canTryOn && !isLoading && (
                <p className="text-xs text-amber-300/40 text-center">
                  {!modelFile ? "Sube tu foto" : !selectedId ? "Elige una prenda" : ""}
                </p>
              )}

              {resultImage && !isLoading && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-600 text-amber-300 hover:bg-amber-900/30"
                  onClick={() => window.open(resultImage, "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" /> Abrir / Descargar
                </Button>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VirtualTryOnPage;
