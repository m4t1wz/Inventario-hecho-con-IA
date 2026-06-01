'use strict';

// ==================== ESTADO GLOBAL ====================

export const estado = {
    productos:       [],
    historialVentas: [],   // append-only: nunca se sobrescriben registros anteriores
    idCounter:       1,    // contador de IDs de productos
    saleIdCounter:   1     // contador de IDs de ventas
};

// ==================== ESTADO DE FILTROS ====================

export const estadoFiltros = {
    periodo:    'todo',    // 'todo' | 'hoy' | 'semana' | 'rango'
    fechaDesde: '',
    fechaHasta: '',
    producto:   '',
    franja:     'todas'   // 'todas' | 'madrugada' | 'manana' | 'tarde' | 'noche'
};

// ==================== ESTADO DE UI COMPARTIDO ====================
// Variables que cruzan más de un módulo (modal ↔ main)

export const uiState = {
    // ID pendiente de confirmación de eliminación
    pendienteEliminarId: null,
    // Elemento que tenía el foco antes de abrir un modal
    focusPrevioAlModal:  null
};