'use strict';

import { estadoFiltros } from '../state.js';
import { refs } from '../dom.js';
import { UI } from './ui.js';

// ==================== MÓDULO: FILTROS ====================

export const Filtros = {
    /** Re-renderiza solo el historial con los filtros actuales */
    aplicar() {
        UI.renderizarHistorial();
    },

    /** Restablece todos los filtros y sincroniza la UI */
    limpiar() {
        estadoFiltros.periodo    = 'todo';
        estadoFiltros.fechaDesde = '';
        estadoFiltros.fechaHasta = '';
        estadoFiltros.producto   = '';
        estadoFiltros.franja     = 'todas';

        refs.btnsFiltrosPeriodo.forEach(btn => {
            const activo = btn.dataset.periodo === 'todo';
            btn.classList.toggle('activo', activo);
            btn.setAttribute('aria-pressed', String(activo));
        });

        refs.filtrosRango.hidden        = true;
        refs.filtroFechaDesde.value     = '';
        refs.filtroFechaHasta.value     = '';
        refs.filtroProducto.value       = '';
        refs.filtroFranja.value         = 'todas';

        Filtros.aplicar();
    },

    /** Cambia el período activo, actualiza botones y muestra/oculta el rango */
    setPeriodo(periodo) {
        estadoFiltros.periodo = periodo;

        refs.btnsFiltrosPeriodo.forEach(btn => {
            const activo = btn.dataset.periodo === periodo;
            btn.classList.toggle('activo', activo);
            btn.setAttribute('aria-pressed', String(activo));
        });

        refs.filtrosRango.hidden = periodo !== 'rango';

        // Limpiar fechas cuando se cambia a un período que no las usa
        if (periodo !== 'rango') {
            estadoFiltros.fechaDesde    = '';
            estadoFiltros.fechaHasta    = '';
            refs.filtroFechaDesde.value = '';
            refs.filtroFechaHasta.value = '';
        }

        Filtros.aplicar();
    }
};