'use strict';

import { refs } from './dom.js';
import { uiState, estadoFiltros } from './state.js';
import { Storage } from './modules/storage.js';
import { Validacion } from './modules/validation.js';
import { Toast } from './modules/toast.js';
import { Modal } from './modules/modal.js';
import { Productos } from './modules/productos.js';
import { Filtros } from './modules/filtros.js';
import { UI } from './modules/ui.js';

// ==================== MANEJADORES DE EVENTOS ====================

// --- Agregar producto ---
refs.formProducto.addEventListener('submit', e => {
    e.preventDefault();

    const { reglas, campo } = Validacion;

    const validos = [
        campo(refs.inputNombre, 'nombre-error', [reglas.requerido]),
        campo(refs.inputPrecio, 'precio-error', [reglas.requerido, reglas.precioPositivo]),
        campo(refs.inputStock,  'stock-error',  [reglas.requerido, reglas.stockNoNegativo])
    ];

    if (validos.includes(false)) return;

    const nombre = refs.inputNombre.value.trim();
    const precio = parseFloat(refs.inputPrecio.value);
    const stock  = parseInt(refs.inputStock.value, 10);

    Productos.agregar(nombre, precio, stock);
    refs.formProducto.reset();

    Validacion.limpiar(
        [refs.inputNombre, 'nombre-error'],
        [refs.inputPrecio, 'precio-error'],
        [refs.inputStock,  'stock-error']
    );

    UI.actualizar();
    Toast.mostrar(`"${nombre}" agregado correctamente.`, 'success');
});

// --- Editar producto ---
refs.formEditar.addEventListener('submit', e => {
    e.preventDefault();

    const { reglas, campo } = Validacion;

    const validos = [
        campo(refs.editarNombre, 'editar-nombre-error', [reglas.requerido]),
        campo(refs.editarPrecio, 'editar-precio-error', [reglas.requerido, reglas.precioPositivo]),
        campo(refs.editarStock,  'editar-stock-error',  [reglas.requerido, reglas.stockNoNegativo])
    ];

    if (validos.includes(false)) return;

    const id     = parseInt(refs.editarId.value, 10);
    const nombre = refs.editarNombre.value.trim();
    const precio = parseFloat(refs.editarPrecio.value);
    const stock  = parseInt(refs.editarStock.value, 10);

    if (Productos.editar(id, nombre, precio, stock)) {
        Modal.cerrar(refs.modalEditar);
        UI.actualizar();
        Toast.mostrar(`"${nombre}" actualizado correctamente.`, 'success');
    }
});

// --- Vender producto ---
refs.formVender.addEventListener('submit', e => {
    e.preventDefault();

    const { reglas, campo } = Validacion;

    const validCantidad = campo(
        refs.venderCantidad,
        'vender-cantidad-error',
        [reglas.requerido, reglas.cantidadPositiva]
    );
    if (!validCantidad) return;

    const id       = parseInt(refs.venderId.value, 10);
    const cantidad = parseInt(refs.venderCantidad.value, 10);
    const producto = Productos.porId(id);

    if (!producto) return;

    // Validar contra el stock real al momento de confirmar
    if (cantidad > producto.stock) {
        refs.venderCantidad.setAttribute('aria-invalid', 'true');
        document.getElementById('vender-cantidad-error').textContent =
            `Solo hay ${producto.stock} unidad(es) disponible(s).`;
        return;
    }

    const nombre = producto.nombre;

    if (Productos.vender(id, cantidad)) {
        Modal.cerrar(refs.modalVender);
        UI.actualizar();
        Toast.mostrar(`Venta realizada: ${cantidad} × "${nombre}".`, 'success');
    }
});

// --- Confirmar eliminación ---
refs.btnConfirmarEliminar.addEventListener('click', () => {
    if (uiState.pendienteEliminarId === null) return;

    const producto = Productos.porId(uiState.pendienteEliminarId);
    const nombre   = producto?.nombre ?? '';
    const id       = uiState.pendienteEliminarId;

    // Limpiar antes de cerrar para que el listener 'close' no lo resetee dos veces
    uiState.pendienteEliminarId = null;

    if (Productos.eliminar(id)) {
        Modal.cerrar(refs.modalEliminar);
        UI.actualizar();
        Toast.mostrar(`"${nombre}" eliminado.`, 'warning');
    }
});

// --- Confirmar reinicio del sistema ---
refs.btnConfirmarReiniciar.addEventListener('click', () => {
    Productos.reiniciar();
    Modal.cerrar(refs.modalReiniciar);
    Filtros.limpiar();
    UI.actualizar();
    Toast.mostrar('Sistema reiniciado completamente.', 'warning');
});

// --- Botón "Borrar datos actuales" ---
refs.btnLimpiar.addEventListener('click', () => {
    Modal.abrirReiniciar();
});

// --- Delegación de eventos en la tabla de productos ---
refs.tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('.btn-accion');
    if (!boton) return;

    const id = parseInt(boton.dataset.id, 10);

    if (boton.classList.contains('vender'))   Modal.abrirVender(id);
    if (boton.classList.contains('editar'))   Modal.abrirEditar(id);
    if (boton.classList.contains('eliminar')) Modal.abrirEliminar(id);
});

// --- Buscador de productos en tiempo real ---
refs.buscador.addEventListener('input', () => {
    UI.renderizarTabla();
});

// --- Botones de cierre y cancelación de modales (via data-modal) ---
document.addEventListener('click', e => {
    const boton = e.target.closest('[data-modal]');
    if (!boton) return;

    const dialogEl = document.getElementById(boton.dataset.modal);
    if (dialogEl) Modal.cerrar(dialogEl);
});

// --- Toggle del historial ---
refs.btnToggle.addEventListener('click', () => {
    const expandido   = refs.btnToggle.getAttribute('aria-expanded') === 'true';
    const nuevoEstado = !expandido;

    refs.btnToggle.setAttribute('aria-expanded', String(nuevoEstado));
    refs.btnToggle.querySelector('.toggle-texto').textContent =
        nuevoEstado ? 'Ocultar' : 'Mostrar';

    refs.historialContenido.classList.toggle('colapsado', !nuevoEstado);
});

// --- Botones de período ---
refs.btnsFiltrosPeriodo.forEach(btn => {
    btn.addEventListener('click', () => Filtros.setPeriodo(btn.dataset.periodo));
});

// --- Rango de fechas personalizado ---
refs.filtroFechaDesde.addEventListener('change', () => {
    estadoFiltros.fechaDesde = refs.filtroFechaDesde.value;
    Filtros.aplicar();
});

refs.filtroFechaHasta.addEventListener('change', () => {
    estadoFiltros.fechaHasta = refs.filtroFechaHasta.value;
    Filtros.aplicar();
});

// --- Filtro por nombre de producto en tiempo real ---
refs.filtroProducto.addEventListener('input', () => {
    estadoFiltros.producto = refs.filtroProducto.value;
    Filtros.aplicar();
});

// --- Filtro por franja horaria ---
refs.filtroFranja.addEventListener('change', () => {
    estadoFiltros.franja = refs.filtroFranja.value;
    Filtros.aplicar();
});

// --- Limpiar todos los filtros ---
refs.btnLimpiarFiltros.addEventListener('click', () => {
    Filtros.limpiar();
});

// ==================== INICIALIZACIÓN ====================

function inicializar() {
    // ── Arreglo del grid-trick de colapso ──────────────────────────────────
    // El CSS aplica `grid-template-rows: 1fr → 0fr` sobre historialContenido.
    // Este truco requiere UN solo hijo directo para colapsar todos los children.
    // En lugar de cambiar el HTML ya entregado, envolvemos aquí los hijos existentes.
    const inner = document.createElement('div');
    inner.className = 'historial-contenido-inner';
    while (refs.historialContenido.firstChild) {
        inner.appendChild(refs.historialContenido.firstChild);
    }
    refs.historialContenido.appendChild(inner);
    // ───────────────────────────────────────────────────────────────────────

    Modal.init();
    Storage.cargar();
    UI.actualizar();
}

inicializar();