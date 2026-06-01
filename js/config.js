'use strict';

// ==================== CONSTANTES GLOBALES ====================

export const STORAGE_KEYS = {
    PRODUCTOS:     'gp_productos',
    HISTORIAL:     'gp_historial',
    COUNTER_PROD:  'gp_id_counter',
    COUNTER_VENTA: 'gp_sale_counter'
};

// Claves de versiones anteriores que se limpian junto con los datos propios
export const STORAGE_KEYS_LEGACY = ['gp_ventas_totales'];

export const TOAST_CONFIG = {
    DURACION: 3000,
    ICONOS: {
        success: '✅',
        error:   '❌',
        warning: '⚠️'
    }
};

export const STOCK_UMBRAL_BAJO = 5;