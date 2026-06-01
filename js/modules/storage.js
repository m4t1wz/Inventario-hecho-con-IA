'use strict';

import { STORAGE_KEYS, STORAGE_KEYS_LEGACY } from '../config.js';
import { estado } from '../state.js';

// ==================== MÓDULO: PERSISTENCIA ====================

export const Storage = {
    guardar() {
        localStorage.setItem(STORAGE_KEYS.PRODUCTOS,     JSON.stringify(estado.productos));
        localStorage.setItem(STORAGE_KEYS.HISTORIAL,     JSON.stringify(estado.historialVentas));
        localStorage.setItem(STORAGE_KEYS.COUNTER_PROD,  String(estado.idCounter));
        localStorage.setItem(STORAGE_KEYS.COUNTER_VENTA, String(estado.saleIdCounter));
    },

    cargar() {
        const productos  = localStorage.getItem(STORAGE_KEYS.PRODUCTOS);
        const historial  = localStorage.getItem(STORAGE_KEYS.HISTORIAL);
        const counterP   = localStorage.getItem(STORAGE_KEYS.COUNTER_PROD);
        const counterV   = localStorage.getItem(STORAGE_KEYS.COUNTER_VENTA);

        if (productos) estado.productos       = JSON.parse(productos);
        if (historial) estado.historialVentas = JSON.parse(historial);
        if (counterP)  estado.idCounter       = parseInt(counterP,  10);
        if (counterV)  estado.saleIdCounter   = parseInt(counterV,  10);
    },

    // Elimina solo las claves propias (actuales y legacy) sin tocar otros datos del sitio
    limpiar() {
        Object.values(STORAGE_KEYS)
            .concat(STORAGE_KEYS_LEGACY)
            .forEach(clave => localStorage.removeItem(clave));
    }
};