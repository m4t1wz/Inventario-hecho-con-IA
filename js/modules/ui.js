'use strict';

import { estado, estadoFiltros } from '../state.js';
import { refs } from '../dom.js';
import { STOCK_UMBRAL_BAJO } from '../config.js';
import { Temporal } from './temporal.js';
import { Historial } from './historial.js';
import { Productos } from './productos.js';

// ==================== MÓDULO: UTILIDADES VISUALES ====================

// Instancia única del formateador de moneda
const _fmtPrecio = new Intl.NumberFormat('es-AR', {
    style:    'currency',
    currency: 'ARS'
});

export function formatearPrecio(precio) {
    return _fmtPrecio.format(precio);
}

function clasificarStock(stock) {
    if (stock === 0)                return 'badge-stock--cero';
    if (stock <= STOCK_UMBRAL_BAJO) return 'badge-stock--bajo';
    return                                 'badge-stock--ok';
}

function clasificarStockRestante(stock) {
    if (stock === 0)                return 'venta-stock-restante--cero';
    if (stock <= STOCK_UMBRAL_BAJO) return 'venta-stock-restante--bajo';
    return                                 'venta-stock-restante--ok';
}

function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ==================== MÓDULO: RENDERIZADO (UI) ====================

export const UI = {
    /** Punto de entrada único: actualiza toda la interfaz */
    actualizar() {
        UI.renderizarTabla();
        UI.renderizarHistorial();
        UI.actualizarEstadisticas();
    },

    renderizarTabla() {
        const filtrados = Productos.filtrar(refs.buscador.value);
        refs.tablaBody.innerHTML = '';

        if (filtrados.length === 0) {
            const msg = refs.buscador.value.trim()
                ? 'No se encontraron productos para esa búsqueda.'
                : 'Todavía no hay productos registrados.';

            refs.tablaBody.innerHTML = `
                <tr>
                    <td colspan="4" class="tabla-vacia">
                        <span class="tabla-vacia__icono" aria-hidden="true">📦</span>
                        ${msg}
                    </td>
                </tr>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        filtrados.forEach(producto => {
            const fila         = document.createElement('tr');
            const claseStock   = clasificarStock(producto.stock);
            const sinStock     = producto.stock === 0;
            const nombreSeguro = escaparHTML(producto.nombre);

            if (sinStock) fila.classList.add('stock-agotado');

            fila.innerHTML = `
                <td>${nombreSeguro}</td>
                <td>${formatearPrecio(producto.precio)}</td>
                <td>
                    <span
                        class="badge-stock ${claseStock}"
                        aria-label="Stock: ${producto.stock}"
                    >${producto.stock}</span>
                </td>
                <td>
                    <button
                        class="btn-accion vender"
                        data-id="${producto.id}"
                        aria-label="Vender ${nombreSeguro}"
                        ${sinStock ? 'disabled aria-disabled="true"' : ''}
                    >Vender</button>
                    <button
                        class="btn-accion editar"
                        data-id="${producto.id}"
                        aria-label="Editar ${nombreSeguro}"
                    >Editar</button>
                    <button
                        class="btn-accion eliminar"
                        data-id="${producto.id}"
                        aria-label="Eliminar ${nombreSeguro}"
                    >Eliminar</button>
                </td>
            `;

            fragment.appendChild(fila);
        });

        refs.tablaBody.appendChild(fragment);
    },

    renderizarHistorial() {
        const ventas = Historial.filtrar();
        refs.historialBody.innerHTML = '';

        UI._renderizarResumenHistorial(ventas);

        if (ventas.length === 0) {
            const esFiltrando =
                estadoFiltros.periodo !== 'todo'  ||
                estadoFiltros.franja  !== 'todas' ||
                estadoFiltros.producto.trim()     ||
                estadoFiltros.fechaDesde          ||
                estadoFiltros.fechaHasta;

            const [icono, titulo, desc] = esFiltrando
                ? ['🔍', 'Sin resultados',
                   'No hay ventas que coincidan con los filtros aplicados.']
                : ['📋', 'Sin ventas registradas',
                   'Las ventas aparecerán aquí una vez que confirmes la primera operación.'];

            refs.historialBody.innerHTML = `
                <tr>
                    <td colspan="8" class="historial-vacio">
                        <span class="historial-vacio__icono" aria-hidden="true">${icono}</span>
                        <p class="historial-vacio__titulo">${titulo}</p>
                        <p class="historial-vacio__desc">${desc}</p>
                    </td>
                </tr>
            `;
            return;
        }

        const fragment = document.createDocumentFragment();

        // Más recientes primero; usamos spread para no mutar el array original
        [...ventas].reverse().forEach(venta => {
            const fila         = document.createElement('tr');
            const claseStock   = clasificarStockRestante(venta.stockRestante);
            const nombreSeguro = escaparHTML(venta.productName);
            // El formato visual se deriva aquí del timestamp UTC — nunca en persistencia
            const fechaLeg     = Temporal.formatearFechaVenta(venta.timestamp);
            const horaLeg      = Temporal.formatearHoraVenta(venta.timestamp);

            fila.innerHTML = `
                <td><span class="venta-id">${escaparHTML(venta.saleId)}</span></td>
                <td>${fechaLeg}</td>
                <td>${horaLeg}</td>
                <td class="celda-producto">${nombreSeguro}</td>
                <td>${venta.quantity}</td>
                <td>${formatearPrecio(venta.unitPrice)}</td>
                <td><span class="venta-subtotal">${formatearPrecio(venta.subtotal)}</span></td>
                <td>
                    <span
                        class="venta-stock-restante ${claseStock}"
                        aria-label="Stock restante: ${venta.stockRestante}"
                    >${venta.stockRestante}</span>
                </td>
            `;

            fragment.appendChild(fila);
        });

        refs.historialBody.appendChild(fragment);
    },

    _renderizarResumenHistorial(ventas) {
        const cantVentas    = ventas.length;
        const totalUnidades = Historial.calcularTotalUnidades(ventas);
        const totalFact     = Historial.calcularTotalFacturado(ventas);

        refs.historialResumen.innerHTML = `
            <span class="resumen-stat">
                <span class="resumen-stat__valor">${cantVentas}</span>
                ${cantVentas === 1 ? 'transacción' : 'transacciones'}
            </span>
            <span class="resumen-separador" aria-hidden="true"></span>
            <span class="resumen-stat">
                <span class="resumen-stat__valor">${totalUnidades}</span>
                ${totalUnidades === 1 ? 'unidad vendida' : 'unidades vendidas'}
            </span>
            <span class="resumen-separador" aria-hidden="true"></span>
            <span class="resumen-stat">
                Facturado:&nbsp;
                <span class="resumen-stat__valor resumen-stat__valor--facturado">
                    ${formatearPrecio(totalFact)}
                </span>
            </span>
        `;
    },

    actualizarEstadisticas() {
        const stockTotal     = estado.productos.reduce((s, p) => s + p.stock, 0);
        const totalUnidades  = Historial.calcularTotalUnidades(estado.historialVentas);
        const totalFacturado = Historial.calcularTotalFacturado(estado.historialVentas);

        refs.totalProductos.textContent = estado.productos.length;
        refs.stockTotal.textContent     = stockTotal;
        refs.ventasTotales.textContent  = totalUnidades;
        refs.totalFacturado.textContent = formatearPrecio(totalFacturado);
    }
};