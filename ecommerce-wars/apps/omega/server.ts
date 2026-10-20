import { iniciarTienda } from '../shared/tienda-servidor.ts';

const puerto = Number(process.env.EW_PUERTO ?? 4102);
iniciarTienda({ empresa: 'omega', puerto, dirPublico: new URL('./public/', import.meta.url) });
process.stdout.write(`Tienda OMEGA en http://127.0.0.1:${puerto}\n`);
