'use strict';

// ==================== CONFIGURACIÓN ====================
// Definida en config.js → window.APPS_SCRIPT_URL = 'https://...'
const APPS_SCRIPT_URL = window.APPS_SCRIPT_URL || '';

// ==================== CONSTANTES ====================

const TOAST_CONFIG = {
    DURACION: 3000,
    ICONOS: {
        success: '✅',
        error:   '❌',
        warning: '⚠️'
    }
};

const STOCK_UMBRAL_BAJO = 5;

// ==================== ESTADO GLOBAL ====================

const estado = {
    productos:       [],
    historialVentas: [],
    idCounter:       1,
    saleIdCounter:   1
};

// ==================== ESTADO DE FILTROS ====================

const estadoFiltros = {
    periodo:    'todo',
    fechaDesde: '',
    fechaHasta: '',
    producto:   '',
    franja:     'todas'
};

let pendienteEliminarId = null;
let focusPrevioAlModal  = null;

// ==================== REFERENCIAS AL DOM ====================

const refs = {
    formProducto:   document.getElementById('form-producto'),
    inputNombre:    document.getElementById('nombre'),
    inputPrecio:    document.getElementById('precio'),
    inputStock:     document.getElementById('stock'),

    totalProductos: document.getElementById('total-productos'),
    stockTotal:     document.getElementById('stock-total'),
    ventasTotales:  document.getElementById('ventas-totales'),
    totalFacturado: document.getElementById('total-facturado'),

    tablaBody:      document.getElementById('tabla-body'),
    buscador:       document.getElementById('buscar'),

    modalEditar:    document.getElementById('modal-editar'),
    modalVender:    document.getElementById('modal-vender'),
    modalEliminar:  document.getElementById('modal-eliminar'),
    modalReiniciar: document.getElementById('modal-reiniciar'),

    formEditar:     document.getElementById('form-editar'),
    editarId:       document.getElementById('editar-id'),
    editarNombre:   document.getElementById('editar-nombre'),
    editarPrecio:   document.getElementById('editar-precio'),
    editarStock:    document.getElementById('editar-stock'),

    formVender:         document.getElementById('form-vender'),
    venderId:           document.getElementById('vender-id'),
    venderNombre:       document.getElementById('vender-nombre'),
    venderStockDisp:    document.getElementById('vender-stock-disponible'),
    venderCantidad:     document.getElementById('vender-cantidad'),

    eliminarNombre:        document.getElementById('eliminar-nombre'),
    btnConfirmarEliminar:  document.getElementById('btn-confirmar-eliminar'),
    btnConfirmarReiniciar: document.getElementById('btn-confirmar-reiniciar'),

    btnLimpiar:     document.getElementById('btn-limpiar'),
    toastContainer: document.getElementById('toast-container'),

    historialBody:      document.getElementById('historial-body'),
    historialResumen:   document.getElementById('historial-resumen'),
    btnToggle:          document.getElementById('btn-toggle-historial'),
    historialContenido: document.getElementById('historial-contenido'),

    btnsFiltrosPeriodo: document.querySelectorAll('.btn-filtro-periodo'),
    filtrosRango:       document.getElementById('filtros-rango'),
    filtroFechaDesde:   document.getElementById('filtro-fecha-desde'),
    filtroFechaHasta:   document.getElementById('filtro-fecha-hasta'),
    filtroProducto:     document.getElementById('filtro-producto'),
    filtroFranja:       document.getElementById('filtro-franja'),
    btnLimpiarFiltros:  document.getElementById('btn-limpiar-filtros')
};

// ==================== MÓDULO: TEMPORAL ====================

const Temporal = {
    _fmtFecha: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day: '2-digit', month: '2-digit', year: 'numeric'
    }),
    _fmtHora: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }),
    _fmtFechaISO: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
    }),
    _fmtHoraNum: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: 'numeric', hour12: false
    }),

    crearTimestampVenta()          { return new Date().toISOString(); },
    formatearFechaVenta(iso)       { return this._fmtFecha.format(new Date(iso)); },
    formatearHoraVenta(iso)        { return this._fmtHora.format(new Date(iso)); },
    obtenerFechaLocalBAires(iso)   { return this._fmtFechaISO.format(new Date(iso)); },
    obtenerFechaHoyBAires()        { return this._fmtFechaISO.format(new Date()); },

    obtenerHoraBAires(iso) {
        const n = parseInt(this._fmtHoraNum.format(new Date(iso)), 10);
        return isNaN(n) ? 0 : n % 24;
    },

    obtenerInicioSemanaBAires() {
        const hoy        = this.obtenerFechaHoyBAires();
        const [y, m, d]  = hoy.split('-').map(Number);
        const fecha      = new Date(y, m - 1, d);
        const dia        = fecha.getDay();
        fecha.setDate(fecha.getDate() - (dia === 0 ? 6 : dia - 1));
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, '0'),
            String(fecha.getDate()).padStart(2, '0')
        ].join('-');
    },

    obtenerVentasDelDia(historial) {
        const hoy = this.obtenerFechaHoyBAires();
        return historial.filter(v => this.obtenerFechaLocalBAires(v.timestamp) === hoy);
    },

    obtenerVentasPorRango(historial, desde, hasta) {
        return historial.filter(v => {
            const f = this.obtenerFechaLocalBAires(v.timestamp);
            return f >= desde && f <= hasta;
        });
    },

    obtenerVentasPorFranja(historial, franja) {
        if (franja === 'todas') return historial;
        const FRANJAS = { madrugada: [0, 6], manana: [6, 12], tarde: [12, 18], noche: [18, 24] };
        const [ini, fin] = FRANJAS[franja] ?? [0, 24];
        return historial.filter(v => {
            const h = this.obtenerHoraBAires(v.timestamp);
            return h >= ini && h < fin;
        });
    }
};

// ==================== MÓDULO: PERSISTENCIA ====================
// Sin Content-Type → evita CORS preflight en Apps Script

const Storage = {
    async cargar() {
        const res  = await fetch(`${APPS_SCRIPT_URL}?action=cargar`, { redirect: 'follow' });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error al cargar datos');
        return data;
    },

    async post(body) {
        const res  = await fetch(APPS_SCRIPT_URL, {
            method:   'POST',
            redirect: 'follow',
            body:     JSON.stringify(body)
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error || 'Error en la operación');
        return data;
    }
};

// ==================== MÓDULO: VALIDACIÓN ====================

const Validacion = {
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
        requerido:       v => v.length > 0                              || 'Este campo es obligatorio.',
        precioPositivo:  v => (!isNaN(parseFloat(v)) && parseFloat(v) > 0)  || 'Ingresá un precio mayor a 0.',
        stockNoNegativo: v => (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 0) || 'El stock no puede ser negativo.',
        cantidadPositiva:v => (!isNaN(parseInt(v, 10)) && parseInt(v, 10) >= 1)  || 'La cantidad debe ser al menos 1.'
    },

    limpiar(...pares) {
        pares.forEach(([inputEl, errorId]) => {
            inputEl.setAttribute('aria-invalid', 'false');
            const errorEl = document.getElementById(errorId);
            if (errorEl) errorEl.textContent = '';
        });
    }
};

// ==================== MÓDULO: UTILIDADES ====================

const _fmtPrecio = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });

function formatearPrecio(precio)      { return _fmtPrecio.format(precio); }
function clasificarStock(stock)       { return stock === 0 ? 'badge-stock--cero' : stock <= STOCK_UMBRAL_BAJO ? 'badge-stock--bajo' : 'badge-stock--ok'; }
function clasificarStockRestante(s)   { return s === 0 ? 'venta-stock-restante--cero' : s <= STOCK_UMBRAL_BAJO ? 'venta-stock-restante--bajo' : 'venta-stock-restante--ok'; }
function escaparHTML(texto)           { const d = document.createElement('div'); d.textContent = texto; return d.innerHTML; }

// ==================== MÓDULO: TOASTS ====================

const Toast = {
    mostrar(mensaje, tipo = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast--${tipo}`;
        toast.setAttribute('role', 'status');
        toast.innerHTML = `
            <span class="toast__icono" aria-hidden="true">${TOAST_CONFIG.ICONOS[tipo] ?? '✅'}</span>
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

// ==================== MÓDULO: MODALES ====================

const Modal = {
    abrir(dialogEl) {
        focusPrevioAlModal = document.activeElement;
        dialogEl.showModal();
        const primerInteractivo = dialogEl.querySelector('input:not([type="hidden"]), button:not(.btn-cerrar-modal)');
        if (primerInteractivo) primerInteractivo.focus();
    },

    cerrar(dialogEl) {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            dialogEl.close();
            return;
        }
        dialogEl.classList.add('modal--cerrando');
        dialogEl.addEventListener('animationend', () => {
            dialogEl.classList.remove('modal--cerrando');
            dialogEl.close();
        }, { once: true });
    },

    abrirEditar(id) {
        const p = Productos.porId(id);
        if (!p) return;
        refs.editarId.value     = p.id;
        refs.editarNombre.value = p.nombre;
        refs.editarPrecio.value = p.precio;
        refs.editarStock.value  = p.stock;
        Validacion.limpiar(
            [refs.editarNombre, 'editar-nombre-error'],
            [refs.editarPrecio, 'editar-precio-error'],
            [refs.editarStock,  'editar-stock-error']
        );
        Modal.abrir(refs.modalEditar);
    },

    abrirVender(id) {
        const p = Productos.porId(id);
        if (!p) return;
        refs.venderId.value              = p.id;
        refs.venderNombre.textContent    = p.nombre;
        refs.venderStockDisp.textContent = p.stock;
        refs.venderCantidad.value        = 1;
        refs.venderCantidad.max          = p.stock;
        Validacion.limpiar([refs.venderCantidad, 'vender-cantidad-error']);
        Modal.abrir(refs.modalVender);
    },

    abrirEliminar(id) {
        const p = Productos.porId(id);
        if (!p) return;
        pendienteEliminarId             = id;
        refs.eliminarNombre.textContent = `"${p.nombre}"`;
        Modal.abrir(refs.modalEliminar);
        refs.btnConfirmarEliminar.focus();
    },

    abrirReiniciar() {
        Modal.abrir(refs.modalReiniciar);
        refs.btnConfirmarReiniciar.focus();
    }
};

document.querySelectorAll('.modal').forEach(dialogEl => {
    dialogEl.addEventListener('close', () => {
        if (focusPrevioAlModal) { focusPrevioAlModal.focus(); focusPrevioAlModal = null; }
        if (dialogEl === refs.modalEliminar) pendienteEliminarId = null;
    });
    dialogEl.addEventListener('click', e => {
        if (e.target === dialogEl) Modal.cerrar(dialogEl);
    });
});

// ==================== MÓDULO: HISTORIAL ====================

const Historial = {
    crearRegistro(producto, cantidad, stockRestante) {
        return {
            saleId:       `V-${String(estado.saleIdCounter++).padStart(4, '0')}`,
            timestamp:    Temporal.crearTimestampVenta(),
            productId:    producto.id,
            productName:  producto.nombre,
            quantity:     cantidad,
            unitPrice:    producto.precio,
            subtotal:     +(producto.precio * cantidad).toFixed(2),
            stockRestante
        };
    },

    filtrar() {
        let r = [...estado.historialVentas];
        switch (estadoFiltros.periodo) {
            case 'hoy':
                r = Temporal.obtenerVentasDelDia(r); break;
            case 'semana':
                r = Temporal.obtenerVentasPorRango(r, Temporal.obtenerInicioSemanaBAires(), Temporal.obtenerFechaHoyBAires()); break;
            case 'rango': {
                const { fechaDesde: d, fechaHasta: h } = estadoFiltros;
                if (d || h) r = Temporal.obtenerVentasPorRango(r, d || '0000-01-01', h || '9999-12-31');
                break;
            }
        }
        if (estadoFiltros.franja !== 'todas') r = Temporal.obtenerVentasPorFranja(r, estadoFiltros.franja);
        if (estadoFiltros.producto.trim()) {
            const t = estadoFiltros.producto.toLowerCase().trim();
            r = r.filter(v => v.productName.toLowerCase().includes(t));
        }
        return r;
    },

    calcularTotalFacturado(ventas) { return ventas.reduce((s, v) => s + v.subtotal,  0); },
    calcularTotalUnidades(ventas)  { return ventas.reduce((s, v) => s + v.quantity,  0); }
};

// ==================== MÓDULO: LÓGICA DE NEGOCIO ====================
// Cada método hace update optimista → UI instantánea → fetch en background.
// Si el fetch falla: rollback automático + re-render.

const Productos = {
    porId(id) { return estado.productos.find(p => p.id === id) ?? null; },

    async agregar(nombre, precio, stock) {
        const producto = { id: estado.idCounter++, nombre, precio, stock };
        estado.productos.push(producto);
        UI.actualizar();
        try {
            await Storage.post({ action: 'agregarProducto', producto, idCounter: estado.idCounter });
        } catch (err) {
            estado.productos.pop();
            estado.idCounter--;
            UI.actualizar();
            throw err;
        }
    },

    async editar(id, nombre, precio, stock) {
        const producto = Productos.porId(id);
        if (!producto) return false;
        const snap = { nombre: producto.nombre, precio: producto.precio, stock: producto.stock };
        producto.nombre = nombre;
        producto.precio = precio;
        producto.stock  = stock;
        UI.actualizar();
        try {
            await Storage.post({ action: 'editarProducto', producto: { id, nombre, precio, stock } });
        } catch (err) {
            Object.assign(producto, snap);
            UI.actualizar();
            throw err;
        }
        return true;
    },

    async vender(id, cantidad) {
        const producto = Productos.porId(id);
        if (!producto) return false;
        const stockPrev  = producto.stock;
        const saleIdPrev = estado.saleIdCounter;
        producto.stock  -= cantidad;
        const registro   = Historial.crearRegistro(producto, cantidad, producto.stock);
        estado.historialVentas.push(registro);
        UI.actualizar();
        try {
            await Storage.post({
                action:        'vender',
                productId:     id,
                stockNuevo:    producto.stock,
                venta:         registro,
                saleIdCounter: estado.saleIdCounter
            });
        } catch (err) {
            producto.stock       = stockPrev;
            estado.saleIdCounter = saleIdPrev;
            estado.historialVentas.pop();
            UI.actualizar();
            throw err;
        }
        return true;
    },

    async eliminar(id) {
        const indice = estado.productos.findIndex(p => p.id === id);
        if (indice === -1) return false;
        const snap = { ...estado.productos[indice] };
        estado.productos.splice(indice, 1);
        UI.actualizar();
        try {
            await Storage.post({ action: 'eliminarProducto', id });
        } catch (err) {
            estado.productos.splice(indice, 0, snap);
            UI.actualizar();
            throw err;
        }
        return true;
    },

    filtrar(texto) {
        const t = texto.toLowerCase().trim();
        return t ? estado.productos.filter(p => p.nombre.toLowerCase().includes(t)) : estado.productos;
    },

    async reiniciar() {
        const snap = {
            productos:       [...estado.productos],
            historialVentas: [...estado.historialVentas],
            idCounter:       estado.idCounter,
            saleIdCounter:   estado.saleIdCounter
        };
        estado.productos       = [];
        estado.historialVentas = [];
        estado.idCounter       = 1;
        estado.saleIdCounter   = 1;
        UI.actualizar();
        try {
            await Storage.post({ action: 'reiniciar' });
        } catch (err) {
            Object.assign(estado, snap);
            UI.actualizar();
            throw err;
        }
    }
};

// ==================== MÓDULO: RENDERIZADO (UI) ====================

const UI = {
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
                <tr><td colspan="4" class="tabla-vacia">
                    <span class="tabla-vacia__icono" aria-hidden="true">📦</span>${msg}
                </td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        filtrados.forEach(producto => {
            const fila         = document.createElement('tr');
            const sinStock     = producto.stock === 0;
            const nombreSeguro = escaparHTML(producto.nombre);
            if (sinStock) fila.classList.add('stock-agotado');
            fila.innerHTML = `
                <td>${nombreSeguro}</td>
                <td>${formatearPrecio(producto.precio)}</td>
                <td>
                    <span class="badge-stock ${clasificarStock(producto.stock)}"
                        aria-label="Stock: ${producto.stock}">${producto.stock}</span>
                </td>
                <td>
                    <button class="btn-accion vender" data-id="${producto.id}"
                        aria-label="Vender ${nombreSeguro}"
                        ${sinStock ? 'disabled aria-disabled="true"' : ''}>Vender</button>
                    <button class="btn-accion editar"   data-id="${producto.id}"
                        aria-label="Editar ${nombreSeguro}">Editar</button>
                    <button class="btn-accion eliminar" data-id="${producto.id}"
                        aria-label="Eliminar ${nombreSeguro}">Eliminar</button>
                </td>`;
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
                ? ['🔍', 'Sin resultados', 'No hay ventas que coincidan con los filtros aplicados.']
                : ['📋', 'Sin ventas registradas', 'Las ventas aparecerán aquí una vez que confirmes la primera operación.'];
            refs.historialBody.innerHTML = `
                <tr><td colspan="8" class="historial-vacio">
                    <span class="historial-vacio__icono" aria-hidden="true">${icono}</span>
                    <p class="historial-vacio__titulo">${titulo}</p>
                    <p class="historial-vacio__desc">${desc}</p>
                </td></tr>`;
            return;
        }

        const fragment = document.createDocumentFragment();
        [...ventas].reverse().forEach(venta => {
            const fila         = document.createElement('tr');
            const nombreSeguro = escaparHTML(venta.productName);
            fila.innerHTML = `
                <td><span class="venta-id">${escaparHTML(venta.saleId)}</span></td>
                <td>${Temporal.formatearFechaVenta(venta.timestamp)}</td>
                <td>${Temporal.formatearHoraVenta(venta.timestamp)}</td>
                <td class="celda-producto">${nombreSeguro}</td>
                <td>${venta.quantity}</td>
                <td>${formatearPrecio(venta.unitPrice)}</td>
                <td><span class="venta-subtotal">${formatearPrecio(venta.subtotal)}</span></td>
                <td>
                    <span class="venta-stock-restante ${clasificarStockRestante(venta.stockRestante)}"
                        aria-label="Stock restante: ${venta.stockRestante}">${venta.stockRestante}</span>
                </td>`;
            fragment.appendChild(fila);
        });
        refs.historialBody.appendChild(fragment);
    },

    _renderizarResumenHistorial(ventas) {
        const cant  = ventas.length;
        const units = Historial.calcularTotalUnidades(ventas);
        const fact  = Historial.calcularTotalFacturado(ventas);
        refs.historialResumen.innerHTML = `
            <span class="resumen-stat">
                <span class="resumen-stat__valor">${cant}</span>
                ${cant === 1 ? 'transacción' : 'transacciones'}
            </span>
            <span class="resumen-separador" aria-hidden="true"></span>
            <span class="resumen-stat">
                <span class="resumen-stat__valor">${units}</span>
                ${units === 1 ? 'unidad vendida' : 'unidades vendidas'}
            </span>
            <span class="resumen-separador" aria-hidden="true"></span>
            <span class="resumen-stat">
                Facturado:&nbsp;
                <span class="resumen-stat__valor resumen-stat__valor--facturado">${formatearPrecio(fact)}</span>
            </span>`;
    },

    actualizarEstadisticas() {
        refs.totalProductos.textContent = estado.productos.length;
        refs.stockTotal.textContent     = estado.productos.reduce((s, p) => s + p.stock, 0);
        refs.ventasTotales.textContent  = Historial.calcularTotalUnidades(estado.historialVentas);
        refs.totalFacturado.textContent = formatearPrecio(Historial.calcularTotalFacturado(estado.historialVentas));
    }
};

// ==================== MÓDULO: FILTROS ====================

const Filtros = {
    aplicar() { UI.renderizarHistorial(); },

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

    setPeriodo(periodo) {
        estadoFiltros.periodo = periodo;
        refs.btnsFiltrosPeriodo.forEach(btn => {
            const activo = btn.dataset.periodo === periodo;
            btn.classList.toggle('activo', activo);
            btn.setAttribute('aria-pressed', String(activo));
        });
        refs.filtrosRango.hidden = periodo !== 'rango';
        if (periodo !== 'rango') {
            estadoFiltros.fechaDesde    = '';
            estadoFiltros.fechaHasta    = '';
            refs.filtroFechaDesde.value = '';
            refs.filtroFechaHasta.value = '';
        }
        Filtros.aplicar();
    }
};

// ==================== TOGGLE DEL HISTORIAL ====================

function toggleHistorial() {
    const nuevo = refs.btnToggle.getAttribute('aria-expanded') !== 'true';
    refs.btnToggle.setAttribute('aria-expanded', String(nuevo));
    refs.btnToggle.querySelector('.toggle-texto').textContent = nuevo ? 'Ocultar' : 'Mostrar';
    refs.historialContenido.classList.toggle('colapsado', !nuevo);
}

// ==================== MANEJADORES DE EVENTOS ====================

refs.formProducto.addEventListener('submit', async e => {
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

    refs.formProducto.reset();
    Validacion.limpiar(
        [refs.inputNombre, 'nombre-error'],
        [refs.inputPrecio, 'precio-error'],
        [refs.inputStock,  'stock-error']
    );

    try {
        await Productos.agregar(nombre, precio, stock);
        Toast.mostrar(`"${nombre}" agregado correctamente.`, 'success');
    } catch {
        Toast.mostrar(`Error al guardar "${nombre}". Reintentá.`, 'error');
    }
});

refs.formEditar.addEventListener('submit', async e => {
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

    Modal.cerrar(refs.modalEditar);

    try {
        await Productos.editar(id, nombre, precio, stock);
        Toast.mostrar(`"${nombre}" actualizado correctamente.`, 'success');
    } catch {
        Toast.mostrar(`Error al guardar "${nombre}". Reintentá.`, 'error');
    }
});

refs.formVender.addEventListener('submit', async e => {
    e.preventDefault();
    const validCantidad = Validacion.campo(
        refs.venderCantidad, 'vender-cantidad-error',
        [Validacion.reglas.requerido, Validacion.reglas.cantidadPositiva]
    );
    if (!validCantidad) return;

    const id       = parseInt(refs.venderId.value, 10);
    const cantidad = parseInt(refs.venderCantidad.value, 10);
    const producto = Productos.porId(id);
    if (!producto) return;

    if (cantidad > producto.stock) {
        refs.venderCantidad.setAttribute('aria-invalid', 'true');
        document.getElementById('vender-cantidad-error').textContent =
            `Solo hay ${producto.stock} unidad(es) disponible(s).`;
        return;
    }

    const nombre = producto.nombre;
    Modal.cerrar(refs.modalVender);

    try {
        await Productos.vender(id, cantidad);
        Toast.mostrar(`Venta realizada: ${cantidad} × "${nombre}".`, 'success');
    } catch {
        Toast.mostrar('Error al registrar la venta. Reintentá.', 'error');
    }
});

refs.btnConfirmarEliminar.addEventListener('click', async () => {
    if (pendienteEliminarId === null) return;

    const producto = Productos.porId(pendienteEliminarId);
    const nombre   = producto?.nombre ?? '';
    const id       = pendienteEliminarId;

    pendienteEliminarId = null;
    Modal.cerrar(refs.modalEliminar);

    try {
        await Productos.eliminar(id);
        Toast.mostrar(`"${nombre}" eliminado.`, 'warning');
    } catch {
        Toast.mostrar(`Error al eliminar "${nombre}". Reintentá.`, 'error');
    }
});

refs.btnConfirmarReiniciar.addEventListener('click', async () => {
    Modal.cerrar(refs.modalReiniciar);
    Filtros.limpiar();

    try {
        await Productos.reiniciar();
        Toast.mostrar('Sistema reiniciado completamente.', 'warning');
    } catch {
        Toast.mostrar('Error al reiniciar. Reintentá.', 'error');
    }
});

refs.btnLimpiar.addEventListener('click', () => Modal.abrirReiniciar());

refs.tablaBody.addEventListener('click', e => {
    const boton = e.target.closest('.btn-accion');
    if (!boton) return;
    const id = parseInt(boton.dataset.id, 10);
    if (boton.classList.contains('vender'))   Modal.abrirVender(id);
    if (boton.classList.contains('editar'))   Modal.abrirEditar(id);
    if (boton.classList.contains('eliminar')) Modal.abrirEliminar(id);
});

refs.buscador.addEventListener('input', () => UI.renderizarTabla());

document.addEventListener('click', e => {
    const boton = e.target.closest('[data-modal]');
    if (!boton) return;
    const dialogEl = document.getElementById(boton.dataset.modal);
    if (dialogEl) Modal.cerrar(dialogEl);
});

refs.btnToggle.addEventListener('click', toggleHistorial);

refs.btnsFiltrosPeriodo.forEach(btn => {
    btn.addEventListener('click', () => Filtros.setPeriodo(btn.dataset.periodo));
});

refs.filtroFechaDesde.addEventListener('change', () => {
    estadoFiltros.fechaDesde = refs.filtroFechaDesde.value;
    Filtros.aplicar();
});
refs.filtroFechaHasta.addEventListener('change', () => {
    estadoFiltros.fechaHasta = refs.filtroFechaHasta.value;
    Filtros.aplicar();
});
refs.filtroProducto.addEventListener('input', () => {
    estadoFiltros.producto = refs.filtroProducto.value;
    Filtros.aplicar();
});
refs.filtroFranja.addEventListener('change', () => {
    estadoFiltros.franja = refs.filtroFranja.value;
    Filtros.aplicar();
});
refs.btnLimpiarFiltros.addEventListener('click', () => Filtros.limpiar());

// ==================== INICIALIZACIÓN ====================

async function inicializar() {
    // Grid trick (colapso del historial)
    const inner = document.createElement('div');
    inner.className = 'historial-contenido-inner';
    while (refs.historialContenido.firstChild) {
        inner.appendChild(refs.historialContenido.firstChild);
    }
    refs.historialContenido.appendChild(inner);

    // Feedback visual mientras carga
    refs.tablaBody.innerHTML = `
        <tr><td colspan="4" class="tabla-vacia">
            <span class="tabla-vacia__icono" aria-hidden="true">⏳</span>
            Cargando datos...
        </td></tr>`;

    try {
        const data             = await Storage.cargar();
        estado.productos       = data.productos      ?? [];
        estado.historialVentas = data.historial       ?? [];
        estado.idCounter       = data.idCounter       ?? 1;
        estado.saleIdCounter   = data.saleIdCounter   ?? 1;
    } catch {
        Toast.mostrar('Error al conectar con el servidor.', 'error');
    } finally {
        UI.actualizar();
    }
}

inicializar();
