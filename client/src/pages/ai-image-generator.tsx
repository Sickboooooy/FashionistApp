import React from "react";
import AIImageGenerator from "../components/ai-image-generator";

const AIImageGeneratorPage: React.FC = () => {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold text-center mb-10 text-amber-500">
        Generador de Imágenes de Moda con IA
      </h1>
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