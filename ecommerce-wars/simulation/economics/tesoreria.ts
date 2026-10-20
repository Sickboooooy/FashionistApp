import type { Centavos } from '../../shared/money.ts';
import type { Obligacion } from '../../shared/schemas/eventos.ts';
import type { EstadoEmpresa } from '../market/estado.ts';

/*
 * Operaciones de caja del motor. Actúan sobre la copia de trabajo del periodo
 * (ver simulation/market/contexto.ts); nunca sobre el estado recibido.
 */

/** Saldo utilizable para gasto discrecional: nunca invade la reserva obligatoria. */
export function disponible(emp: EstadoEmpresa, reserva: Centavos): Centavos {
  if (emp.pasivo > 0) return 0;
  return Math.max(0, emp.caja - reserva);
}

export function puedeGastar(emp: EstadoEmpresa, monto: Centavos, reserva: Centavos): boolean {
  return Number.isSafeInteger(monto) && monto >= 0 && monto <= disponible(emp, reserva);
}

/** Gasto discrecional (inventario, campañas, fichas). Lanza si excede el saldo disponible. */
export function gastar(emp: EstadoEmpresa, monto: Centavos, reserva: Centavos): void {
  if (!puedeGastar(emp, monto, reserva)) {
    throw new RangeError(`${emp.empresa}: gasto de ${monto} excede el disponible ${disponible(emp, reserva)}`);
  }
  emp.caja -= monto;
}

/**
 * Pago obligatorio (operación, envíos, reembolsos). Se paga hasta donde alcance la
 * caja; el resto queda como pasivo. La caja nunca queda negativa.
 */
export function cargarObligacion(emp: EstadoEmpresa, monto: Centavos): Obligacion {
  const pagado = Math.min(Math.max(emp.caja, 0), monto);
  emp.caja -= pagado;
  const pendiente = monto - pagado;
  emp.pasivo += pendiente;
  return { monto, pagado, pendiente };
}

/** Ingreso de caja. Si hay pasivo, se liquida primero. Devuelve el pasivo liquidado. */
export function abonar(emp: EstadoEmpresa, monto: Centavos): Centavos {
  emp.caja += monto;
  if (emp.pasivo === 0) return 0;
  const pago = Math.min(emp.pasivo, emp.caja);
  emp.caja -= pago;
  emp.pasivo -= pago;
  return pago;
}
