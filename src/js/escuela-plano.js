// ============================================================
// Plano real de la institución, calcado de la imagen satelital
// (Google, zoom 19) alrededor de ESCUELA lat/lng.
// Unidades: metros respecto al centro. x = este (+), n = norte (+).
// Lo usan la maqueta 3D (perfil.js) y el mapa 3D (mapa-peligro.html),
// así ambos muestran exactamente la misma distribución.
// ============================================================
(function (global) {
    var ESCUELA = { lat: 3.4518, lng: -76.5688 };

    // Alas del edificio en forma de anillo alrededor del patio central.
    // Rectángulos: x0..x1 (este), n0..n1 (norte), h = altura en metros.
    var ALAS = [
        { id: 'norte', x0: -26, x1: 27, n0: 2.5,  n1: 12.5, h: 4.5 },
        { id: 'oeste', x0: -26, x1: -16, n0: -19, n1: 2.5,  h: 4.5 },
        { id: 'este',  x0: 10,  x1: 21,  n0: -12, n1: 2.5,  h: 4.5 },
        { id: 'sur',   x0: -16, x1: 22,  n0: -19, n1: -12,  h: 4 }
    ];

    // Patio central (zona abierta pavimentada)
    var PATIO = { x0: -16, x1: 10, n0: -12, n1: 2.5 };

    // Zonas ubicadas sobre el plano real. ala = ala donde está (null = abierta).
    var ZONAS = {
        'salones':     { nombre: 'Salones',     x0: -26, x1: -16, n0: -13, n1: 1,    ala: 'oeste', tipo: 'edif',    icon: 'fa-chalkboard', defaultScore: 7.0 },
        'baños':       { nombre: 'Baños',       x0: -16, x1: -6,  n0: 2.5, n1: 12.5, ala: 'norte', tipo: 'edif',    icon: 'fa-restroom',   defaultScore: 3.5 },
        'pasillos':    { nombre: 'Pasillos',    x0: -4,  x1: 8,   n0: 2.5, n1: 6.5,  ala: 'norte', tipo: 'bajo',    icon: 'fa-road',       defaultScore: 7.2 },
        'laboratorio': { nombre: 'Laboratorio', x0: 12,  x1: 25,  n0: 2.5, n1: 12.5, ala: 'norte', tipo: 'edif',    icon: 'fa-flask',      defaultScore: 2.5 },
        'escaleras':   { nombre: 'Escaleras',   x0: 12,  x1: 19,  n0: -9,  n1: -2,   ala: 'este',  tipo: 'torre',   icon: 'fa-stairs',     defaultScore: 4.2 },
        'cafeteria':   { nombre: 'Cafetería',   x0: -14, x1: -5,  n0: -19, n1: -12,  ala: 'sur',   tipo: 'edif',    icon: 'fa-utensils',   defaultScore: 6.0 },
        'entrada':     { nombre: 'Entrada',     x0: -3,  x1: 4,   n0: -19, n1: -14,  ala: 'sur',   tipo: 'bajo',    icon: 'fa-door-open',  defaultScore: 9.0 },
        'patio':       { nombre: 'Patio',       x0: -15, x1: -3,  n0: -11, n1: 1.5,  ala: null,    tipo: 'abierto', icon: 'fa-tree',       defaultScore: 8.5 },
        'canchas':     { nombre: 'Canchas',     x0: -2,  x1: 9,   n0: -11, n1: 1.5,  ala: null,    tipo: 'cancha',  icon: 'fa-futbol',     defaultScore: 5.5 }
    };

    var M_LAT = 111320;
    var M_LNG = 111320 * Math.cos(ESCUELA.lat * Math.PI / 180);

    function aLngLat(x, n) {
        return [ESCUELA.lng + x / M_LNG, ESCUELA.lat + n / M_LAT];
    }

    function centro(r) {
        return { x: (r.x0 + r.x1) / 2, n: (r.n0 + r.n1) / 2 };
    }

    // Anillo GeoJSON [lng,lat] de un rectángulo del plano
    function anilloGeo(r) {
        return [aLngLat(r.x0, r.n0), aLngLat(r.x1, r.n0), aLngLat(r.x1, r.n1), aLngLat(r.x0, r.n1), aLngLat(r.x0, r.n0)];
    }

    global.ESCUELA_PLANO = {
        ESCUELA: ESCUELA, ALAS: ALAS, PATIO: PATIO, ZONAS: ZONAS,
        M_LAT: M_LAT, M_LNG: M_LNG,
        aLngLat: aLngLat, centro: centro, anilloGeo: anilloGeo
    };
})(window);
