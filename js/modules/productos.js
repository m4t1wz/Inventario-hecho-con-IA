'use strict';

import { estado } from '../state.js';
import { Storage } from './storage.js';
import { Historial } from './historial.js';

// ==================== MÓDULO: LÓGICA DE NEGOCIO ====================

export const Productos = {
    porId(id) {
        return estado.productos.find(p => p.id === id) ?? null;
    },

    agregar(nombre, precio, stock) {
        estado.productos.push({
            id: estado.idCounter++,
            nombre,
            precio,
            stock
        });
        Storage.guardar();
    },

    editar(id, nombre, precio, stock) {
        const producto = Productos.porId(id);
        if (!producto) return false;

        producto.nombre = nombre;
        producto.precio = precio;
        producto.stock  = stock;

        Storage.guardar();
        return true;
    },

    vender(id, cantidad) {
        const producto = Productos.porId(id);
        if (!producto) return false;

        // Descontar stock primero para que stockRestante refleje el valor real post-venta
        producto.stock -= cantidad;

        const registro = Historial.crearRegistro(producto, cantidad, producto.stock);
        estado.historialVentas.push(registro);   // append-only

        Storage.guardar();
        return true;
    },

    eliminar(id) {
        const indice = estado.productos.findIndex(p => p.id === id);
        if (indice === -1) return false;

        estado.productos.splice(indice, 1);
        Storage.guardar();
        return true;
    },

    filtrar(texto) {
        const termino = texto.toLowerCase().trim();
        if (!termino) return estado.productos;
        return estado.productos.filter(p =>
            p.nombre.toLowerCase().includes(termino)
        );
    },

    reiniciar() {
        estado.productos       = [];
        estado.historialVentas = [];
        estado.idCounter       = 1;
        estado.saleIdCounter   = 1;
        Storage.limpiar();
    }
};