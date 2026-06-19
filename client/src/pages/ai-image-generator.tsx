import React from "react";
import AIImageGenerator from "../components/ai-image-generator";

const AIImageGeneratorPage: React.FC = () => {
  return (
    <div className="container mx-auto py-10">
      <div className="text-center mb-10">
        <p className="text-amber-400/80 text-xs uppercase tracking-[0.3em] mb-3">
          Anna &middot; AI Studio
        </p>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-amber-300 via-amber-400 to-amber-600 bg-clip-text text-transparent leading-tight">
          Generador de Imágenes de Moda con IA
        </h1>
      </div>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 text-center text-amber-200">
          <p className="mb-4">
            Crea diseños de moda increíbles con Inteligencia Artificial. 
            Simplemente describe lo que deseas ver y nuestro generador creará una imagen para ti.
          </p>
          <p className="text-amber-300 italic">
            Utiliza descripciones detalladas para mejores resultados. Por ejemplo: "Vestido rojo elegante con cuello halter para evento de gala" 
            o "Chaqueta de cuero negro estilo motociclista con detalles dorados".
          </p>
        </div>
        <AIImageGenerator />
      </div>
    </div>
  );
};

export default AIImageGeneratorPage;