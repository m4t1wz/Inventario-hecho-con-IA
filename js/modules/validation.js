'use strict';

// ==================== MÓDULO: VALIDACIÓN ====================

export const Validacion = {
    /**
     * Evalúa un input contra un array de reglas.
     * Actualiza aria-invalid y el mensaje de error en el DOM.
     * @returns {boolean} true si el campo es válido
     */
    campo(inputEl, errorId, reglas) {
        const errorEl = document.getElementById(errorId);
        const valor   = inputEl.value.trim();

        for (const regla of reglas) {
            const resultado = regla(valor);
            if (resultado !== true) {
                inputEl.setAttribute('aria-invalid', 'true');
                errorEl.textContent = resultado;
                return false;
            }
        }

        inputEl.setAttribute('aria-invalid', 'false');
        errorEl.textContent = '';
        return true;
    },

    reglas: {
        requerido: v =>
            v.length > 0 || 'Este campo es obligatorio.',

        precioPositivo: v => {
            const n = parseFloat(v);
            return (!isNaN(n) && n > 0) || 'Ingresá un precio mayor a 0.';
        },

        stockNoNegativo: v => {
            const n = parseInt(v, 10);
            return (!isNaN(n) && n >= 0) || 'El stock no puede ser negativo.';
        },

        cantidadPositiva: v => {
            const n = parseInt(v, 10);
            return (!isNaN(n) && n >= 1) || 'La cantidad debe ser al menos 1.';
        }
    },

    limpiar(...pares) {
        pares.forEach(([inputEl, errorId]) => {
            inputEl.setAttribute('aria-invalid', 'false');
            const errorEl = document.getElementById(errorId);
            if (errorEl) errorEl.textContent = '';
        });
    }
};