'use strict';

import { estado, estadoFiltros } from '../state.js';
import { Temporal } from './temporal.js';

// ==================== MÓDULO: HISTORIAL ====================

export const Historial = {
    /** Crea un objeto de venta con todos los campos persistibles.
     *  stockRestante se toma DESPUÉS de descontar el stock, ya actualizado. */
    crearRegistro(producto, cantidad, stockRestante) {
        return {
            saleId:       `V-${String(estado.saleIdCounter++).padStart(4, '0')}`,
            timestamp:    Temporal.crearTimestampVenta(),   // UTC ISO 8601 — nunca formato visual
            productId:    producto.id,
            productName:  producto.nombre,
            quantity:     cantidad,
            unitPrice:    producto.precio,
            subtotal:     +(producto.precio * cantidad).toFixed(2),
            stockRestante
        };
    },

    /** Aplica todos los filtros activos y devuelve el array filtrado */
    filtrar() {
        let resultado = [...estado.historialVentas];

        // Filtro de período
        switch (estadoFiltros.periodo) {
            case 'hoy':
                resultado = Temporal.obtenerVentasDelDia(resultado);
                break;
            case 'semana': {
                const lunes = Temporal.obtenerInicioSemanaBAires();
                const hoy   = Temporal.obtenerFechaHoyBAires();
                resultado   = Temporal.obtenerVentasPorRango(resultado, lunes, hoy);
                break;
            }
            case 'rango': {
                const { fechaDesde, fechaHasta } = estadoFiltros;
                if (fechaDesde || fechaHasta) {
                    const desde = fechaDesde || '0000-01-01';
                    const hasta = fechaHasta || '9999-12-31';
                    resultado   = Temporal.obtenerVentasPorRango(resultado, desde, hasta);
                }
                break;
            }
        }

        // Filtro de franja horaria
        if (estadoFiltros.franja !== 'todas') {
            resultado = Temporal.obtenerVentasPorFranja(resultado, estadoFiltros.franja);
        }

        // Filtro por nombre de producto
        if (estadoFiltros.producto.trim()) {
            const termino = estadoFiltros.producto.toLowerCase().trim();
            resultado = resultado.filter(v =>
                v.productName.toLowerCase().includes(termino)
            );
        }

        return resultado;
    },

    /** Suma los subtotales de un array de ventas */
    calcularTotalFacturado(ventas) {
        return ventas.reduce((sum, v) => sum + v.subtotal, 0);
    },

    /** Suma las unidades de un array de ventas */
    calcularTotalUnidades(ventas) {
        return ventas.reduce((sum, v) => sum + v.quantity, 0);
    }
};