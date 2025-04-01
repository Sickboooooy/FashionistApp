import NodeCache from 'node-cache';
import crypto from 'crypto';

/**
 * Servicio de caché para resultados de operaciones intensivas
 */
class CacheService {
  private cache: NodeCache;
  
  /**
   * Constructor del servicio de caché
   * @param ttlSeconds Tiempo de vida en segundos para las entradas de caché
   */
  constructor(ttlSeconds = 3600) { // 1 hora por defecto
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: ttlSeconds * 0.2, // 20% del ttl para chequeo de caducidad
      useClones: false // Para mejorar rendimiento, no clonar objetos
    });
  }
  
  /**
   * Obtener valor de la caché
   */
  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }
  
  /**
   * Guardar valor en la caché
   */
  set<T>(key: string, value: T): boolean {
    return this.cache.set<T>(key, value);
  }
  
  /**
   * Eliminar valor de la caché
   */
  delete(key: string): number {
    return this.cache.del(key);
  }
  
  /**
   * Generar clave de caché para análisis de imágenes basada en hash MD5
   */
  getImageAnalysisKey(imageBuffer: Buffer): string {
    // Usar MD5 hash para la imagen como clave
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    return `img_analysis_${hash}`;
  }
  
  /**
   * Generar clave de caché para generación de outfits
   */
  getOutfitsKey(params: { 
    imageHash?: string;
    textPrompt?: string;
    preferenceHash?: string;
    season?: string;
    occasion?: string;
  }): string {
    // Ordenamos los parámetros para asegurar consistencia en las claves
    const sortedParams = {
      imageHash: params.imageHash || '',
      textPrompt: params.textPrompt || '',
      preferenceHash: params.preferenceHash || '',
      season: params.season || '',
      occasion: params.occasion || ''
    };
    
    // Convertir a string y hashear
    const paramsStr = JSON.stringify(sortedParams);
    const hash = crypto.createHash('md5').update(paramsStr).digest('hex');
    
    return `outfits_gen_${hash}`;
  }
  
  /**
   * Generar clave de caché para generación de revista
   */
  getMagazineKey(params: {
    outfitsHash: string;
    template: string;
    preferenceHash?: string;
    userName?: string;
  }): string {
    // Ordenamos los parámetros
    const sortedParams = {
      outfitsHash: params.outfitsHash,
      template: params.template,
      preferenceHash: params.preferenceHash || '',
      userName: params.userName || ''
    };
    
    // Convertir a string y hashear
    const paramsStr = JSON.stringify(sortedParams);
    const hash = crypto.createHash('md5').update(paramsStr).digest('hex');
    
    return `magazine_gen_${hash}`;
  }
  
  /**
   * Limpiar toda la caché
   */
  flush(): void {
    this.cache.flushAll();
  }
}

// Exportar una instancia singleton del servicio
export const cacheService = new CacheService();