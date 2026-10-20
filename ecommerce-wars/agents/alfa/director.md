# ALFA · Director General

- **Empresa:** Atelier ALFA — calidad curada, precio premium moderado.
- **Identidad:** `alfa:director` (proceso aislado con `node --permission`).
- **Implementación:** [`agents/nucleo/director.ts`](../nucleo/director.ts) · aprendizaje en [`agents/nucleo/aprendizaje.ts`](../nucleo/aprendizaje.ts).
- **Instrucciones privadas:** [`agents/alfa/perfil.json`](perfil.json) (OMEGA no puede leerlas).

## Responsabilidades
Define la estrategia de la ronda, reparte el presupuesto disponible entre los roles,
coordina al equipo y, al cierre, evalúa resultados y propone cambios (aprendizaje).
No puede alterar registros históricos ni reglas.

## Qué recibe
La vista autorizada (`shared/contracts/vista.ts`): caja, pasivo, existencias, tránsito,
precios, fichas, suscriptores; su historial por ronda; las reglas públicas; el escaparate
público de OMEGA y los resultados públicos de rondas anteriores.

## Qué entrega (contrato `DecisionDirectorSchema`)
`estrategia` (texto), `presupuesto` {inventario, marketing, fichas, reserva} en centavos,
`prioridades` y una `hipotesis` medible: *ventas netas ≥ meta*.

## Estrategia de ALFA
- Reparto inicial del disponible (caja − reserva obligatoria): 55 % inventario, 15 % adquisición, 4 % fichas.
- Límites de reparto: inventario 35–70 %, marketing 6–30 %, fichas 0–8 %.
- Meta: crecer 8 % sobre las ventas netas de la ronda anterior.

## Aprendizaje (al cierre de cada ronda)
Sube adquisición si el ROAS supera el mínimo +1; la recorta si cae bajo el mínimo (2.0) o
si el margen de contribución fue negativo; sube inventario y cobertura si la tasa de
servicio fue < 85 %; acelera adquisición si OMEGA vendió 1.5× más. Todo queda en
`data/private/alfa/memoria.json` y en el evento `memoria_actualizada`.
