# Bloqueos técnicos y limitaciones conocidas

Conforme a la instrucción final de la especificación ("si existe un bloqueo técnico,
documentarlo"), estas son las limitaciones verificadas del sistema.

## 1. `fsync` deshabilitado bajo el modelo de permisos
Con `node --permission`, Node 24 deshabilita `fs.fsync` (lanza `ERR_ACCESS_DENIED`). El diario
intenta `fsync` y, si el runtime lo prohíbe, continúa: la línea ya fue entregada al kernel por
`writeSync`, así que sobrevive a la caída del proceso, pero no a una caída del sistema operativo
o un corte de energía. Ejecutando `npm run torneo` (harness sin restricciones) sí se hace `fsync`.
Detectado al probar el War Room: antes de corregirlo, el contador en memoria podía desfasarse
del archivo (ver `harness/event-bus/diario.ts`, función `sincronizar`).

## 2. Reanudación tras interrupción
El harness retoma una ronda interrumpida **entre días** (reproduce los días ya sellados y
verifica que coincidan antes de continuar; probado en `tests/integration/reanudacion-y-procesos.test.ts`)
y completa juicio/aprendizaje pendientes. **No** retoma si la interrupción ocurrió:
- durante la fase de decisión (antes de escribir `planes.json`), ni
- durante el cierre (entre `cierre_periodo` y el manifiesto).
En esos casos se niega a continuar con un mensaje explícito, porque el diario es append-only
y no se puede "deshacer" un tramo. Solución operativa: iniciar una corrida nueva.

## 3. Aislamiento de red de los agentes: completo en macOS, no en Linux
El modelo de permisos de Node 24 limita sistema de archivos, procesos hijos y workers, pero
no sockets. La revisión de seguridad confirmó que, sin más, un agente de ALFA podía consultar
por HTTP la tienda de OMEGA en `127.0.0.1`. Corrección: en macOS cada proceso de agente y del
Juez se lanza dentro de `sandbox-exec` con un perfil que niega toda red (`deny network*`);
probado en `tests/adversarial/endurecimiento.test.ts`. En Linux no hay equivalente sin
privilegios en este código: los procesos corren sin red bloqueada (el resultado lo indica
`redBloqueada: false`). Para un torneo de alto riesgo en Linux, ejecutar dentro de un
contenedor o espacio de nombres de red sin conectividad. Defensa adicional en ambos casos:
el feed público de cada tienda no expone compras a proveedores ni montos, el seguimiento no
expone clientes, la sentencia pública está redactada (sólo ventas netas y pedidos válidos),
el War Room exige token para la vista privilegiada y valida la cabecera `Host`.

## 4. Agentes deterministas, no LLM
Los agentes son políticas programáticas con aprendizaje entre rondas. Motivos: la regla 8
exige determinismo con semilla fija y la regla 10 prohíbe contratar servicios de pago (una
API de LLM lo es). El contrato `EquipoEmpresa` permite enchufar otra implementación por
empresa; si fuera un LLM, la verificación del Juez seguiría funcionando (reejecuta con los
planes registrados), pero `npm run reproducibilidad` dejaría de dar historias idénticas.

## 5. Mismo usuario del sistema operativo
`--permission` aísla a los procesos que se lanzan con él. El lanzador, el CLI y cualquier
proceso externo del mismo usuario no están restringidos: un humano (o malware) con acceso a la
cuenta puede editar archivos. Eso no pasa inadvertido: el Juez y `npm run verificar` detectan
cualquier alteración de evidencia, sentencias o reglas (probado en `tests/adversarial/evidencia.test.ts`).

## 6. Cobertura de pruebas en procesos hijos
`node --test --experimental-test-coverage` mide el proceso principal. El código que corre sólo
dentro de procesos aislados (`harness/permissions/protocolo.ts`, partes de `sandbox.ts`) aparece
con cobertura baja aunque las pruebas adversariales lo ejercitan. Cobertura global: 95 % de líneas.

## 7. API experimental de Node
El War Room sirve `proyeccion.ts` al navegador con `module.stripTypeScriptTypes`, marcada como
experimental en Node 24 (emite una advertencia, silenciada con `NODE_NO_WARNINGS`).

## 8. Pedidos de demostración
Los pedidos hechos desde las tiendas son demostraciones: no mueven inventario ni se
contabilizan (regla 6) y su seguimiento avanza con el reloj real sólo como ilustración. El
seguimiento de pedidos sintéticos sí usa los eventos sellados y el tiempo simulado.

## 9. La cadena de hashes no está anclada externamente
Los hashes detectan cualquier edición parcial o inconsistente, pero quien tenga escritura
sobre `reports/` (el operador o el proceso del harness, nunca los agentes) podría regenerar
diario, manifiestos y sentencias de forma coherente. Para anclar el registro, conservar fuera
del equipo los hashes que imprime `npm run torneo` al cerrar cada ronda (o firmarlos, p. ej.
en un tag de git firmado). Con `--modo oficial`, además, el Juez exige semilla sellada,
procesos aislados, autorización humana y que el código no haya cambiado desde el preflight.

## 10. Hallazgo experimental (no es un bloqueo)
Con la calibración vigente las dos estrategias son competitivas y la condición de victoria
(doble de ventas netas en un periodo) se cumple rara vez en 12 rondas (1 de 10 semillas).
Cambiarlo es una decisión de reglas (multiplicador, número de rondas) que requiere
autorización humana y un nuevo sellado.
