/**
 * Fuente única de las plantillas de Revista.
 * Los ids son internos (datos guardados y API) y no cambian.
 * Los nombres visibles no usan marcas de revistas reales.
 */
export const MAGAZINE_TEMPLATE_IDS = ['vogue', 'elle', 'bazaar', 'vanity', 'anna'] as const;

export type MagazineTemplateId = (typeof MAGAZINE_TEMPLATE_IDS)[number];

export interface MagazineTemplateInfo {
  id: MagazineTemplateId;
  nombre: string;
  descripcion: string;
  /** Descripción del estilo visual, pensada para los prompts de IA. */
  estilo: string;
  isPremium: boolean;
}

export const MAGAZINE_TEMPLATES: Readonly<Record<MagazineTemplateId, MagazineTemplateInfo>> = {
  vogue: {
    id: 'vogue',
    nombre: 'Clásica',
    descripcion: 'Diseño clásico con una imagen principal y espacio editorial minimalista.',
    estilo: 'editorial clásico de alta moda: crema y negro, serif de alto contraste y una imagen protagonista',
    isPremium: false,
  },
  elle: {
    id: 'elle',
    nombre: 'Moderna',
    descripcion: 'Diseño moderno con página dividida para mostrar varios conjuntos.',
    estilo: 'editorial moderno y juvenil: rosa y coral, tipografía sans gruesa y una cuadrícula de looks',
    isPremium: false,
  },
  bazaar: {
    id: 'bazaar',
    nombre: 'Galería',
    descripcion: 'Presentación en galería con espacio para los detalles de cada prenda.',
    estilo: 'galería de alta costura: blanco y negro con dorado, serif itálica y una tira de fotografías con pies de foto',
    isPremium: true,
  },
  vanity: {
    id: 'vanity',
    nombre: 'Editorial',
    descripcion: 'Diseño sofisticado con enfoque en contenido editorial extenso.',
    estilo: 'revista de moda y cultura: marfil y sepia, serif clásica y texto largo a dos columnas',
    isPremium: true,
  },
  anna: {
    id: 'anna',
    nombre: 'Anna Signature',
    descripcion: 'Exclusivo diseño premium con detalles dorados y presentación de lujo.',
    estilo: 'lujo de la marca Anna Signature: negro y oro, marcos dorados y presentación exclusiva',
    isPremium: true,
  },
};

export const DEFAULT_MAGAZINE_TEMPLATE: MagazineTemplateId = 'vogue';

export function isMagazineTemplateId(value: string): value is MagazineTemplateId {
  return (MAGAZINE_TEMPLATE_IDS as readonly string[]).includes(value);
}

/** Devuelve la plantilla del id, o Clásica si el id no es conocido. */
export function getMagazineTemplate(id: string): MagazineTemplateInfo {
  return MAGAZINE_TEMPLATES[isMagazineTemplateId(id) ? id : DEFAULT_MAGAZINE_TEMPLATE];
}
