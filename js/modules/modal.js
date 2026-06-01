'use strict';

import { uiState } from '../state.js';
import { refs } from '../dom.js';
import { Validacion } from './validation.js';
import { Productos } from './productos.js';

// ==================== MÓDULO: MODALES ====================

export const Modal = {
    abrir(dialogEl) {
        uiState.focusPrevioAlModal = document.activeElement;
        dialogEl.showModal();

        const primerInteractivo = dialogEl.querySelector(
            'input:not([type="hidden"]), button:not(.btn-cerrar-modal)'
        );
        if (primerInteractivo) primerInteractivo.focus();
    },

    cerrar(dialogEl) {
        const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (reducido) {
            dialogEl.close();
            return;
        }

        dialogEl.classList.add('modal--cerrando');
        dialogEl.addEventListener('animationend', () => {
            dialogEl.classList.remove('modal--cerrando');
            dialogEl.close();
        }, { once: true });
    },

    // ---------- Apertura de modales específicos ----------

    abrirEditar(id) {
        const producto = Productos.porId(id);
        if (!producto) return;

        refs.editarId.value     = producto.id;
        refs.editarNombre.value = producto.nombre;
        refs.editarPrecio.value = producto.precio;
        refs.editarStock.value  = producto.stock;

        Validacion.limpiar(
            [refs.editarNombre, 'editar-nombre-error'],
            [refs.editarPrecio, 'editar-precio-error'],
            [refs.editarStock,  'editar-stock-error']
        );

        Modal.abrir(refs.modalEditar);
    },

    abrirVender(id) {
        const producto = Productos.porId(id);
        if (!producto) return;

        refs.venderId.value              = producto.id;
        refs.venderNombre.textContent    = producto.nombre;
        refs.venderStockDisp.textContent = producto.stock;
        refs.venderCantidad.value        = 1;
        refs.venderCantidad.max          = producto.stock;

        Validacion.limpiar(
            [refs.venderCantidad, 'vender-cantidad-error']
        );

        Modal.abrir(refs.modalVender);
    },

    abrirEliminar(id) {
        const producto = Productos.porId(id);
        if (!producto) return;

        uiState.pendienteEliminarId             = id;
        refs.eliminarNombre.textContent = `"${producto.nombre}"`;

        Modal.abrir(refs.modalEliminar);
        refs.btnConfirmarEliminar.focus();
    },

    abrirReiniciar() {
        Modal.abrir(refs.modalReiniciar);
        refs.btnConfirmarReiniciar.focus();
    },

    // ---------- Inicialización de listeners propios ----------

    init() {
        // Restaurar foco y limpiar estado pendiente al cerrar cualquier modal
        document.querySelectorAll('.modal').forEach(dialogEl => {
            dialogEl.addEventListener('close', () => {
                if (uiState.focusPrevioAlModal) {
                    uiState.focusPrevioAlModal.focus();
                    uiState.focusPrevioAlModal = null;
                }
                if (dialogEl === refs.modalEliminar) {
                    uiState.pendienteEliminarId = null;
                }
            });
        });

        // Cerrar modal al hacer clic en el backdrop (área fuera del contenido)
        document.querySelectorAll('.modal').forEach(dialogEl => {
            dialogEl.addEventListener('click', e => {
                if (e.target === dialogEl) Modal.cerrar(dialogEl);
            });
        });
    }
};