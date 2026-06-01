'use strict';

// ==================== MÓDULO: TEMPORAL ====================
// Toda la lógica de fecha/hora está centralizada aquí.
// Los datos se persisten en UTC (ISO 8601); el formato visible se deriva solo al renderizar.

export const Temporal = {
    ZONA_HORARIA: 'America/Argentina/Buenos_Aires',
    LOCALE:       'es-AR',

    // Instancias únicas — se crean una vez y se reutilizan en cada render
    _fmtFecha: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        day:      '2-digit',
        month:    '2-digit',
        year:     'numeric'
    }),

    _fmtHora: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour:     '2-digit',
        minute:   '2-digit',
        second:   '2-digit',
        hour12:   false
    }),

    // en-CA da formato YYYY-MM-DD, ideal para comparaciones de rango
    _fmtFechaISO: new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Argentina/Buenos_Aires'
    }),

    _fmtHoraNum: new Intl.DateTimeFormat('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour:     'numeric',
        hour12:   false
    }),

    /** Genera el timestamp UTC del instante actual en formato ISO 8601 */
    crearTimestampVenta() {
        return new Date().toISOString();
    },

    /** Fecha legible para el historial: "15/01/2025" */
    formatearFechaVenta(isoString) {
        return this._fmtFecha.format(new Date(isoString));
    },

    /** Hora legible para el historial: "14:30:07" */
    formatearHoraVenta(isoString) {
        return this._fmtHora.format(new Date(isoString));
    },

    /** Retorna la fecha como YYYY-MM-DD en zona Argentina (para comparaciones) */
    obtenerFechaLocalBAires(isoString) {
        return this._fmtFechaISO.format(new Date(isoString));
    },

    /** YYYY-MM-DD de hoy en Buenos Aires */
    obtenerFechaHoyBAires() {
        return this._fmtFechaISO.format(new Date());
    },

    /** Hora (0–23) en Buenos Aires para franjas horarias */
    obtenerHoraBAires(isoString) {
        const raw = this._fmtHoraNum.format(new Date(isoString));
        const n   = parseInt(raw, 10);
        return isNaN(n) ? 0 : n % 24;   // normalizar '24' → 0
    },

    /** YYYY-MM-DD del lunes de la semana actual en Buenos Aires */
    obtenerInicioSemanaBAires() {
        const hoy           = this.obtenerFechaHoyBAires();
        const [y, m, d]     = hoy.split('-').map(Number);
        const fecha         = new Date(y, m - 1, d);
        const diaSemana     = fecha.getDay();                       // 0=Dom … 6=Sáb
        const diasALunes    = diaSemana === 0 ? 6 : diaSemana - 1;
        fecha.setDate(fecha.getDate() - diasALunes);
        return [
            fecha.getFullYear(),
            String(fecha.getMonth() + 1).padStart(2, '0'),
            String(fecha.getDate()).padStart(2, '0')
        ].join('-');
    },

    /** Ventas del día actual en Buenos Aires */
    obtenerVentasDelDia(historial) {
        const hoy = this.obtenerFechaHoyBAires();
        return historial.filter(v =>
            this.obtenerFechaLocalBAires(v.timestamp) === hoy
        );
    },

    /** Ventas dentro del rango [desde, hasta] en formato YYYY-MM-DD (inclusivo) */
    obtenerVentasPorRango(historial, desde, hasta) {
        return historial.filter(v => {
            const f = this.obtenerFechaLocalBAires(v.timestamp);
            return f >= desde && f <= hasta;
        });
    },

    /** Ventas de una franja horaria específica */
    obtenerVentasPorFranja(historial, franja) {
        if (franja === 'todas') return historial;
        const FRANJAS = {
            madrugada: [0,  6],
            manana:    [6,  12],
            tarde:     [12, 18],
            noche:     [18, 24]
        };
        const [ini, fin] = FRANJAS[franja] ?? [0, 24];
        return historial.filter(v => {
            const h = this.obtenerHoraBAires(v.timestamp);
            return h >= ini && h < fin;
        });
    }
};