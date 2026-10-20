import { iniciarTienda } from '../shared/tienda-servidor.ts';

const puerto = Number(process.env.EW_PUERTO ?? 4101);
iniciarTienda({ empresa: 'alfa', puerto, dirPublico: new URL('./public/', import.meta.url) });
process.stdout.write(`Tienda ALFA en http://127.0.0.1:${puerto}\n`);
