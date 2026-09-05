// Verificar autenticación
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userPhoto = localStorage.getItem('userPhoto');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos del usuario
    cargarDatosUsuario(userName, userPhoto);

    // Precarga en segundo plano: la primera consulta a Firestore paga el
    // costo de DNS + TLS (~1s). Lanzándola ya, cuando el usuario toque
    // "Perfil de Riesgo" o "Plan de Acción" los datos suelen estar listos
    // y el panel abre de inmediato.
    setTimeout(function() {
        obtenerDatosRiesgo().catch(function() { /* el panel mostrará el error */ });
    }, 250);
});

// Cargar datos del usuario
function cargarDatosUsuario(userName, userPhoto) {
    // Actualizar nombre
    const profileNameElement = document.getElementById('profileName');
    if (profileNameElement) {
        profileNameElement.textContent = userName || 'Usuario';
    }
    
    // Actualizar foto de perfil si existe
    if (userPhoto && userPhoto !== '' && userPhoto !== 'null') {
        const profilePhoto = document.getElementById('profilePhoto');
        const placeholder = document.getElementById('profilePhotoPlaceholder');
        
        profilePhoto.src = userPhoto;
        profilePhoto.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        // Mostrar inicial del nombre
        const inicial = (userName || 'U').charAt(0).toUpperCase();
        const placeholderElement = document.getElementById('profilePhotoPlaceholder');
        if (placeholderElement) {
            placeholderElement.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
    }
}

// Botón de volver atrás
document.getElementById('backBtn').addEventListener('click', () => {
    window.location.href = 'dashboard.html';
});

// Botón de notificaciones
document.getElementById('notificationBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
});

// ==========================================================
// UTILIDADES COMPARTIDAS
// ==========================================================

// Publica la altura real del header fijo como variable CSS, para que los
// paneles reserven exactamente ese espacio y no quede ninguna franja del
// fondo azul visible entre el header y el contenido de la sección.
function sincronizarAlturaHeader() {
    var header = document.querySelector('.perfil-header');
    if (!header) return;
    var alto = Math.round(header.getBoundingClientRect().height);
    if (alto > 0) {
        document.documentElement.style.setProperty('--header-h', alto + 'px');
    }
}

document.addEventListener('DOMContentLoaded', sincronizarAlturaHeader);
window.addEventListener('resize', sincronizarAlturaHeader);
window.addEventListener('orientationchange', sincronizarAlturaHeader);
// Las webfonts/iconos pueden cambiar la altura del header al terminar de cargar.
window.addEventListener('load', sincronizarAlturaHeader);

// Escapa texto que viene de la base de datos antes de inyectarlo como HTML.
function escapeHTML(texto) {
    return String(texto == null ? '' : texto)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Total de zonas que se espera evaluar por institución.
var TOTAL_ZONAS_INSTITUCION = 9;

// Clasificación de una zona según su puntuación de seguridad (0-10).
// Convención del sistema: puntuación ALTA = zona MÁS SEGURA.
function clasificarZona(score) {
    if (score >= 8) return { nivel: 'segura',   label: 'Segura',       color: '#2ECC71', prioridad: 4, icono: 'fa-circle-check' };
    if (score >= 6) return { nivel: 'moderada', label: 'Moderada',     color: '#F39C12', prioridad: 3, icono: 'fa-triangle-exclamation' };
    if (score >= 4) return { nivel: 'riesgo',   label: 'En riesgo',    color: '#FF6B35', prioridad: 2, icono: 'fa-circle-exclamation' };
    if (score >= 2) return { nivel: 'peligrosa',label: 'Peligrosa',    color: '#E74C3C', prioridad: 1, icono: 'fa-circle-exclamation' };
    return                 { nivel: 'critica',  label: 'Crítica',      color: '#C0392B', prioridad: 0, icono: 'fa-radiation' };
}

// Medidor semicircular (gauge) del índice de seguridad.
function gaugeSeguridad(score, color) {
    var pct = Math.max(0, Math.min(score / 10, 1));
    var largoArco = 219.9; // longitud del semicírculo r=70
    var offset = largoArco * (1 - pct);
    return '' +
        '<svg class="riesgo-gauge" viewBox="0 0 180 104" role="img" aria-label="Índice de seguridad ' + score.toFixed(1) + ' sobre 10">' +
            '<path d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="#E4E9F0" stroke-width="13" stroke-linecap="round"/>' +
            '<path class="riesgo-gauge-fill" d="M 20 90 A 70 70 0 0 1 160 90" fill="none" stroke="' + color + '" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + largoArco + '" stroke-dashoffset="' + offset + '"/>' +
        '</svg>';
}

// ==========================================================
// DATOS DEL PERFIL DE RIESGO (compartidos con el Plan de Acción)
// ==========================================================

var _riesgoCache = { datos: null, timestamp: 0 };
var RIESGO_CACHE_TTL = 120000; // 2 min
var RIESGO_CACHE_KEY = 'klasplus_riesgo_cache';

// Evita que dos llamadas simultáneas (por ejemplo la precarga y el clic del
// usuario) disparen dos veces las mismas consultas de red.
var _riesgoEnCurso = null;

// El caché se guarda en sessionStorage para que al volver a entrar a la
// sección, o al navegar entre pantallas, los datos aparezcan al instante.
function leerCachePersistente() {
    try {
        var crudo = sessionStorage.getItem(RIESGO_CACHE_KEY);
        if (!crudo) return null;
        var guardado = JSON.parse(crudo);
        if (!guardado || !guardado.datos) return null;
        if (Date.now() - guardado.timestamp > RIESGO_CACHE_TTL) return null;
        return guardado;
    } catch (e) {
        return null;
    }
}

function guardarCachePersistente(datos, timestamp) {
    try {
        sessionStorage.setItem(RIESGO_CACHE_KEY, JSON.stringify({ datos: datos, timestamp: timestamp }));
    } catch (e) {
        // sessionStorage lleno o deshabilitado: el caché en memoria sigue sirviendo.
    }
}

function obtenerDatosRiesgo() {
    var ahora = Date.now();

    // 1) Caché en memoria
    if (_riesgoCache.datos && (ahora - _riesgoCache.timestamp) < RIESGO_CACHE_TTL) {
        return Promise.resolve(_riesgoCache.datos);
    }

    // 2) Caché de la sesión (sobrevive a cambios de pantalla)
    var persistente = leerCachePersistente();
    if (persistente) {
        _riesgoCache.datos = persistente.datos;
        _riesgoCache.timestamp = persistente.timestamp;
        return Promise.resolve(persistente.datos);
    }

    // 3) Si ya hay una consulta en vuelo, se reutiliza
    if (_riesgoEnCurso) return _riesgoEnCurso;

    _riesgoEnCurso = cargarDatosRiesgo().finally(function() {
        _riesgoEnCurso = null;
    });
    return _riesgoEnCurso;
}

async function cargarDatosRiesgo() {
    var ahora = Date.now();

    var nombreInst = localStorage.getItem('userInstitutionName') || '';
    var institucionId = localStorage.getItem('userInstitution') || 'default';

    var datos = {
        nombreInst: '',
        zonas: [],
        zonasEvaluadas: 0,
        zonasSeguras: 0,
        scorePromedio: 0,
        misionesCompletadas: 0,
        puntosTotal: 0,
        totalFotos: 0,
        error: false
    };

    try {
        // Se lee por la API REST de Firestore en lugar del SDK: el SDK abre un
        // canal de streaming (WebChannel) que en varios entornos queda
        // bloqueado y falla con "client is offline" pese a haber conexión.
        const { restObtenerDoc, restConsultar } = await import('../js/firestore-rest.js');

        var uid = localStorage.getItem('userId');
        var necesitaNombreInst = !nombreInst || nombreInst === 'default';

        // Las 3 lecturas son independientes: se piden en paralelo para no
        // sumar sus tiempos de red.
        var resultados = await Promise.all([
            necesitaNombreInst && uid ? restObtenerDoc('usuarios/' + uid) : Promise.resolve(null),
            restConsultar('zonas_institucion', 'institucionId', institucionId),
            uid ? restObtenerDoc('progreso_usuario/' + uid) : Promise.resolve(null)
        ]);

        var userDoc = resultados[0];
        var zonas = resultados[1] || [];
        var progreso = resultados[2];

        if (userDoc && userDoc.institucionNombre) {
            nombreInst = userDoc.institucionNombre;
            localStorage.setItem('userInstitutionName', nombreInst);
        }

        var totalScore = 0;
        zonas.forEach(function(data) {
            var score = typeof data.puntuacionPeligro === 'number' ? data.puntuacionPeligro : 5;
            datos.zonasEvaluadas++;
            totalScore += score;
            if (score >= 7) datos.zonasSeguras++;
            datos.totalFotos += (data.totalFotos || 0);
            datos.zonas.push({
                nombre: data.nombre || data.slug || 'Zona sin nombre',
                slug: data.slug || '',
                score: score,
                fotos: data.totalFotos || 0,
                recomendaciones: Array.isArray(data.recomendaciones) ? data.recomendaciones : []
            });
        });

        datos.scorePromedio = datos.zonasEvaluadas > 0 ? (totalScore / datos.zonasEvaluadas) : 0;

        if (progreso) {
            datos.misionesCompletadas = (progreso.nivelesCompletados || []).length;
            datos.puntosTotal = progreso.puntosKlasplus || 0;
        }
    } catch(e) {
        if (e && e.name === 'AbortError') {
            console.warn('Perfil de riesgo: la consulta excedió el tiempo límite.');
        } else {
            console.error('Error cargando perfil de riesgo:', e);
        }
        datos.error = true;
    }

    datos.nombreInst = nombreInst || 'Mi Institución';
    datos.zonas.sort(function(a, b) { return a.score - b.score; });

    // Solo se cachea un resultado válido. Cachear un fallo dejaría al
    // usuario viendo datos vacíos durante todo el TTL aunque la conexión
    // se restablezca de inmediato.
    if (!datos.error) {
        _riesgoCache.datos = datos;
        _riesgoCache.timestamp = ahora;
        guardarCachePersistente(datos, ahora);
    }
    return datos;
}

// Bloque de error de conexión, con botón para reintentar.
function bloqueErrorConexion(idReintento) {
    return '' +
        '<div class="panel-error">' +
            '<div class="panel-error-icono"><i class="fa-solid fa-cloud-arrow-down"></i></div>' +
            '<p class="panel-error-titulo">No se pudo cargar la información</p>' +
            '<p class="panel-error-texto">No hay conexión con el servidor en este momento. ' +
            'Revisa tu conexión a internet e intenta de nuevo.</p>' +
            '<button type="button" class="panel-error-btn" id="' + idReintento + '">' +
                '<i class="fa-solid fa-rotate-right"></i> Reintentar' +
            '</button>' +
        '</div>';
}

// ==========================================================
// PERFIL DE RIESGO
// ==========================================================

document.getElementById('editarPerfilBtn').addEventListener('click', () => {
    togglePanelPerfil('perfilRiesgoPanel', renderPerfilRiesgo);
});

async function renderPerfilRiesgo() {
    var contenedor = document.getElementById('perfilRiesgoContent');
    contenedor.innerHTML = '<div class="panel-cargando"><i class="fa-solid fa-spinner fa-spin"></i><span>Generando informe de seguridad...</span></div>';

    var datos = await obtenerDatosRiesgo();

    // Si falló la conexión no se puede afirmar que no haya zonas: se
    // muestra el error real con opción de reintentar.
    if (datos.error) {
        contenedor.innerHTML = bloqueErrorConexion('reintentarRiesgoBtn');
        var btnR = document.getElementById('reintentarRiesgoBtn');
        if (btnR) btnR.addEventListener('click', renderPerfilRiesgo);
        return;
    }

    var scoreNum = datos.scorePromedio;
    var sinDatos = datos.zonasEvaluadas === 0;
    // Sin zonas evaluadas el índice no es "crítico", simplemente no hay datos.
    var clase = sinDatos
        ? { nivel: 'sindatos', label: 'Sin datos', color: '#8C9AAD', icono: 'fa-circle-question' }
        : clasificarZona(scoreNum);
    var cobertura = Math.round((datos.zonasEvaluadas / TOTAL_ZONAS_INSTITUCION) * 100);

    // Distribución por nivel de riesgo
    var dist = { segura: 0, moderada: 0, riesgo: 0, peligrosa: 0, critica: 0 };
    datos.zonas.forEach(function(z) { dist[clasificarZona(z.score).nivel]++; });

    var fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    // --- Encabezado tipo informe técnico ---
    var html = barraAcciones() +
        '<div class="informe-header">' +
            '<div class="informe-header-top">' +
                '<div class="informe-sello"><i class="fa-solid fa-shield-halved"></i></div>' +
                '<div class="informe-titulos">' +
                    '<span class="informe-eyebrow">Informe de diagnóstico</span>' +
                    '<h3 class="informe-titulo">Perfil de Riesgo</h3>' +
                '</div>' +
            '</div>' +
            '<div class="informe-inst">' +
                '<i class="fa-solid fa-building-columns"></i>' +
                '<span>' + escapeHTML(datos.nombreInst) + '</span>' +
            '</div>' +
            '<div class="informe-meta">' +
                '<span><i class="fa-regular fa-calendar"></i> ' + fecha + '</span>' +
                '<span class="informe-meta-sep"></span>' +
                '<span><i class="fa-solid fa-scale-balanced"></i> Ley 1523 de 2012</span>' +
            '</div>' +
        '</div>';

    // --- Índice de seguridad con gauge ---
    html += '' +
        '<div class="informe-card informe-indice">' +
            '<div class="informe-card-head">' +
                '<span class="informe-card-label">Índice de seguridad institucional</span>' +
            '</div>' +
            '<div class="riesgo-gauge-wrap">' +
                gaugeSeguridad(scoreNum, clase.color) +
                '<div class="riesgo-gauge-centro">' +
                    '<span class="riesgo-gauge-valor">' + scoreNum.toFixed(1) + '</span>' +
                    '<span class="riesgo-gauge-total">/ 10</span>' +
                '</div>' +
            '</div>' +
            '<div class="riesgo-estado-chip" style="background:' + clase.color + '1A;color:' + clase.color + ';border-color:' + clase.color + '40;">' +
                '<i class="fa-solid ' + clase.icono + '"></i> ' + (sinDatos ? 'Sin datos suficientes' : 'Clasificación: ' + clase.label) +
            '</div>' +
            '<p class="riesgo-indice-nota">' + textoDiagnostico(clase.nivel, datos.zonasEvaluadas) + '</p>' +
        '</div>';

    // --- Indicadores clave ---
    html += '' +
        '<div class="informe-kpis">' +
            kpiCard('fa-map-location-dot', datos.zonasEvaluadas + '<small>/' + TOTAL_ZONAS_INSTITUCION + '</small>', 'Zonas evaluadas', '#0047B3') +
            kpiCard('fa-circle-check', String(datos.zonasSeguras), 'Zonas seguras', '#2ECC71') +
            kpiCard('fa-camera', String(datos.totalFotos), 'Evidencias', '#FF6B35') +
        '</div>';

    // --- Cobertura del diagnóstico ---
    html += '' +
        '<div class="informe-card">' +
            '<div class="informe-card-head">' +
                '<span class="informe-card-titulo"><i class="fa-solid fa-chart-simple"></i> Cobertura del diagnóstico</span>' +
                '<span class="informe-card-valor">' + cobertura + '%</span>' +
            '</div>' +
            '<div class="informe-progress"><div class="informe-progress-fill" style="width:' + cobertura + '%;"></div></div>' +
            '<p class="informe-card-pie">' + datos.zonasEvaluadas + ' de ' + TOTAL_ZONAS_INSTITUCION + ' zonas con evidencia registrada por la brigada.</p>' +
        '</div>';

    // --- Mapa de zonas ---
    html += '' +
        '<div class="informe-card">' +
            '<div class="informe-card-head">' +
                '<span class="informe-card-titulo"><i class="fa-solid fa-layer-group"></i> Mapa de zonas</span>' +
                '<span class="informe-card-sub">Ordenadas por criticidad</span>' +
            '</div>';

    if (datos.zonas.length > 0) {
        html += '<div class="informe-dist">' + barraDistribucion(dist, datos.zonas.length) + '</div>';
        html += '<div class="zona-lista">';
        datos.zonas.forEach(function(z, i) {
            var c = clasificarZona(z.score);
            var pct = Math.min(z.score * 10, 100);
            html += '' +
                '<div class="zona-fila" style="--zona-color:' + c.color + ';">' +
                    '<div class="zona-fila-top">' +
                        '<div class="zona-fila-nombre">' +
                            '<span class="zona-indice">' + (i + 1) + '</span>' +
                            '<span class="zona-nombre">' + escapeHTML(z.nombre) + '</span>' +
                        '</div>' +
                        '<span class="zona-score">' + z.score.toFixed(1) + '</span>' +
                    '</div>' +
                    '<div class="zona-barra"><div class="zona-barra-fill" style="width:' + pct + '%;"></div></div>' +
                    '<div class="zona-fila-pie">' +
                        '<span class="zona-badge"><i class="fa-solid ' + c.icono + '"></i> ' + c.label + '</span>' +
                        '<span class="zona-fotos"><i class="fa-solid fa-camera"></i> ' + z.fotos + ' evidencia' + (z.fotos === 1 ? '' : 's') + '</span>' +
                    '</div>' +
                '</div>';
        });
        html += '</div>';

        // Leyenda
        html += '' +
            '<div class="zona-leyenda">' +
                leyendaItem('#2ECC71', 'Segura 8-10') +
                leyendaItem('#F39C12', 'Moderada 6-8') +
                leyendaItem('#FF6B35', 'Riesgo 4-6') +
                leyendaItem('#E74C3C', 'Peligrosa 2-4') +
                leyendaItem('#C0392B', 'Crítica 0-2') +
            '</div>';

        html += '<a class="informe-link-mapa" href="mapa-peligro.html"><i class="fa-solid fa-map-location-dot"></i> Ver mapa de peligro completo <i class="fa-solid fa-arrow-right"></i></a>';
    } else {
        html += '' +
            '<div class="informe-vacio">' +
                '<i class="fa-solid fa-map-location-dot"></i>' +
                '<p class="informe-vacio-titulo">Sin zonas evaluadas</p>' +
                '<p class="informe-vacio-texto">Completa misiones de la brigada para documentar las zonas y generar el diagnóstico.</p>' +
                '<a class="informe-vacio-btn" href="niveles-brigada.html">Ir a misiones</a>' +
            '</div>';
    }
    html += '</div>';

    // --- Aporte del brigadista ---
    html += '' +
        '<div class="informe-card informe-aporte">' +
            '<div class="informe-card-head">' +
                '<span class="informe-card-titulo"><i class="fa-solid fa-user-shield"></i> Tu aporte</span>' +
            '</div>' +
            '<div class="aporte-grid">' +
                '<div class="aporte-item"><span class="aporte-num">' + datos.misionesCompletadas + '</span><span class="aporte-label">Misiones completadas</span></div>' +
                '<div class="aporte-item"><span class="aporte-num">' + datos.puntosTotal + '</span><span class="aporte-label">Puntos Klasplus</span></div>' +
            '</div>' +
        '</div>';

    // --- CTA al plan de acción ---
    html += '' +
        '<button class="informe-cta" id="irAlPlanBtn">' +
            '<div class="informe-cta-icono"><i class="fa-solid fa-clipboard-list"></i></div>' +
            '<div class="informe-cta-texto">' +
                '<span class="informe-cta-titulo">Ver Plan de Acción</span>' +
                '<span class="informe-cta-sub">Qué hacer para mejorar estos resultados</span>' +
            '</div>' +
            '<i class="fa-solid fa-chevron-right"></i>' +
        '</button>';

    // Documento formal que reemplaza la vista de pantalla al imprimir.
    html += documentoImpresionRiesgo(datos, clase, cobertura, sinDatos);

    contenedor.innerHTML = html;
    activarBotonImprimir(contenedor, 'Perfil de Riesgo - ' + datos.nombreInst);

    var ctaBtn = document.getElementById('irAlPlanBtn');
    if (ctaBtn) {
        ctaBtn.addEventListener('click', function() {
            togglePanelPerfil('planAccionPanel', renderPlanAccion);
        });
    }
}

// Barra con el botón de exportar. Usa el diálogo de impresión del navegador,
// que en todas las plataformas permite "Guardar como PDF".
function barraAcciones() {
    return '' +
        '<div class="informe-acciones">' +
            '<button type="button" class="informe-btn-pdf" data-imprimir>' +
                '<i class="fa-solid fa-file-pdf"></i> Guardar en PDF' +
            '</button>' +
        '</div>';
}

// Antes de imprimir, expande todos los pasos para que nada quede oculto.
// El título del documento define el nombre sugerido del PDF.
function activarBotonImprimir(contenedor, nombreDoc) {
    var btn = contenedor.querySelector('[data-imprimir]');
    if (!btn) return;

    btn.addEventListener('click', function() {
        contenedor.querySelectorAll('[data-paso]').forEach(function(paso) {
            paso.classList.add('abierto');
            var head = paso.querySelector('.plan-paso-head');
            if (head) head.setAttribute('aria-expanded', 'true');
        });

        var tituloOriginal = document.title;
        if (nombreDoc) document.title = nombreDoc;

        function restaurar() {
            document.title = tituloOriginal;
            window.removeEventListener('afterprint', restaurar);
        }
        window.addEventListener('afterprint', restaurar);

        window.print();

        // Respaldo por si el navegador no dispara afterprint.
        setTimeout(restaurar, 1500);
    });
}

// Versión formal del Perfil de Riesgo, visible únicamente al imprimir.
// En pantalla se mantiene la vista con gauge y tarjetas; en PDF se emite
// un informe técnico con tablas y espacio para firmas.
function documentoImpresionRiesgo(datos, clase, cobertura, sinDatos) {
    var fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    var indice = sinDatos ? 'Sin datos' : datos.scorePromedio.toFixed(1) + ' / 10';

    // Filas del inventario de zonas
    var filasZonas = '';
    if (datos.zonas.length > 0) {
        datos.zonas.forEach(function(z, i) {
            var c = clasificarZona(z.score);
            filasZonas += '' +
                '<tr>' +
                    '<td class="doc-c">' + (i + 1) + '</td>' +
                    '<td>' + escapeHTML(z.nombre) + '</td>' +
                    '<td class="doc-c doc-num">' + z.score.toFixed(1) + '</td>' +
                    '<td>' + c.label + '</td>' +
                    '<td class="doc-c doc-num">' + z.fotos + '</td>' +
                '</tr>';
        });
    } else {
        filasZonas = '<tr><td colspan="5" class="doc-c doc-vacio">Sin zonas evaluadas al momento de la emisión.</td></tr>';
    }

    var escala = [
        ['8.0 – 10.0', 'Segura',    'Condiciones adecuadas. Mantenimiento preventivo.'],
        ['6.0 – 7.9',  'Moderada',  'Condiciones mejorables. Intervención programada.'],
        ['4.0 – 5.9',  'En riesgo', 'Condiciones inseguras. Intervención de corto plazo.'],
        ['2.0 – 3.9',  'Peligrosa', 'Riesgo relevante. Acción prioritaria.'],
        ['0.0 – 1.9',  'Crítica',   'Intervención inmediata y reporte a autoridades.']
    ];
    var filasEscala = escala.map(function(e) {
        return '<tr><td class="doc-c doc-num">' + e[0] + '</td><td>' + e[1] + '</td><td>' + e[2] + '</td></tr>';
    }).join('');

    return '' +
    '<div class="doc-print" aria-hidden="true">' +
        '<header class="doc-cab">' +
            '<div class="doc-cab-marca">' +
                '<span class="doc-cab-logo">KLASPLUS</span>' +
                '<span class="doc-cab-sub">Sistema de gestión de seguridad escolar</span>' +
            '</div>' +
            '<div class="doc-cab-tipo">' +
                '<span>Informe técnico</span>' +
                '<strong>PERFIL DE RIESGO</strong>' +
            '</div>' +
        '</header>' +

        '<table class="doc-ficha">' +
            '<tbody>' +
                '<tr>' +
                    '<th>Institución educativa</th><td colspan="3">' + escapeHTML(datos.nombreInst) + '</td>' +
                '</tr>' +
                '<tr>' +
                    '<th>Fecha de emisión</th><td>' + fecha + '</td>' +
                    '<th>Marco normativo</th><td>Ley 1523 de 2012 · PEGIR</td>' +
                '</tr>' +
                '<tr>' +
                    '<th>Índice de seguridad</th><td class="doc-num doc-destacado">' + indice + '</td>' +
                    '<th>Clasificación</th><td class="doc-destacado">' + clase.label + '</td>' +
                '</tr>' +
            '</tbody>' +
        '</table>' +

        '<h5 class="doc-titulo-sec">1. Resumen de indicadores</h5>' +
        '<table class="doc-tabla">' +
            '<tbody>' +
                '<tr><th>Zonas evaluadas</th><td class="doc-num">' + datos.zonasEvaluadas + ' de ' + TOTAL_ZONAS_INSTITUCION + '</td></tr>' +
                '<tr><th>Cobertura del diagnóstico</th><td class="doc-num">' + cobertura + ' %</td></tr>' +
                '<tr><th>Zonas en condición segura</th><td class="doc-num">' + datos.zonasSeguras + '</td></tr>' +
                '<tr><th>Zonas que requieren intervención</th><td class="doc-num">' + datos.zonas.filter(function(z) { return z.score < 8; }).length + '</td></tr>' +
                '<tr><th>Evidencias fotográficas registradas</th><td class="doc-num">' + datos.totalFotos + '</td></tr>' +
            '</tbody>' +
        '</table>' +

        '<h5 class="doc-titulo-sec">2. Inventario de zonas evaluadas</h5>' +
        '<table class="doc-tabla doc-tabla-zonas">' +
            '<thead>' +
                '<tr>' +
                    '<th class="doc-c">N°</th>' +
                    '<th>Zona</th>' +
                    '<th class="doc-c">Puntuación</th>' +
                    '<th>Clasificación</th>' +
                    '<th class="doc-c">Evidencias</th>' +
                '</tr>' +
            '</thead>' +
            '<tbody>' + filasZonas + '</tbody>' +
        '</table>' +
        '<p class="doc-nota-tabla">Zonas ordenadas de menor a mayor puntuación de seguridad.</p>' +

        '<h5 class="doc-titulo-sec">3. Observaciones del diagnóstico</h5>' +
        '<p class="doc-parrafo">' + textoDiagnostico(clase.nivel, datos.zonasEvaluadas) + '</p>' +

        '<h5 class="doc-titulo-sec">4. Escala de valoración aplicada</h5>' +
        '<table class="doc-tabla doc-tabla-escala">' +
            '<thead><tr><th class="doc-c">Rango</th><th>Clasificación</th><th>Criterio de actuación</th></tr></thead>' +
            '<tbody>' + filasEscala + '</tbody>' +
        '</table>' +

        '<div class="doc-firmas">' +
            '<div class="doc-firma"><span class="doc-firma-linea"></span><p>Responsable de la brigada escolar</p></div>' +
            '<div class="doc-firma"><span class="doc-firma-linea"></span><p>Rector / Coordinador</p></div>' +
        '</div>' +

        '<footer class="doc-pie">' +
            'Documento generado automáticamente por Klasplus a partir de la evidencia registrada por la brigada escolar. ' +
            'Constituye un instrumento de priorización y no reemplaza la inspección técnica profesional ni el concepto de las autoridades competentes.' +
        '</footer>' +
    '</div>';
}

function kpiCard(icono, valor, label, color) {
    return '' +
        '<div class="informe-kpi">' +
            '<i class="fa-solid ' + icono + '" style="color:' + color + ';"></i>' +
            '<span class="informe-kpi-num">' + valor + '</span>' +
            '<span class="informe-kpi-label">' + label + '</span>' +
        '</div>';
}

function leyendaItem(color, texto) {
    return '<span class="leyenda-item"><i style="background:' + color + ';"></i>' + texto + '</span>';
}

function barraDistribucion(dist, total) {
    if (total === 0) return '';
    var segmentos = [
        { n: dist.segura,    color: '#2ECC71' },
        { n: dist.moderada,  color: '#F39C12' },
        { n: dist.riesgo,    color: '#FF6B35' },
        { n: dist.peligrosa, color: '#E74C3C' },
        { n: dist.critica,   color: '#C0392B' }
    ];
    var barra = '<div class="dist-barra">';
    segmentos.forEach(function(s) {
        if (s.n > 0) {
            barra += '<span style="width:' + ((s.n / total) * 100) + '%;background:' + s.color + ';" title="' + s.n + ' zona(s)"></span>';
        }
    });
    barra += '</div>';
    return barra;
}

function textoDiagnostico(nivel, zonasEvaluadas) {
    if (zonasEvaluadas === 0) return 'Aún no hay evidencia suficiente para calcular el índice. Documenta las zonas desde las misiones de la brigada.';
    if (nivel === 'segura')    return 'La institución mantiene condiciones adecuadas. El foco debe ser sostener los controles y la revisión periódica.';
    if (nivel === 'moderada')  return 'Existen condiciones mejorables. Se recomienda intervenir las zonas señaladas antes de que escalen a riesgo alto.';
    if (nivel === 'riesgo')    return 'Se identificaron condiciones inseguras que requieren intervención planificada en el corto plazo.';
    if (nivel === 'peligrosa') return 'El diagnóstico evidencia riesgos relevantes para la comunidad educativa. Se requiere acción prioritaria.';
    return 'Condición crítica: se requiere intervención inmediata y notificación a las autoridades competentes.';
}

// Botón de clasificación Klasplus
document.getElementById('clasificacionBtn').addEventListener('click', () => {
    togglePanelPerfil('clasificacionPanel', renderClasificacion);
});

// Muestra/oculta un panel del perfil, cerrando siempre los demás.
var PANELES_PERFIL = ['perfilRiesgoPanel', 'planAccionPanel', 'clasificacionPanel'];

function togglePanelPerfil(panelId, renderFn) {
    var panel = document.getElementById(panelId);
    var opciones = document.querySelector('.profile-options');
    var fotoSeccion = document.querySelector('.profile-photo-section');
    var estabaVisible = panel.style.display === 'block';

    PANELES_PERFIL.forEach(function(id) {
        var p = document.getElementById(id);
        if (p) p.style.display = 'none';
    });

    if (estabaVisible) {
        opciones.style.display = 'flex';
        if (fotoSeccion) fotoSeccion.style.display = 'flex';
        return;
    }

    panel.style.display = 'block';
    opciones.style.display = 'none';
    // Dentro de una sección la foto de perfil no aporta, se oculta.
    if (fotoSeccion) fotoSeccion.style.display = 'none';
    // Se remide el header por si cambió de alto (fuentes, rotación).
    sincronizarAlturaHeader();
    if (typeof renderFn === 'function') renderFn();
}

// Cache en memoria de la clasificación: evita volver a descargar toda la
// colección "zonas_institucion" cada vez que el usuario abre/cierra el panel.
// Se refresca solo si pasaron más de 60s desde la última carga.
var _clasificacionCache = { ranking: null, timestamp: 0 };
var CLASIFICACION_CACHE_TTL = 60000; // 60s

// Clasificación basada en instituciones reales registradas en Firebase
async function renderClasificacion() {
    var nombreInstitucion = localStorage.getItem('userInstitutionName') || '';

    // Si no tenemos el nombre, intentar cargarlo de Firebase
    if (!nombreInstitucion || nombreInstitucion === 'default') {
        try {
            const { restObtenerDoc } = await import('../js/firestore-rest.js');
            var uid = localStorage.getItem('userId');
            if (uid) {
                var uData = await restObtenerDoc('usuarios/' + uid);
                if (uData) {
                    nombreInstitucion = uData.institucionNombre || '';
                    localStorage.setItem('userInstitution', uData.institucionId || 'default');
                    localStorage.setItem('userInstitutionName', nombreInstitucion);
                }
            }
        } catch(e) { console.error(e); }
    }
    if (!nombreInstitucion) nombreInstitucion = 'Mi Institución';

    // Cargar todas las instituciones que tienen zonas registradas en Firebase.
    // Se usa una caché en memoria (ver CLASIFICACION_CACHE_TTL) para no repetir
    // esta descarga completa cada vez que el usuario abre el panel.
    var ranking = [];
    var ahora = Date.now();
    if (_clasificacionCache.ranking && (ahora - _clasificacionCache.timestamp) < CLASIFICACION_CACHE_TTL) {
        // Copia superficial para no mutar la caché con esMia/nombre en cada render
        ranking = _clasificacionCache.ranking.map(function(inst) { return Object.assign({}, inst); });
    } else {
        try {
            const { restListarColeccion } = await import('../js/firestore-rest.js');
            const zonasTodas = await restListarColeccion('zonas_institucion');

            var instMap = {};
            zonasTodas.forEach(function(data) {
                var instId = data.institucionId || 'default';
                if (!instMap[instId]) {
                    instMap[instId] = { id: instId, nombre: data.institucionNombre || instId, zonas: 0, seguras: 0, totalScore: 0 };
                }
                instMap[instId].zonas++;
                instMap[instId].totalScore += (data.puntuacionPeligro || 5);
                if ((data.puntuacionPeligro || 5) >= 7) {
                    instMap[instId].seguras++;
                }
            });

            Object.values(instMap).forEach(function(inst) {
                inst.score = inst.zonas > 0 ? Math.round((inst.totalScore / inst.zonas) * 10) : 0;
                ranking.push(inst);
            });

            ranking.sort(function(a, b) { return b.score - a.score; });

            _clasificacionCache.ranking = ranking.map(function(inst) { return Object.assign({}, inst); });
            _clasificacionCache.timestamp = ahora;
        } catch(e) {
            console.error('Error cargando clasificación:', e);
        }
    }

    // Asegurar que la institución del usuario esté en el ranking
    var instUsuario = localStorage.getItem('userInstitution') || 'default';
    var encontrada = false;
    ranking.forEach(function(inst) {
        if (inst.id === instUsuario) {
            inst.esMia = true;
            inst.nombre = nombreInstitucion;
            encontrada = true;
        }
    });
    if (!encontrada) {
        ranking.push({ id: instUsuario, nombre: nombreInstitucion, zonas: 9, seguras: 3, score: 45, esMia: true });
        ranking.sort(function(a, b) { return b.score - a.score; });
    }

    // Rellenar hasta 10 posiciones con espacios vacíos
    while (ranking.length < 10) {
        ranking.push({ id: 'vacio_' + ranking.length, nombre: '—', zonas: 0, seguras: 0, score: 0, vacio: true });
    }

    // Mi institución
    var miInst = ranking.find(function(r) { return r.esMia; });
    var miPuesto = ranking.indexOf(miInst) + 1;
    var totalReales = ranking.filter(function(r) { return !r.vacio; }).length;

    // Render header con mi posición
    var scoreColor = miInst.score >= 80 ? '#4CAF50' : miInst.score >= 60 ? '#FF9800' : miInst.score >= 40 ? '#FF6B35' : '#FF5722';
    var scoreBar = Math.min(miInst.score, 100);

    document.getElementById('miInstitucionRank').innerHTML = '<div class="mi-rank-card"><div class="mi-rank-puesto"><span class="rank-numero">#' + miPuesto + '</span><span class="rank-de">de ' + totalReales + '</span></div><div class="mi-rank-info"><h4>' + miInst.nombre + '</h4><div class="mi-rank-stats"><span><i class="fa-solid fa-shield-halved"></i> Score: <strong>' + miInst.score + '</strong>/100</span><span><i class="fa-solid fa-check-circle"></i> ' + miInst.seguras + '/' + miInst.zonas + ' zonas seguras</span></div><div class="mi-rank-bar"><div class="mi-rank-bar-fill" style="width:' + scoreBar + '%;background:' + scoreColor + ';"></div></div></div></div>';

    // Lista completa (10 posiciones)
    var lista = document.getElementById('clasificacionLista');
    lista.innerHTML = '';

    ranking.forEach(function(inst, i) {
        var puesto = i + 1;
        var medalHTML = '';
        if (puesto === 1) medalHTML = '<div class="medal-circle gold"><i class="fa-solid fa-trophy"></i></div>';
        else if (puesto === 2) medalHTML = '<div class="medal-circle silver"><i class="fa-solid fa-medal"></i></div>';
        else if (puesto === 3) medalHTML = '<div class="medal-circle bronze"><i class="fa-solid fa-medal"></i></div>';
        else medalHTML = '<div class="medal-circle"><span>' + puesto + '</span></div>';

        var itemScoreColor = inst.score >= 80 ? '#4CAF50' : inst.score >= 60 ? '#FF9800' : inst.score >= 40 ? '#FF6B35' : inst.vacio ? '#ddd' : '#FF5722';

        var item = document.createElement('div');
        item.className = 'clasificacion-item' + (inst.esMia ? ' es-mia' : '') + (inst.vacio ? ' vacio' : '');

        if (inst.vacio) {
            item.innerHTML = '<div class="clasificacion-medal">' + medalHTML + '</div><div class="clasificacion-info"><span class="clasificacion-nombre vacio-text">Puesto disponible</span><span class="clasificacion-ciudad">Esperando institución...</span></div><div class="clasificacion-score" style="color:#ddd;">—</div>';
        } else {
            item.innerHTML = '<div class="clasificacion-medal">' + medalHTML + '</div><div class="clasificacion-info"><span class="clasificacion-nombre">' + inst.nombre + '</span><span class="clasificacion-ciudad"><i class="fa-solid fa-check-circle" style="color:#4CAF50;font-size:10px;"></i> ' + inst.seguras + '/' + inst.zonas + ' zonas seguras</span></div><div class="clasificacion-score" style="color:' + itemScoreColor + ';"><span>' + inst.score + '</span></div>';
        }
        lista.appendChild(item);
    });
}

// ==========================================================
// PLAN DE ACCIÓN
// Estructurado según los 3 procesos de la gestión del riesgo
// (Ley 1523 de 2012): conocimiento, reducción y manejo.
// Las medidas técnicas se apoyan en los lineamientos del PEGIR
// (MinEducación / UNGRD), la NTC 4595 (ambientes escolares) y
// la señalización de evacuación de la NSR-10.
// ==========================================================

document.getElementById('planAccionBtn').addEventListener('click', () => {
    togglePanelPerfil('planAccionPanel', renderPlanAccion);
});

// Catálogo de medidas correctivas por tipo de zona escolar.
var MEDIDAS_POR_ZONA = [
    {
        claves: ['baño', 'bano', 'sanitario', 'lavamanos'],
        medidas: [
            'Instalar señalización de piso mojado y superficie antideslizante en accesos.',
            'Reparar fugas, filtraciones y baldosas sueltas o fracturadas.',
            'Verificar iluminación y ventilación permanente del área.',
            'Asegurar dotación de jabón, papel y canecas con tapa.'
        ]
    },
    {
        claves: ['escalera', 'rampa', 'grada', 'peldaño'],
        medidas: [
            'Instalar cinta antideslizante y demarcar el borde de cada peldaño.',
            'Verificar pasamanos firmes y continuos a ambos lados.',
            'Garantizar iluminación de emergencia en la circulación vertical.',
            'Definir flujo de subida y bajada en cambios de clase para evitar aglomeración.'
        ]
    },
    {
        claves: ['salon', 'salón', 'aula', 'clase'],
        medidas: [
            'Mantener la ruta hacia la puerta libre de obstáculos.',
            'Anclar a muro estanterías, televisores y mobiliario alto.',
            'Revisar iluminación, ventilación y estado del mobiliario.',
            'Publicar la ruta de evacuación y el punto de encuentro del grupo.'
        ]
    },
    {
        claves: ['laboratorio', 'lab', 'quimica', 'química'],
        medidas: [
            'Verificar ducha de emergencia y lavaojos operativos.',
            'Almacenar reactivos en gabinete rotulado y con llave.',
            'Dotar extintor del tipo adecuado y elementos de protección personal.',
            'Publicar el protocolo de derrames y la hoja de seguridad de cada sustancia.'
        ]
    },
    {
        claves: ['cafeteria', 'cafetería', 'comedor', 'tienda', 'restaurante', 'cocina'],
        medidas: [
            'Verificar cadena de frío y almacenamiento de alimentos.',
            'Revisar instalación de gas, ventilación y extintor tipo K.',
            'Aplicar control de plagas y manejo de residuos con canecas tapadas.',
            'Exigir prácticas de manipulación de alimentos al personal.'
        ]
    },
    {
        claves: ['pasillo', 'corredor', 'circulacion', 'circulación', 'entrada', 'acceso', 'porteria', 'portería'],
        medidas: [
            'Mantener el ancho libre de evacuación sin obstáculos ni mobiliario.',
            'Instalar señalización fotoluminiscente de ruta de evacuación y salidas.',
            'Verificar que las puertas de salida abran en sentido de la evacuación.',
            'Garantizar iluminación de emergencia en todo el recorrido.'
        ]
    },
    {
        claves: ['patio', 'cancha', 'deportiv', 'gimnasio', 'zona verde', 'jardin', 'jardín'],
        medidas: [
            'Reparar fracturas y desniveles de la superficie de juego.',
            'Anclar arcos, tableros y estructuras deportivas.',
            'Demarcar el punto de encuentro de evacuación.',
            'Disponer zonas de sombra e hidratación para jornadas al aire libre.'
        ]
    },
    {
        claves: ['electric', 'eléctric', 'tablero', 'tecnolog', 'computo', 'cómputo', 'sistemas'],
        medidas: [
            'Rotular tableros eléctricos y mantenerlos cerrados y despejados.',
            'Eliminar multitomas en cadena y cableado expuesto.',
            'Verificar puesta a tierra y protecciones diferenciales.',
            'Programar revisión técnica de la instalación eléctrica.'
        ]
    },
    {
        claves: ['techo', 'cubierta', 'muro', 'pared', 'estructura', 'fachada', 'azotea', 'terraza'],
        medidas: [
            'Atender filtraciones y humedades activas.',
            'Asegurar tejas, cubiertas y elementos sueltos en altura.',
            'Documentar grietas y solicitar evaluación estructural profesional.',
            'Restringir el acceso a zonas con riesgo de desprendimiento.'
        ]
    }
];

var MEDIDAS_GENERICAS = [
    'Registrar y documentar las condiciones inseguras identificadas.',
    'Definir responsable y fecha de intervención para cada hallazgo.',
    'Señalizar el riesgo mientras se ejecuta la corrección.',
    'Reevaluar la zona con una nueva misión al finalizar la intervención.'
];

function medidasParaZona(nombreZona) {
    var nombre = String(nombreZona || '').toLowerCase();
    for (var i = 0; i < MEDIDAS_POR_ZONA.length; i++) {
        var grupo = MEDIDAS_POR_ZONA[i];
        for (var j = 0; j < grupo.claves.length; j++) {
            if (nombre.indexOf(grupo.claves[j]) !== -1) return grupo.medidas;
        }
    }
    return MEDIDAS_GENERICAS;
}

var PRIORIDADES = {
    critica:    { label: 'Inmediata',  color: '#C0392B', plazo: 'Ejecutar ya' },
    alta:       { label: 'Alta',       color: '#E74C3C', plazo: '30 días' },
    media:      { label: 'Media',      color: '#F39C12', plazo: '90 días' },
    preventiva: { label: 'Preventiva', color: '#0047B3', plazo: 'Permanente' }
};

function prioridadPorScore(score) {
    if (score < 2) return 'critica';
    if (score < 4) return 'critica';
    if (score < 6) return 'alta';
    if (score < 8) return 'media';
    return 'preventiva';
}

// Construye el plan de acción a partir del diagnóstico del perfil de riesgo.
function construirPlanAccion(datos) {
    var fases = [];

    // ---- FASE 1: Conocimiento del riesgo ----
    var pasos1 = [];
    var faltantes = TOTAL_ZONAS_INSTITUCION - datos.zonasEvaluadas;

    if (faltantes > 0) {
        pasos1.push({
            titulo: 'Completar el diagnóstico de zonas',
            prioridad: datos.zonasEvaluadas === 0 ? 'critica' : 'alta',
            descripcion: 'Faltan ' + faltantes + ' de ' + TOTAL_ZONAS_INSTITUCION + ' zonas por documentar. Sin diagnóstico completo no es posible priorizar correctamente la inversión en seguridad.',
            medidas: [
                'Asignar las zonas pendientes entre los brigadistas activos.',
                'Registrar evidencia fotográfica de cada zona faltante.',
                'Responder el cuestionario de contexto de cada zona.',
                'Verificar que toda zona quede con al menos una evidencia cargada.'
            ]
        });
    } else {
        pasos1.push({
            titulo: 'Mantener el diagnóstico actualizado',
            prioridad: 'preventiva',
            descripcion: 'Las ' + TOTAL_ZONAS_INSTITUCION + ' zonas están documentadas. El diagnóstico debe reevaluarse periódicamente para reflejar cambios reales.',
            medidas: [
                'Reevaluar cada zona al menos una vez por periodo académico.',
                'Repetir la evaluación después de cualquier obra o adecuación.',
                'Actualizar la evidencia cuando se corrija un hallazgo.'
            ]
        });
    }

    var zonasSinEvidencia = datos.zonas.filter(function(z) { return z.fotos === 0; });
    if (zonasSinEvidencia.length > 0) {
        pasos1.push({
            titulo: 'Reforzar la evidencia de ' + zonasSinEvidencia.length + ' zona(s)',
            prioridad: 'media',
            descripcion: 'Estas zonas tienen puntuación registrada pero sin respaldo fotográfico, lo que debilita la trazabilidad del diagnóstico.',
            medidas: zonasSinEvidencia.slice(0, 6).map(function(z) {
                return 'Cargar evidencia de: ' + z.nombre + '.';
            })
        });
    }

    pasos1.push({
        titulo: 'Consolidar y socializar la matriz de riesgos',
        prioridad: 'media',
        descripcion: 'El conocimiento del riesgo debe quedar documentado y comunicado a toda la comunidad educativa, no solo en la app.',
        medidas: [
            'Consolidar los hallazgos en la matriz de riesgos institucional.',
            'Presentar el diagnóstico al comité escolar de gestión del riesgo.',
            'Socializar los resultados con docentes, estudiantes y familias.',
            'Archivar el informe como soporte del PEGIR.'
        ]
    });

    fases.push({
        numero: 1,
        nombre: 'Conocimiento del riesgo',
        icono: 'fa-magnifying-glass-chart',
        marco: 'Ley 1523 · Proceso 1',
        objetivo: 'Identificar y documentar las condiciones de riesgo de la institución.',
        pasos: pasos1
    });

    // ---- FASE 2: Reducción del riesgo ----
    var pasos2 = [];
    var zonasIntervenir = datos.zonas.filter(function(z) { return z.score < 8; });

    zonasIntervenir.forEach(function(z) {
        var c = clasificarZona(z.score);
        var medidas = medidasParaZona(z.nombre).slice();
        // Si la IA ya generó recomendaciones para la zona, se priorizan.
        if (z.recomendaciones.length > 0) {
            medidas = z.recomendaciones.slice(0, 4).concat(medidas).slice(0, 6);
        }
        pasos2.push({
            titulo: z.nombre,
            prioridad: prioridadPorScore(z.score),
            etiquetaZona: c.label + ' · ' + z.score.toFixed(1) + '/10',
            descripcion: 'Zona clasificada como ' + c.label.toLowerCase() + '. Intervenir las condiciones que sostienen la puntuación baja.',
            medidas: medidas
        });
    });

    if (zonasIntervenir.length === 0) {
        pasos2.push({
            titulo: 'Sostener los controles existentes',
            prioridad: 'preventiva',
            descripcion: datos.zonasEvaluadas === 0
                ? 'Aún no hay zonas diagnosticadas. Completa la Fase 1 para generar acciones de reducción específicas.'
                : 'Ninguna zona requiere intervención correctiva. El esfuerzo se concentra en mantenimiento preventivo.',
            medidas: [
                'Programar mantenimiento preventivo periódico de las instalaciones.',
                'Verificar mensualmente señalización, iluminación y salidas.',
                'Atender de inmediato cualquier hallazgo nuevo reportado.'
            ]
        });
    }

    fases.push({
        numero: 2,
        nombre: 'Reducción del riesgo',
        icono: 'fa-screwdriver-wrench',
        marco: 'Ley 1523 · Proceso 2 · NTC 4595',
        objetivo: 'Intervenir las condiciones inseguras, priorizando las zonas más críticas.',
        pasos: pasos2
    });

    // ---- FASE 3: Manejo de la emergencia ----
    var pasos3 = [
        {
            titulo: 'Consolidar la brigada escolar',
            prioridad: 'alta',
            descripcion: 'La respuesta ante emergencias requiere roles definidos y personas entrenadas.',
            medidas: [
                'Conformar o actualizar la brigada con roles asignados por escrito.',
                'Definir líderes de evacuación por aula y por piso.',
                'Publicar el organigrama de la brigada en zonas visibles.',
                'Programar reuniones periódicas de seguimiento.'
            ]
        },
        {
            titulo: 'Plan de evacuación y simulacros',
            prioridad: 'alta',
            descripcion: 'El plan debe estar documentado, señalizado y probado con la comunidad educativa.',
            medidas: [
                'Definir rutas de evacuación y punto de encuentro por sede.',
                'Realizar al menos dos simulacros al año, uno sin previo aviso.',
                'Cronometrar y evaluar cada simulacro para corregir cuellos de botella.',
                'Incluir protocolo para personas con movilidad reducida.'
            ]
        },
        {
            titulo: 'Señalización y rutas de evacuación',
            prioridad: 'media',
            descripcion: 'La señalización debe ser visible, normalizada y libre de obstrucciones.',
            medidas: [
                'Instalar señalización de evacuación y salidas conforme a la norma vigente.',
                'Verificar que las circulaciones mantengan el ancho libre reglamentario.',
                'Garantizar iluminación de emergencia en rutas y escaleras.',
                'Publicar el plano de evacuación en cada piso.'
            ]
        },
        {
            titulo: 'Dotación para emergencias',
            prioridad: 'media',
            descripcion: 'Los equipos de respuesta deben existir, estar vigentes y ser accesibles.',
            medidas: [
                'Verificar extintores vigentes, señalizados y con acceso libre.',
                'Mantener botiquín dotado y camilla de inmovilización disponible.',
                'Comprobar el sistema de alarma y su audibilidad en toda la sede.',
                'Llevar registro de inspección y recarga de equipos.'
            ]
        },
        {
            titulo: 'Formación y articulación externa',
            prioridad: 'preventiva',
            descripcion: 'La capacidad de respuesta se sostiene con formación continua y apoyo institucional.',
            medidas: [
                'Capacitar a la brigada en primeros auxilios y uso de extintor.',
                'Mantener el directorio de emergencia visible (bomberos, ambulancia, policía).',
                'Articular con el consejo municipal de gestión del riesgo.',
                'Incluir la gestión del riesgo en el plan de estudios y en el PEGIR.'
            ]
        }
    ];

    fases.push({
        numero: 3,
        nombre: 'Manejo de la emergencia',
        icono: 'fa-tower-broadcast',
        marco: 'Ley 1523 · Proceso 3 · PEGIR',
        objetivo: 'Preparar a la comunidad educativa para responder ante una emergencia.',
        pasos: pasos3
    });

    return fases;
}

async function renderPlanAccion() {
    var contenedor = document.getElementById('planAccionContent');
    contenedor.innerHTML = '<div class="panel-cargando"><i class="fa-solid fa-spinner fa-spin"></i><span>Construyendo plan de acción...</span></div>';

    var datos = await obtenerDatosRiesgo();

    if (datos.error) {
        contenedor.innerHTML = bloqueErrorConexion('reintentarPlanBtn');
        var btnR = document.getElementById('reintentarPlanBtn');
        if (btnR) btnR.addEventListener('click', renderPlanAccion);
        return;
    }

    var fases = construirPlanAccion(datos);

    var totalAcciones = 0;
    var inmediatas = 0;
    fases.forEach(function(f) {
        f.pasos.forEach(function(p) {
            totalAcciones++;
            if (p.prioridad === 'critica') inmediatas++;
        });
    });

    var sinDatos = datos.zonasEvaluadas === 0;
    var clase = sinDatos
        ? { label: 'sin datos', color: '#8C9AAD' }
        : clasificarZona(datos.scorePromedio);
    var fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

    // --- Encabezado ---
    var html = barraAcciones() +
        '<div class="informe-header plan-header">' +
            '<div class="informe-header-top">' +
                '<div class="informe-sello plan-sello"><i class="fa-solid fa-clipboard-list"></i></div>' +
                '<div class="informe-titulos">' +
                    '<span class="informe-eyebrow">Ruta de mejora</span>' +
                    '<h3 class="informe-titulo">Plan de Acción</h3>' +
                '</div>' +
            '</div>' +
            '<div class="informe-inst">' +
                '<i class="fa-solid fa-building-columns"></i>' +
                '<span>' + escapeHTML(datos.nombreInst) + '</span>' +
            '</div>' +
            '<div class="informe-meta">' +
                '<span><i class="fa-regular fa-calendar"></i> ' + fecha + '</span>' +
                '<span class="informe-meta-sep"></span>' +
                '<span><i class="fa-solid fa-scale-balanced"></i> Ley 1523 · PEGIR</span>' +
            '</div>' +
        '</div>';

    // --- Resumen ejecutivo ---
    html += '' +
        '<div class="informe-card plan-resumen">' +
            '<div class="informe-card-head">' +
                '<span class="informe-card-titulo"><i class="fa-solid fa-list-check"></i> Resumen ejecutivo</span>' +
            '</div>' +
            '<p class="plan-resumen-texto">' +
                (sinDatos
                    ? 'Aún no hay zonas diagnosticadas, por lo que este plan parte del <strong>levantamiento inicial de información</strong>. ' +
                      'Se definen <strong>' + totalAcciones + ' acciones</strong> organizadas en las tres fases de la gestión del riesgo.'
                    : 'Con un índice de seguridad de <strong style="color:' + clase.color + ';">' + datos.scorePromedio.toFixed(1) + '/10 (' + clase.label + ')</strong> ' +
                      'y ' + datos.zonasEvaluadas + ' de ' + TOTAL_ZONAS_INSTITUCION + ' zonas diagnosticadas, ' +
                      'el plan define <strong>' + totalAcciones + ' acciones</strong> organizadas en las tres fases de la gestión del riesgo.') +
            '</p>' +
            '<div class="plan-resumen-kpis">' +
                '<div class="plan-rk"><span class="plan-rk-num" style="color:#C0392B;">' + inmediatas + '</span><span class="plan-rk-label">Inmediatas</span></div>' +
                '<div class="plan-rk"><span class="plan-rk-num" style="color:#FF6B35;">' + datos.zonas.filter(function(z){ return z.score < 8; }).length + '</span><span class="plan-rk-label">Zonas a intervenir</span></div>' +
                '<div class="plan-rk"><span class="plan-rk-num" style="color:#0047B3;">' + totalAcciones + '</span><span class="plan-rk-label">Acciones totales</span></div>' +
            '</div>' +
        '</div>';

    // --- Documento unificado con las 3 etapas ---
    html += '<div class="plan-doc">';

    fases.forEach(function(fase) {
        html += '' +
            '<section class="plan-etapa">' +
                '<div class="plan-etapa-num">' + fase.numero + '</div>' +
                '<div class="plan-etapa-head">' +
                    '<span class="plan-etapa-marco">' + fase.marco + '</span>' +
                    '<h4 class="plan-etapa-nombre"><i class="fa-solid ' + fase.icono + '"></i> ' + fase.nombre + '</h4>' +
                    '<p class="plan-etapa-objetivo">' + fase.objetivo + '</p>' +
                '</div>' +
                '<div class="plan-pasos">';

        fase.pasos.forEach(function(paso, idx) {
            var pr = PRIORIDADES[paso.prioridad] || PRIORIDADES.media;
            var medidasHTML = paso.medidas.map(function(m) {
                return '<li>' + escapeHTML(m) + '</li>';
            }).join('');

            html += '' +
                '<div class="plan-paso" data-paso>' +
                    '<button class="plan-paso-head" type="button" aria-expanded="false">' +
                        '<span class="plan-paso-orden">' + fase.numero + '.' + (idx + 1) + '</span>' +
                        '<span class="plan-paso-titulos">' +
                            '<span class="plan-paso-titulo">' + escapeHTML(paso.titulo) + '</span>' +
                            (paso.etiquetaZona ? '<span class="plan-paso-zona">' + escapeHTML(paso.etiquetaZona) + '</span>' : '') +
                        '</span>' +
                        '<span class="plan-chip" style="background:' + pr.color + '1A;color:' + pr.color + ';border-color:' + pr.color + '40;">' + pr.label + '</span>' +
                        '<i class="fa-solid fa-chevron-down plan-paso-flecha"></i>' +
                    '</button>' +
                    '<div class="plan-paso-cuerpo">' +
                        '<p class="plan-paso-desc">' + escapeHTML(paso.descripcion) + '</p>' +
                        '<div class="plan-paso-plazo"><i class="fa-regular fa-clock"></i> Plazo sugerido: <strong>' + pr.plazo + '</strong></div>' +
                        '<ul class="plan-medidas">' + medidasHTML + '</ul>' +
                    '</div>' +
                '</div>';
        });

        html += '</div></section>';
    });

    html += '</div>'; // cierra .plan-doc

    // --- Nota de cierre ---
    html += '' +
        '<div class="plan-nota">' +
            '<i class="fa-solid fa-circle-info"></i>' +
            '<p>Este plan se genera automáticamente a partir del diagnóstico registrado por la brigada. ' +
            'Es una guía de priorización y no reemplaza la inspección técnica profesional ni el concepto de las autoridades competentes.</p>' +
        '</div>';

    contenedor.innerHTML = html;
    activarBotonImprimir(contenedor, 'Plan de Accion - ' + datos.nombreInst);

    // Acordeón de pasos
    contenedor.querySelectorAll('.plan-paso-head').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var paso = btn.closest('[data-paso]');
            var abierto = paso.classList.toggle('abierto');
            btn.setAttribute('aria-expanded', abierto ? 'true' : 'false');
        });
    });
}

// Botón de cerrar sesión
document.getElementById('cerrarSesionBtn').addEventListener('click', () => {
    // Crear modal de confirmación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const container = document.createElement('div');
    container.className = 'development-modal-container';
    container.style.maxWidth = '400px';
    container.innerHTML = `
        <div class="development-content">
            <div class="development-icon"><i class="fa-solid fa-power-off"></i></div>
            <h2 class="development-title">Cerrar Sesión</h2>
            <p class="development-message">¿Estás seguro de que deseas cerrar sesión?</p>
            <div style="display: flex; gap: 15px; margin-top: 20px; width: 100%;">
                <button id="cancelarBtn" style="
                    flex: 1;
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: 2px solid #0047B3;
                    background: white;
                    color: #0047B3;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Cancelar</button>
                <button id="confirmarBtn" style="
                    flex: 1;
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: none;
                    background: #FF0000;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Cerrar Sesión</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Botón cancelar
    container.querySelector('#cancelarBtn').addEventListener('click', () => {
        overlay.remove();
    });
    
    // Botón confirmar
    container.querySelector('#confirmarBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
});

// Navegación inferior
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        if (section === 'inicio') {
            window.location.href = 'dashboard.html';
        } else if (section === 'brigada') {
            window.location.href = 'dashboard-brigada.html';
        } else if (section === 'emergencia') {
            // Mostrar modal de emergencia
            mostrarModalEmergencia();
        } else if (section === 'ia') {
            window.location.href = 'dashboard-ia.html';
        } else if (section === 'perfil') {
            // Ya estamos en perfil
            return;
        }
    });
});

// Función para mostrar modal de sección en desarrollo
function mostrarModalDesarrollo(seccion, icono) {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.className = 'development-modal-container';
    container.innerHTML = `
        <button class="development-close-btn">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0047B3"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </button>
        
        <div class="development-content">
            <div class="development-icon">${icono}</div>
            <h2 class="development-title">Sección en Desarrollo</h2>
            <p class="development-message">La sección de <strong>${seccion}</strong> está actualmente en desarrollo.</p>
            <p class="development-submessage">Pronto estará disponible con nuevas funcionalidades.</p>
            <div class="development-tools">
                <div class="tool-icon"><i class="fa-solid fa-wrench"></i></div>
                <span class="tool-text">Función de Herramienta</span>
            </div>
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Cerrar con el botón X
    container.querySelector('.development-close-btn').addEventListener('click', () => {
        overlay.remove();
    });

    // Cerrar al hacer clic fuera del modal
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Función para mostrar modal de emergencia
function mostrarModalEmergencia() {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.className = 'emergency-modal-container';
    container.innerHTML = `
        <button class="emergency-close-btn">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#FF0000"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </button>
        
        <div class="emergency-options">
            <button class="emergency-option" data-numero="125" data-servicio="Ambulancia">
                <img src="../img/ambulancia_cel.png" alt="Ambulancia">
            </button>
            
            <button class="emergency-option" data-numero="119" data-servicio="Bomberos">
                <img src="../img/bomberos_cel.png" alt="Bomberos">
            </button>
        </div>
        
        <div class="emergency-arrows">
            <img src="../img/flechas.png" alt="Flechas" class="arrows-animation">
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Cerrar modal con el botón X
    container.querySelector('.emergency-close-btn').addEventListener('click', () => {
        overlay.remove();
    });

    // Manejar clics en las opciones de emergencia
    container.querySelectorAll('.emergency-option').forEach(option => {
        option.addEventListener('click', () => {
            const numero = option.dataset.numero;
            const servicio = option.dataset.servicio;
            
            console.log(`Llamando a ${servicio}: ${numero}`);
            
            // Abrir el marcador del teléfono
            window.location.href = `tel:${numero}`;
            
            // Cerrar el modal
            overlay.remove();
        });
    });

    // No cerrar al hacer clic fuera del modal (solo con el botón X)
}
