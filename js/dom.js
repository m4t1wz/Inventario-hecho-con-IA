'use strict';

// ==================== REFERENCIAS AL DOM ====================
// ES Modules son diferidos por defecto → DOM garantizado al ejecutarse

export const refs = {
    // Formulario: Agregar producto
    formProducto:   document.getElementById('form-producto'),
    inputNombre:    document.getElementById('nombre'),
    inputPrecio:    document.getElementById('precio'),
    inputStock:     document.getElementById('stock'),

    // Estadísticas
    totalProductos: document.getElementById('total-productos'),
    stockTotal:     document.getElementById('stock-total'),
    ventasTotales:  document.getElementById('ventas-totales'),
    totalFacturado: document.getElementById('total-facturado'),

    // Tabla de productos y buscador
    tablaBody:      document.getElementById('tabla-body'),
    buscador:       document.getElementById('buscar'),

    // Modales (<dialog>)
    modalEditar:    document.getElementById('modal-editar'),
    modalVender:    document.getElementById('modal-vender'),
    modalEliminar:  document.getElementById('modal-eliminar'),
    modalReiniciar: document.getElementById('modal-reiniciar'),

    // Formulario: Editar producto
    formEditar:     document.getElementById('form-editar'),
    editarId:       document.getElementById('editar-id'),
    editarNombre:   document.getElementById('editar-nombre'),
    editarPrecio:   document.getElementById('editar-precio'),
    editarStock:    document.getElementById('editar-stock'),

    // Formulario: Vender producto
    formVender:         document.getElementById('form-vender'),
    venderId:           document.getElementById('vender-id'),
    venderNombre:       document.getElementById('vender-nombre'),
    venderStockDisp:    document.getElementById('vender-stock-disponible'),
    venderCantidad:     document.getElementById('vender-cantidad'),

    // Modal: Confirmar eliminación
    eliminarNombre:       document.getElementById('eliminar-nombre'),
    btnConfirmarEliminar: document.getElementById('btn-confirmar-eliminar'),

    // Modal: Confirmar reinicio
    btnConfirmarReiniciar: document.getElementById('btn-confirmar-reiniciar'),

    // Sistema
    btnLimpiar:     document.getElementById('btn-limpiar'),
    toastContainer: document.getElementById('toast-container'),

    // Historial de ventas
    historialBody:      document.getElementById('historial-body'),
    historialResumen:   document.getElementById('historial-resumen'),
    btnToggle:          document.getElementById('btn-toggle-historial'),
    historialContenido: document.getElementById('historial-contenido'),

    // Filtros del historial
    btnsFiltrosPeriodo: document.querySelectorAll('.btn-filtro-periodo'),
    filtrosRango:       document.getElementById('filtros-rango'),
    filtroFechaDesde:   document.getElementById('filtro-fecha-desde'),
    filtroFechaHasta:   document.getElementById('filtro-fecha-hasta'),
    filtroProducto:     document.getElementById('filtro-producto'),
    filtroFranja:       document.getElementById('filtro-franja'),
    btnLimpiarFiltros:  document.getElementById('btn-limpiar-filtros')
};