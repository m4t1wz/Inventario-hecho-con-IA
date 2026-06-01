'use strict';

import { TOAST_CONFIG } from '../config.js';
import { refs } from '../dom.js';

// ==================== MÓDULO: TOASTS ====================

export const Toast = {
    mostrar(mensaje, tipo = 'success') {
        const icono = TOAST_CONFIG.ICONOS[tipo] ?? TOAST_CONFIG.ICONOS.success;

        const toast = document.createElement('div');
        toast.className = `toast toast--${tipo}`;
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <span class="toast__icono" aria-hidden="true">${icono}</span>
            <span class="toast__mensaje">${mensaje}</span>
        `;

        refs.toastContainer.appendChild(toast);
        setTimeout(() => Toast._cerrar(toast), TOAST_CONFIG.DURACION);
    },

    _cerrar(toast) {
        toast.classList.add('toast--saliendo');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }
};