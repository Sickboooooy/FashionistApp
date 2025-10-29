import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Configuración para desarrollo
const DATABASE_URL = process.env.DATABASE_URL;

// Crear una base de datos mock para desarrollo
const createMockDB = () => {
  console.log("🔧 Ejecutando en modo DEMO sin base de datos");
  return {
    select: () => ({ 
      from: () => ({ 
        where: () => ({ limit: () => Promise.resolve([]) }),
        limit: () => Promise.resolve([]),
        orderBy: () => ({ limit: () => Promise.resolve([]) })
      }) 
    }),
    insert: () => ({ 
      values: () => ({ 
        returning: () => Promise.resolve([{ id: Date.now(), createdAt: new Date() }]) 
      }) 
    }),
    update: () => ({ 
      set: () => ({ 
        where: () => ({ 
          returning: () => Promise.resolve([{ id: Date.now(), updatedAt: new Date() }]) 
        }) 
      }) 
    }),
    delete: () => ({ 
      where: () => Promise.resolve([]) 
    })
  };
};

let pool: Pool | null = null;
let db: any;

if (!DATABASE_URL) {
  console.log("⚠️ DATABASE_URL no configurada. Usando modo demo.");
  db = createMockDB();
} else {
  try {
    pool = new Pool({ connectionString: DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log("✅ Base de datos conectada");
  } catch (error) {
    console.warn("⚠️ Error conectando a la base de datos. Usando modo demo.");
    db = createMockDB();
  }
}

export { pool, db };
