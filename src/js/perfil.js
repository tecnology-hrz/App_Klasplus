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
var RIESGO_CACHE_KEY = 'klasplus_riesgo_cache_v2';

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

        // Una misma zona puede existir en varios documentos (registros
        // creados en paralelo). Se agrupan por slug: puntuación promedio,
        // evidencias sumadas y recomendaciones sin repetir.
        var porSlug = {};
        var ordenSlugs = [];
        zonas.forEach(function(data) {
            var score = typeof data.puntuacionPeligro === 'number' ? data.puntuacionPeligro : 5;
            var clave = String(data.slug || data.nombre || 'zona').toLowerCase();
            var z = porSlug[clave];
            if (!z) {
                z = porSlug[clave] = {
                    nombre: data.nombre || data.slug || 'Zona sin nombre',
                    slug: data.slug || '',
                    suma: 0, n: 0, fotos: 0, recomendaciones: []
                };
                ordenSlugs.push(clave);
            }
            z.suma += score;
            z.n++;
            z.fotos += (data.totalFotos || 0);
            (Array.isArray(data.recomendaciones) ? data.recomendaciones : []).forEach(function(r) {
                if (z.recomendaciones.indexOf(r) === -1) z.recomendaciones.push(r);
            });
        });

        var totalScore = 0;
        ordenSlugs.forEach(function(clave) {
            var z = porSlug[clave];
            var score = z.suma / z.n;
            datos.zonasEvaluadas++;
            totalScore += score;
            if (score >= 7) datos.zonasSeguras++;
            datos.totalFotos += z.fotos;
            datos.zonas.push({
                nombre: z.nombre,
                slug: z.slug,
                score: score,
                fotos: z.fotos,
                recomendaciones: z.recomendaciones
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

        // Se espera a que carguen las imágenes (teselas satelitales del mapa
        // 3D, logo) para que no salgan en blanco en el PDF. Máximo 5 s.
        var pendientes = Array.prototype.filter.call(contenedor.querySelectorAll('img'), function(img) {
            return !img.complete;
        });
        var espera = Promise.all(pendientes.map(function(img) {
            return new Promise(function(ok) { img.addEventListener('load', ok); img.addEventListener('error', ok); });
        }));
        var tope = new Promise(function(ok) { setTimeout(ok, 5000); });

        btn.disabled = true;
        Promise.race([espera, tope]).then(function() {
            btn.disabled = false;
            window.print();
            // Respaldo por si el navegador no dispara afterprint.
            setTimeout(restaurar, 1500);
        });
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
                '<img class="doc-cab-logo-img" src="../img/logo-klasplus.png" alt="Klasplus">' +
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
    critica:    { label: 'Inmediata',  color: '#C0392B', plazo: '7 días',     dias: 7 },
    alta:       { label: 'Alta',       color: '#E74C3C', plazo: '30 días',    dias: 30 },
    media:      { label: 'Media',      color: '#F39C12', plazo: '90 días',    dias: 90 },
    preventiva: { label: 'Preventiva', color: '#0047B3', plazo: 'Permanente', dias: null }
};

// Perfil técnico por tipo de zona: impacto potencial (1-5) de un evento
// en la zona, responsable sugerido, recursos y costo estimado.
var PERFIL_TECNICO_ZONA = [
    { claves: ['baño', 'bano', 'sanitario', 'lavamanos'], impacto: 3, responsable: 'Mantenimiento / Servicios generales', costo: 'Medio',
      recursos: ['Señal de piso mojado', 'Cinta antideslizante', 'Plomería y repuestos', 'Insumos de aseo'] },
    { claves: ['escalera', 'rampa', 'grada', 'peldaño'], impacto: 5, responsable: 'Mantenimiento', costo: 'Medio',
      recursos: ['Cinta antideslizante', 'Pintura de demarcación', 'Pasamanos', 'Luminarias de emergencia'] },
    { claves: ['salon', 'salón', 'aula', 'clase'], impacto: 3, responsable: 'Coordinación académica / Docentes', costo: 'Bajo',
      recursos: ['Anclajes y herrajes', 'Planos de evacuación impresos', 'Revisión de mobiliario'] },
    { claves: ['laboratorio', 'lab', 'quimica', 'química'], impacto: 5, responsable: 'Docente de ciencias / Rectoría', costo: 'Alto',
      recursos: ['Ducha y lavaojos', 'Gabinete con llave', 'Extintor y EPP', 'Hojas de seguridad'] },
    { claves: ['cafeteria', 'cafetería', 'comedor', 'tienda', 'restaurante', 'cocina'], impacto: 4, responsable: 'Administración / Concesionario', costo: 'Medio',
      recursos: ['Extintor tipo K', 'Revisión de gas', 'Control de plagas', 'Canecas con tapa'] },
    { claves: ['pasillo', 'corredor', 'circulacion', 'circulación', 'entrada', 'acceso', 'porteria', 'portería'], impacto: 4, responsable: 'Mantenimiento / Brigada', costo: 'Medio',
      recursos: ['Señalización fotoluminiscente', 'Luminarias de emergencia', 'Herrajes antipánico'] },
    { claves: ['patio', 'cancha', 'deportiv', 'gimnasio', 'zona verde', 'jardin', 'jardín'], impacto: 3, responsable: 'Mantenimiento / Educación física', costo: 'Medio',
      recursos: ['Reparación de piso', 'Anclajes para estructuras', 'Pintura de demarcación', 'Puntos de hidratación'] },
    { claves: ['electric', 'eléctric', 'tablero', 'tecnolog', 'computo', 'cómputo', 'sistemas'], impacto: 5, responsable: 'Rectoría / Técnico electricista', costo: 'Alto',
      recursos: ['Electricista certificado', 'Rotulado de tableros', 'Protecciones diferenciales'] },
    { claves: ['techo', 'cubierta', 'muro', 'pared', 'estructura', 'fachada', 'azotea', 'terraza'], impacto: 5, responsable: 'Rectoría / Secretaría de Educación', costo: 'Alto',
      recursos: ['Ingeniero estructural', 'Materiales de cubierta', 'Cinta de restricción'] }
];

var PERFIL_TECNICO_GENERICO = { impacto: 3, responsable: 'Coordinador de brigada', costo: 'Medio',
    recursos: ['Señalización temporal', 'Mantenimiento general'] };

function perfilTecnicoZona(nombreZona) {
    var nombre = String(nombreZona || '').toLowerCase();
    for (var i = 0; i < PERFIL_TECNICO_ZONA.length; i++) {
        var g = PERFIL_TECNICO_ZONA[i];
        for (var j = 0; j < g.claves.length; j++) {
            if (nombre.indexOf(g.claves[j]) !== -1) return g;
        }
    }
    return PERFIL_TECNICO_GENERICO;
}

// Probabilidad (1-5) de que se materialice un evento, inferida de la
// puntuación de seguridad: a menor puntuación, mayor probabilidad.
function probabilidadPorScore(score) {
    if (score < 2) return 5;
    if (score < 4) return 4;
    if (score < 6) return 3;
    if (score < 8) return 2;
    return 1;
}

var ETIQUETAS_PROB = ['', 'Rara', 'Improbable', 'Posible', 'Probable', 'Casi segura'];
var ETIQUETAS_IMPACTO = ['', 'Insignificante', 'Menor', 'Moderado', 'Mayor', 'Catastrófico'];

// Nivel de riesgo = probabilidad × impacto (matriz 5×5).
function nivelRiesgo(valor) {
    if (valor >= 15) return { label: 'Extremo', color: '#C0392B' };
    if (valor >= 10) return { label: 'Alto',    color: '#E74C3C' };
    if (valor >= 5)  return { label: 'Medio',   color: '#F39C12' };
    return                  { label: 'Bajo',    color: '#2ECC71' };
}

function evaluarRiesgoZona(z) {
    var perfil = perfilTecnicoZona(z.nombre);
    var p = probabilidadPorScore(z.score);
    var i = perfil.impacto;
    return { prob: p, impacto: i, valor: p * i, nivel: nivelRiesgo(p * i), perfil: perfil };
}

function fechaLimite(prioridad) {
    var pr = PRIORIDADES[prioridad];
    if (!pr || !pr.dias) return 'Permanente';
    var f = new Date();
    f.setDate(f.getDate() + pr.dias);
    return f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ---------- Mapa de calor 3D (maqueta de la institución) ----------
// Las zonas se ubican con las mismas coordenadas de la imagen satelital
// del mapa de peligro (mapa-peligro.html), convertidas a metros respecto
// al centro de la institución. Norte arriba, como en el mapa.
// Cada zona es un volumen: cuanto más baja la puntuación, más alto y más
// rojo el bloque, y mayor la mancha de calor sobre el terreno.
// Si cambian las coordenadas en mapa-peligro.html, actualizarlas aquí.
var MAPA_ESCUELA = { lat: 3.4518, lng: -76.5688 };
var ZONAS_MAPA = [
    { slug: 'baños',       nombre: 'Baños',       dLat:  0.00015, dLng: -0.00012, w: 7,  d: 6,  tipo: 'edif',    claves: ['baño', 'bano', 'sanitario'] },
    { slug: 'escaleras',   nombre: 'Escaleras',   dLat:  0.00008, dLng:  0.00015, w: 5,  d: 5,  tipo: 'torre',   claves: ['escalera'] },
    { slug: 'patio',       nombre: 'Patio',       dLat: -0.00012, dLng:  0.00005, w: 14, d: 10, tipo: 'abierto', claves: ['patio'] },
    { slug: 'laboratorio', nombre: 'Laboratorio', dLat:  0.00018, dLng:  0.00008, w: 10, d: 7,  tipo: 'edif',    claves: ['laboratorio', 'lab'] },
    { slug: 'cafeteria',   nombre: 'Cafetería',   dLat: -0.00008, dLng: -0.00018, w: 10, d: 7,  tipo: 'edif',    claves: ['cafeter', 'comedor', 'tienda'] },
    { slug: 'pasillos',    nombre: 'Pasillos',    dLat:  0.00005, dLng: -0.00005, w: 12, d: 4,  tipo: 'bajo',    claves: ['pasillo', 'corredor'] },
    { slug: 'entrada',     nombre: 'Entrada',     dLat: -0.00020, dLng:  0.00000, w: 8,  d: 4,  tipo: 'bajo',    claves: ['entrada', 'acceso', 'porter'] },
    { slug: 'canchas',     nombre: 'Canchas',     dLat: -0.00015, dLng:  0.00018, w: 12, d: 10, tipo: 'cancha',  claves: ['cancha', 'deportiv'] },
    { slug: 'salones',     nombre: 'Salones',     dLat:  0.00010, dLng: -0.00020, w: 9,  d: 12, tipo: 'edif',    claves: ['salon', 'salón', 'aula'] }
];

// Proyección axonométrica: giro PHI del plano, compresión vertical K y
// escala S (px por metro). Unidades de entrada en metros: x = este, y = sur.
var ISO = { S: 3.9, K: 0.55, OX: 165, OY: 150, PHI: 20 * Math.PI / 180 };

function isoPt(x, y, z) {
    var c = Math.cos(ISO.PHI), s = Math.sin(ISO.PHI);
    var xr = x * c - y * s, yr = x * s + y * c;
    return [ISO.OX + xr * ISO.S, ISO.OY + yr * ISO.K * ISO.S - z * ISO.S];
}

function profundidad(x, y) {
    return x * Math.sin(ISO.PHI) + y * Math.cos(ISO.PHI);
}

function isoPoly(puntos, fill, extra) {
    return '<polygon points="' + puntos.map(function(p) {
        var q = isoPt(p[0], p[1], p[2]);
        return q[0].toFixed(1) + ',' + q[1].toFixed(1);
    }).join(' ') + '" fill="' + fill + '"' + (extra || '') + '/>';
}

// Aclara (f > 0) u oscurece (f < 0) un color hexadecimal.
function tono(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(function(v) {
        v = f >= 0 ? v + (255 - v) * f : v * (1 + f);
        return Math.round(Math.max(0, Math.min(255, v)));
    });
    return '#' + c.map(function(v) { return ('0' + v.toString(16)).slice(-2); }).join('');
}

function zonaEnPlano(slot, zonas) {
    for (var i = 0; i < zonas.length; i++) {
        if (zonas[i].slug && zonas[i].slug === slot.slug) return { zona: zonas[i], indice: i };
    }
    for (var k = 0; k < zonas.length; k++) {
        var n = String(zonas[k].nombre || '').toLowerCase();
        for (var c = 0; c < slot.claves.length; c++) {
            if (n.indexOf(slot.claves[c]) !== -1) return { zona: zonas[k], indice: k };
        }
    }
    return null;
}

// Prisma con techo, fachadas sur y este visibles, y ventanas.
function isoBloque(s, h, color, conVentanas) {
    var x = s.x, y = s.y, w = s.w, d = s.d;
    var borde = ' stroke="' + tono(color, -0.45) + '" stroke-width="0.6" stroke-linejoin="round"';
    var out = '';
    out += isoPoly([[x, y + d, 0], [x + w, y + d, 0], [x + w, y + d, h], [x, y + d, h]], tono(color, -0.15), borde);
    out += isoPoly([[x + w, y, 0], [x + w, y + d, 0], [x + w, y + d, h], [x + w, y, h]], tono(color, -0.35), borde);

    if (conVentanas && h >= 3.5) {
        var pisos = Math.max(1, Math.floor((h - 0.8) / 3));
        for (var p = 0; p < pisos; p++) {
            var z0 = 1.1 + p * 3;
            for (var u = 1; u + 1.1 <= w - 0.6; u += 2.2) {
                out += isoPoly([[x + u, y + d, z0], [x + u + 1.1, y + d, z0], [x + u + 1.1, y + d, z0 + 1.2], [x + u, y + d, z0 + 1.2]], '#FFFFFF', ' fill-opacity="0.6"');
            }
            for (var v = 1; v + 1.1 <= d - 0.6; v += 2.2) {
                out += isoPoly([[x + w, y + v, z0], [x + w, y + v + 1.1, z0], [x + w, y + v + 1.1, z0 + 1.2], [x + w, y + v, z0 + 1.2]], '#FFFFFF', ' fill-opacity="0.45"');
            }
        }
    }
    out += isoPoly([[x, y, h], [x + w, y, h], [x + w, y + d, h], [x, y + d, h]], tono(color, 0.12), borde);
    if (w > 3 && d > 3) {
        out += isoPoly([[x + 0.7, y + 0.7, h], [x + w - 0.7, y + 0.7, h], [x + w - 0.7, y + d - 0.7, h], [x + 0.7, y + d - 0.7, h]], tono(color, 0.3), ' fill-opacity="0.7"');
    }
    return out;
}

// Superficie abierta (patio / cancha) con demarcaciones.
function isoSuperficie(s, h, color, esCancha) {
    var x = s.x, y = s.y, w = s.w, d = s.d;
    var out = isoBloque(s, h, color, false);
    var linea = ' fill="none" stroke="#FFFFFF" stroke-width="0.9" stroke-opacity="0.85"';
    function seg(a, b) {
        var p = isoPt(a[0], a[1], h), q = isoPt(b[0], b[1], h);
        return '<line x1="' + p[0].toFixed(1) + '" y1="' + p[1].toFixed(1) + '" x2="' + q[0].toFixed(1) + '" y2="' + q[1].toFixed(1) + '"' + linea + '/>';
    }
    if (esCancha) {
        out += seg([x + 1, y + 1], [x + w - 1, y + 1]) + seg([x + w - 1, y + 1], [x + w - 1, y + d - 1]) +
               seg([x + w - 1, y + d - 1], [x + 1, y + d - 1]) + seg([x + 1, y + d - 1], [x + 1, y + 1]) +
               seg([x + w / 2, y + 1], [x + w / 2, y + d - 1]);
        var c = isoPt(x + w / 2, y + d / 2, h);
        out += '<ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (1.8 * ISO.S).toFixed(1) + '" ry="' + (1.8 * ISO.S * ISO.K).toFixed(1) + '"' + linea + '/>';
    } else {
        for (var i = 1; i < 4; i++) out += seg([x + 0.8, y + (d * i) / 4], [x + w - 0.8, y + (d * i) / 4]);
    }
    return out;
}

function isoArbol(x, y) {
    var b = isoPt(x, y, 0), t = isoPt(x, y, 3);
    return '<ellipse cx="' + b[0].toFixed(1) + '" cy="' + b[1].toFixed(1) + '" rx="6" ry="3" fill="#0B2545" fill-opacity="0.15"/>' +
        '<line x1="' + b[0].toFixed(1) + '" y1="' + b[1].toFixed(1) + '" x2="' + t[0].toFixed(1) + '" y2="' + t[1].toFixed(1) + '" stroke="#7A5537" stroke-width="1.6"/>' +
        '<circle cx="' + t[0].toFixed(1) + '" cy="' + (t[1] - 3).toFixed(1) + '" r="6" fill="#3E9B5F"/>' +
        '<circle cx="' + (t[0] - 1.8).toFixed(1) + '" cy="' + (t[1] - 5).toFixed(1) + '" r="3" fill="#6CC28A"/>';
}

function svgMapaCalor(datos, idSufijo) {
    var filtro = 'calorBlur' + idSufijo;
    var R = 32; // medio lado del terreno, en metros
    var mLat = 111320, mLng = 111320 * Math.cos(MAPA_ESCUELA.lat * Math.PI / 180);

    // Terreno: losa con espesor y cuadrícula cada 4 m
    var suelo = '' +
        isoPoly([[-R, R, 0], [R, R, 0], [R, R, -2], [-R, R, -2]], '#B9C4D3') +
        isoPoly([[R, -R, 0], [R, R, 0], [R, R, -2], [R, -R, -2]], '#9AA7B8') +
        isoPoly([[-R, -R, 0], [R, -R, 0], [R, R, 0], [-R, R, 0]], '#EEF2F7', ' stroke="#C3CCDA" stroke-width="0.8"');
    var grid = '';
    for (var g = -R + 4; g < R; g += 4) {
        var a = isoPt(g, -R, 0), b = isoPt(g, R, 0), c1 = isoPt(-R, g, 0), c2 = isoPt(R, g, 0);
        grid += '<line x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>' +
                '<line x1="' + c1[0].toFixed(1) + '" y1="' + c1[1].toFixed(1) + '" x2="' + c2[0].toFixed(1) + '" y2="' + c2[1].toFixed(1) + '"/>';
    }
    suelo += '<g stroke="#DCE3EC" stroke-width="0.5">' + grid + '</g>';

    // Perímetro de 30 m de la institución (el mismo círculo del mapa)
    var centro = isoPt(0, 0, 0);
    suelo += '<ellipse cx="' + centro[0].toFixed(1) + '" cy="' + centro[1].toFixed(1) + '" rx="' + (30 * ISO.S).toFixed(1) + '" ry="' + (30 * ISO.S * ISO.K).toFixed(1) +
        '" fill="#FF5722" fill-opacity="0.05" stroke="#FF5722" stroke-width="1.2" stroke-dasharray="5 4"/>';

    var manchas = '';
    var bloques = '';
    var etiquetas = '';
    var rotulos = [];

    // Posición real (m) de cada zona a partir de su lat/lng.
    var zonasPos = ZONAS_MAPA.map(function(z) {
        var cx = z.dLng * mLng, cy = -z.dLat * mLat;
        return { slug: z.slug, nombre: z.nombre, claves: z.claves, tipo: z.tipo,
                 w: z.w, d: z.d, x: cx - z.w / 2, y: cy - z.d / 2, cx: cx, cy: cy };
    });

    // Se pinta de atrás hacia adelante para que los volúmenes se tapen bien.
    zonasPos.sort(function(p, q) { return profundidad(p.cx, p.cy) - profundidad(q.cx, q.cy); });

    zonasPos.forEach(function(s) {
        var m = zonaEnPlano(s, datos.zonas);
        var evaluada = !!m;
        var intensidad = evaluada ? (10 - m.zona.score) / 10 : 0;
        var color = evaluada ? clasificarZona(m.zona.score).color : '#D5DCE5';
        var abierta = s.tipo === 'abierto' || s.tipo === 'cancha';

        var factor = s.tipo === 'torre' ? 1.3 : s.tipo === 'bajo' ? 0.55 : 1;
        var h = abierta ? 0.4 + intensidad * 1.2 : (evaluada ? 3 + intensidad * 11 : 3) * factor;

        if (evaluada) {
            var gc = isoPt(s.cx, s.cy, 0);
            var r = 6 + intensidad * 9;
            manchas += '<ellipse cx="' + gc[0].toFixed(1) + '" cy="' + gc[1].toFixed(1) + '" rx="' + (r * ISO.S).toFixed(1) + '" ry="' + (r * ISO.S * ISO.K).toFixed(1) +
                '" fill="' + color + '" fill-opacity="' + (0.4 + intensidad * 0.5).toFixed(2) + '"/>';
        }

        bloques += abierta
            ? isoSuperficie(s, h, evaluada ? color : '#C9D2DD', s.tipo === 'cancha')
            : isoBloque(s, h, color, true);

        var top = isoPt(s.cx, s.cy, h);
        var titulo = (evaluada ? (m.indice + 1) + '. ' : '') + s.nombre;
        rotulos.push({
            top: top, ly: top[1] - 16, ancho: Math.max(titulo.length * 4.4 + 14, 58),
            titulo: titulo, evaluada: evaluada, color: color, m: m
        });
    });

    // Etiquetas sin superposición: se busca el hueco libre más cercano.
    rotulos.sort(function(a, b) { return b.top[1] - a.top[1]; });
    var colocados = [];
    rotulos.forEach(function(r) {
        var base = Math.max(r.ly, 40);
        var elegido = base;
        for (var k = 0; k < 24; k++) {
            var ly = base + Math.ceil(k / 2) * 4 * (k % 2 ? -1 : 1);
            if (ly < 40) continue;
            var choca = colocados.some(function(o) {
                return Math.abs(o.top[0] - r.top[0]) < (o.ancho + r.ancho) / 2 + 2 && Math.abs(o.ly - ly) < 20;
            });
            if (!choca) { elegido = ly; break; }
        }
        r.ly = elegido;
        colocados.push(r);
    });

    rotulos.forEach(function(r) {
        var top = r.top, ly = r.ly, ancho = r.ancho, titulo = r.titulo;
        var evaluada = r.evaluada, color = r.color, m = r.m;
        var guia = evaluada ? tono(color, -0.3) : '#AEB8C6';
        etiquetas += '' +
            '<line x1="' + top[0].toFixed(1) + '" y1="' + top[1].toFixed(1) + '" x2="' + top[0].toFixed(1) + '" y2="' + (ly + (ly < top[1] ? 9 : -9)).toFixed(1) + '" stroke="' + guia + '" stroke-width="0.8"/>' +
            '<circle cx="' + top[0].toFixed(1) + '" cy="' + top[1].toFixed(1) + '" r="1.6" fill="' + guia + '"/>' +
            '<g transform="translate(' + top[0].toFixed(1) + ',' + ly.toFixed(1) + ')">' +
                '<rect x="' + (-ancho / 2).toFixed(1) + '" y="-9" width="' + ancho.toFixed(1) + '" height="18" rx="9" fill="#FFFFFF" stroke="' + (evaluada ? color : '#AEB8C6') + '" stroke-width="1.1"' + (evaluada ? '' : ' stroke-dasharray="2.5 2"') + '/>' +
                '<text y="-1.2" text-anchor="middle" font-size="6.6" font-weight="800" fill="' + (evaluada ? '#0B2545' : '#7C8899') + '">' + escapeHTML(titulo) + '</text>' +
                '<text y="6" text-anchor="middle" font-size="5.8" font-weight="800" fill="' + (evaluada ? tono(color, -0.15) : '#8C9AAD') + '">' +
                    (evaluada ? m.zona.score.toFixed(1) + '/10 · ' + clasificarZona(m.zona.score).label : 'Sin evaluar') +
                '</text>' +
            '</g>';
    });

    var arboles = isoArbol(-29, 29) + isoArbol(-29, -29) + isoArbol(29, -29) + isoArbol(29, 29) +
                  isoArbol(-10, 29) + isoArbol(12, 29) + isoArbol(-29, 0) + isoArbol(29, 2);

    // Pin de la institución en el centro (como en el mapa)
    var pb = isoPt(0, 0, 0), pt = isoPt(0, 0, 7);
    var pin = '' +
        '<line x1="' + pb[0].toFixed(1) + '" y1="' + pb[1].toFixed(1) + '" x2="' + pt[0].toFixed(1) + '" y2="' + pt[1].toFixed(1) + '" stroke="#0B2545" stroke-width="1.4"/>' +
        '<g transform="translate(' + pt[0].toFixed(1) + ',' + (pt[1] - 6).toFixed(1) + ')">' +
            '<circle r="6.5" fill="#0047B3" stroke="#FFFFFF" stroke-width="1.4"/>' +
            '<path d="M0,-3.6 L3,-2.4 L3,0 C3,1.8 1.5,3 0,3.6 C-1.5,3 -3,1.8 -3,0 L-3,-2.4 Z" fill="#FFFFFF"/>' +
        '</g>';

    // Brújula: el norte del mapa satelital (girado PHI en la maqueta)
    var nx = Math.sin(-ISO.PHI) * -1, ny = -Math.cos(ISO.PHI) * ISO.K;
    var nl = Math.sqrt(nx * nx + ny * ny); nx /= nl; ny /= nl;
    var brujula = '' +
        '<g transform="translate(306,28)">' +
            '<circle r="11" fill="#FFFFFF" stroke="#C3CCDA" stroke-width="0.8"/>' +
            '<g transform="rotate(' + (Math.atan2(nx, -ny) * 180 / Math.PI).toFixed(1) + ')">' +
                '<path d="M0,-8 L3,1 L0,-1 L-3,1 Z" fill="#E74C3C"/>' +
                '<path d="M0,8 L3,-1 L0,1 L-3,-1 Z" fill="#8C9AAD"/>' +
                '<text y="-12.5" text-anchor="middle" font-size="6" font-weight="800" fill="#0B2545">N</text>' +
            '</g>' +
        '</g>';

    var nota = '<text x="12" y="18" font-size="6.5" font-weight="800" fill="#0B2545" letter-spacing="0.5">MAQUETA 3D · UBICACIÓN SEGÚN IMAGEN SATELITAL</text>' +
        '<text x="12" y="27" font-size="5.8" fill="#5A6A80">Altura y color del volumen = nivel de riesgo · Perímetro de 30 m</text>';

    return '' +
        '<svg class="calor-svg" viewBox="0 0 330 262" role="img" aria-label="Mapa de calor 3D de las zonas de la institución" font-family="Poppins, Segoe UI, Arial, sans-serif">' +
            '<defs>' +
                '<filter id="' + filtro + '" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>' +
                '<linearGradient id="cielo' + idSufijo + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF1FA"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient>' +
            '</defs>' +
            '<rect x="0" y="0" width="330" height="262" rx="12" fill="url(#cielo' + idSufijo + ')"/>' +
            nota + brujula +
            suelo +
            '<g filter="url(#' + filtro + ')">' + manchas + '</g>' +
            arboles +
            bloques +
            pin +
            etiquetas +
        '</svg>';
}

function leyendaCalor() {
    return '' +
        '<div class="calor-leyenda">' +
            '<span class="calor-escala"></span>' +
            '<div class="calor-escala-labels"><span>Crítica</span><span>Peligrosa</span><span>En riesgo</span><span>Moderada</span><span>Segura</span></div>' +
        '</div>';
}

// ---------- Matriz de riesgos 5×5 (probabilidad × impacto) ----------
function matrizRiesgosHTML(datos) {
    // Agrupa los números de zona por celda
    var celdas = {};
    datos.zonas.forEach(function(z, idx) {
        var ev = evaluarRiesgoZona(z);
        var k = ev.prob + '-' + ev.impacto;
        (celdas[k] = celdas[k] || []).push(idx + 1);
    });

    var html = '<table class="matriz-riesgo"><tbody>';
    for (var p = 5; p >= 1; p--) {
        html += '<tr><th class="matriz-eje-y"><span>' + p + '</span>' + ETIQUETAS_PROB[p] + '</th>';
        for (var i = 1; i <= 5; i++) {
            var nv = nivelRiesgo(p * i);
            var zonasCelda = celdas[p + '-' + i] || [];
            html += '<td style="background:' + nv.color + (zonasCelda.length ? '' : '55') + ';">' +
                zonasCelda.map(function(n) { return '<span class="matriz-zona">' + n + '</span>'; }).join('') +
            '</td>';
        }
        html += '</tr>';
    }
    html += '<tr><th></th>';
    for (var j = 1; j <= 5; j++) {
        html += '<th class="matriz-eje-x"><span>' + j + '</span>' + ETIQUETAS_IMPACTO[j] + '</th>';
    }
    html += '</tr></tbody></table>' +
        '<div class="matriz-ejes"><span>↑ Probabilidad</span><span>Impacto →</span></div>' +
        '<div class="zona-leyenda">' +
            leyendaItem('#2ECC71', 'Bajo 1-4') +
            leyendaItem('#F39C12', 'Medio 5-9') +
            leyendaItem('#E74C3C', 'Alto 10-14') +
            leyendaItem('#C0392B', 'Extremo 15-25') +
        '</div>';
    return html;
}

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
        var ev = evaluarRiesgoZona(z);
        pasos2.push({
            titulo: z.nombre,
            prioridad: prioridadPorScore(z.score),
            etiquetaZona: c.label + ' · ' + z.score.toFixed(1) + '/10 · Riesgo ' + ev.nivel.label.toLowerCase(),
            descripcion: 'Zona clasificada como ' + c.label.toLowerCase() + ' (probabilidad ' + ETIQUETAS_PROB[ev.prob].toLowerCase() +
                ', impacto ' + ETIQUETAS_IMPACTO[ev.impacto].toLowerCase() + '). Intervenir las condiciones que sostienen la puntuación baja.',
            medidas: medidas,
            responsable: ev.perfil.responsable,
            recursos: ev.perfil.recursos,
            costo: ev.perfil.costo,
            riesgo: ev
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

    // Responsable y recursos de las acciones que no dependen de una zona.
    fases.forEach(function(f) {
        f.pasos.forEach(function(p) {
            if (p.recursos) return;
            var r = recursosAccionGeneral(p.titulo);
            p.responsable = r.responsable;
            p.recursos = r.recursos;
            p.costo = r.costo;
        });
    });

    return fases;
}

var RECURSOS_ACCIONES = [
    { prefijo: 'Completar el diagnóstico',     responsable: 'Coordinador de brigada', costo: 'Bajo',
      recursos: ['Brigadistas activos', 'Celular con cámara', 'App Klasplus'] },
    { prefijo: 'Mantener el diagnóstico',      responsable: 'Coordinador de brigada', costo: 'Bajo',
      recursos: ['Brigadistas activos', 'App Klasplus'] },
    { prefijo: 'Reforzar la evidencia',        responsable: 'Brigadistas', costo: 'Bajo',
      recursos: ['Celular con cámara', 'App Klasplus'] },
    { prefijo: 'Consolidar y socializar',      responsable: 'Comité escolar de gestión del riesgo', costo: 'Bajo',
      recursos: ['Matriz de riesgos', 'Espacio de reunión', 'Material de socialización'] },
    { prefijo: 'Sostener los controles',       responsable: 'Mantenimiento', costo: 'Medio',
      recursos: ['Personal de mantenimiento', 'Lista de chequeo mensual'] },
    { prefijo: 'Consolidar la brigada',        responsable: 'Rectoría / Comité de gestión del riesgo', costo: 'Bajo',
      recursos: ['Distintivos de brigada', 'Acta de roles', 'Tiempo de reunión'] },
    { prefijo: 'Plan de evacuación',           responsable: 'Coordinador de brigada', costo: 'Bajo',
      recursos: ['Silbatos / megáfono', 'Cronómetro', 'Planos de la sede'] },
    { prefijo: 'Señalización y rutas',         responsable: 'Rectoría / Mantenimiento', costo: 'Medio',
      recursos: ['Señalización fotoluminiscente', 'Luminarias de emergencia', 'Planos de evacuación'] },
    { prefijo: 'Dotación para emergencias',    responsable: 'Rectoría / Administración', costo: 'Alto',
      recursos: ['Extintores', 'Botiquín', 'Camilla de inmovilización', 'Sistema de alarma'] },
    { prefijo: 'Formación y articulación',     responsable: 'Rectoría / Coordinador de brigada', costo: 'Bajo',
      recursos: ['Capacitador (Bomberos / Cruz Roja)', 'Directorio de emergencia'] }
];

function recursosAccionGeneral(titulo) {
    for (var i = 0; i < RECURSOS_ACCIONES.length; i++) {
        if (String(titulo).indexOf(RECURSOS_ACCIONES[i].prefijo) === 0) return RECURSOS_ACCIONES[i];
    }
    return PERFIL_TECNICO_GENERICO;
}

// Consolida los recursos de todo el plan: cuántas acciones requieren cada uno.
function consolidarRecursos(fases) {
    var mapa = {};
    var orden = [];
    fases.forEach(function(f) {
        f.pasos.forEach(function(p, idx) {
            (p.recursos || []).forEach(function(r) {
                if (!mapa[r]) { mapa[r] = []; orden.push(r); }
                mapa[r].push(f.numero + '.' + (idx + 1));
            });
        });
    });
    return orden.map(function(r) { return { recurso: r, acciones: mapa[r] }; });
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

    // --- Mapa de calor y matriz de riesgos ---
    if (!sinDatos) {
        html += '' +
            '<div class="informe-card">' +
                '<div class="informe-card-head">' +
                    '<span class="informe-card-titulo"><i class="fa-solid fa-fire"></i> Mapa de calor</span>' +
                    '<span class="informe-card-sub">Maqueta 3D</span>' +
                '</div>' +
                '<div class="calor-wrap">' + svgMapaCalor(datos, 'Pant') + '</div>' +
                leyendaCalor() +
                '<a class="informe-link-mapa" href="mapa-peligro.html"><i class="fa-solid fa-map-location-dot"></i> Ver mapa satelital <i class="fa-solid fa-arrow-right"></i></a>' +
            '</div>' +
            '<div class="informe-card">' +
                '<div class="informe-card-head">' +
                    '<span class="informe-card-titulo"><i class="fa-solid fa-table-cells"></i> Matriz de riesgos</span>' +
                    '<span class="informe-card-sub">Probabilidad × Impacto</span>' +
                '</div>' +
                matrizRiesgosHTML(datos) +
                '<ol class="matriz-ref">' +
                    datos.zonas.map(function(z) {
                        var ev = evaluarRiesgoZona(z);
                        return '<li><span>' + escapeHTML(z.nombre) + '</span><strong style="color:' + ev.nivel.color + ';">' + ev.nivel.label + ' (' + ev.valor + ')</strong></li>';
                    }).join('') +
                '</ol>' +
            '</div>';
    }

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
                        '<div class="plan-paso-plazo"><i class="fa-regular fa-clock"></i> Plazo sugerido: <strong>' + pr.plazo + '</strong>' +
                            (pr.dias ? ' · hasta ' + fechaLimite(paso.prioridad) : '') + '</div>' +
                        '<ul class="plan-medidas">' + medidasHTML + '</ul>' +
                        '<div class="plan-paso-recursos">' +
                            '<div><i class="fa-solid fa-user-tie"></i> Responsable: <strong>' + escapeHTML(paso.responsable) + '</strong></div>' +
                            '<div><i class="fa-solid fa-coins"></i> Costo estimado: <strong>' + escapeHTML(paso.costo) + '</strong></div>' +
                            '<div class="plan-recursos-chips">' +
                                (paso.recursos || []).map(function(r) { return '<span>' + escapeHTML(r) + '</span>'; }).join('') +
                            '</div>' +
                        '</div>' +
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

    // Documento formal que reemplaza la vista de pantalla al imprimir.
    html += documentoImpresionPlan(datos, fases, clase, sinDatos, totalAcciones, inmediatas);

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

// Versión formal del Plan de Acción, visible únicamente al imprimir/PDF.
function documentoImpresionPlan(datos, fases, clase, sinDatos, totalAcciones, inmediatas) {
    var fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    var indice = sinDatos ? 'Sin datos' : datos.scorePromedio.toFixed(1) + ' / 10';
    var zonasIntervenir = datos.zonas.filter(function(z) { return z.score < 8; }).length;

    var costos = { Bajo: 0, Medio: 0, Alto: 0 };
    fases.forEach(function(f) { f.pasos.forEach(function(p) { if (costos[p.costo] != null) costos[p.costo]++; }); });

    var resumen = sinDatos
        ? 'Aún no hay zonas diagnosticadas, por lo que este plan parte del levantamiento inicial de información. Se definen ' +
          totalAcciones + ' acciones organizadas en las tres fases de la gestión del riesgo (Ley 1523 de 2012).'
        : 'Con un índice de seguridad institucional de ' + datos.scorePromedio.toFixed(1) + '/10 (' + clase.label + ') y ' +
          datos.zonasEvaluadas + ' de ' + TOTAL_ZONAS_INSTITUCION + ' zonas diagnosticadas, el plan define ' + totalAcciones +
          ' acciones organizadas en las tres fases de la gestión del riesgo (Ley 1523 de 2012), de las cuales ' + inmediatas +
          ' son de ejecución inmediata y ' + zonasIntervenir + ' corresponden a zonas que requieren intervención.';

    var sec = 0;
    function titulo(texto) { sec++; return '<h5 class="doc-titulo-sec">' + sec + '. ' + texto + '</h5>'; }

    var html = '' +
    '<div class="doc-print" aria-hidden="true">' +
        '<header class="doc-cab">' +
            '<div class="doc-cab-marca">' +
                '<img class="doc-cab-logo-img" src="../img/logo-klasplus.png" alt="Klasplus">' +
                '<span class="doc-cab-sub">Sistema de gestión de seguridad escolar</span>' +
            '</div>' +
            '<div class="doc-cab-tipo">' +
                '<span>Documento de gestión</span>' +
                '<strong>PLAN DE ACCIÓN</strong>' +
            '</div>' +
        '</header>' +

        '<table class="doc-ficha"><tbody>' +
            '<tr><th>Institución educativa</th><td colspan="3">' + escapeHTML(datos.nombreInst) + '</td></tr>' +
            '<tr><th>Fecha de emisión</th><td>' + fecha + '</td><th>Marco normativo</th><td>Ley 1523 de 2012 · PEGIR · NTC 4595</td></tr>' +
            '<tr><th>Índice de seguridad</th><td class="doc-num doc-destacado">' + indice + '</td><th>Clasificación</th><td class="doc-destacado">' + escapeHTML(clase.label) + '</td></tr>' +
        '</tbody></table>' +

        titulo('Resumen ejecutivo') +
        '<p class="doc-parrafo">' + escapeHTML(resumen) + '</p>' +
        '<table class="doc-tabla doc-kpis"><tbody><tr>' +
            '<td><strong>' + totalAcciones + '</strong><span>Acciones totales</span></td>' +
            '<td><strong style="color:#C0392B;">' + inmediatas + '</strong><span>Inmediatas</span></td>' +
            '<td><strong style="color:#FF6B35;">' + zonasIntervenir + '</strong><span>Zonas a intervenir</span></td>' +
            '<td><strong>' + costos.Bajo + ' / ' + costos.Medio + ' / ' + costos.Alto + '</strong><span>Costo bajo / medio / alto</span></td>' +
        '</tr></tbody></table>';

    // Zonas prioritarias: las tres con mayor nivel de riesgo
    if (!sinDatos) {
        var top = datos.zonas.map(function(z) { return { z: z, ev: evaluarRiesgoZona(z) }; })
            .sort(function(a, b) { return b.ev.valor - a.ev.valor || a.z.score - b.z.score; })
            .slice(0, 3);
        html += '<div class="doc-top">' +
            '<p class="doc-top-titulo">Zonas prioritarias de intervención</p>' +
            '<div class="doc-top-grid">' +
            top.map(function(t, i) {
                return '<div class="doc-top-item" style="border-color:' + t.ev.nivel.color + ';">' +
                    '<span class="doc-top-num" style="background:' + t.ev.nivel.color + ';">' + (i + 1) + '</span>' +
                    '<div><strong>' + escapeHTML(t.z.nombre) + '</strong>' +
                    '<span>Riesgo ' + t.ev.nivel.label.toLowerCase() + ' (' + t.ev.valor + ') · ' + t.z.score.toFixed(1) + '/10</span>' +
                    '<span>' + escapeHTML(t.ev.perfil.responsable) + '</span></div>' +
                '</div>';
            }).join('') +
            '</div></div>';
    }

    if (!sinDatos) {
        // Tabla de valoración por zona
        var filas = datos.zonas.map(function(z, i) {
            var ev = evaluarRiesgoZona(z);
            var c = clasificarZona(z.score);
            return '<tr>' +
                '<td class="doc-c">' + (i + 1) + '</td>' +
                '<td>' + escapeHTML(z.nombre) + '</td>' +
                '<td class="doc-c doc-num">' + z.score.toFixed(1) + '</td>' +
                '<td>' + c.label + '</td>' +
                '<td class="doc-c">' + ev.prob + ' · ' + ETIQUETAS_PROB[ev.prob] + '</td>' +
                '<td class="doc-c">' + ev.impacto + ' · ' + ETIQUETAS_IMPACTO[ev.impacto] + '</td>' +
                '<td class="doc-c doc-nivel" style="background:' + ev.nivel.color + ';">' + ev.nivel.label + ' (' + ev.valor + ')</td>' +
            '</tr>';
        }).join('');

        html += '' +
            '<div class="doc-bloque">' +
                titulo('Mapa de calor de la institución') +
                '<div class="doc-calor">' + svgMapaCalor(datos, 'Doc') + leyendaCalor() + '</div>' +
                '<p class="doc-nota-tabla">Maqueta 3D de la institución: cada zona está ubicada según su posición en la imagen satelital del mapa de peligro. La altura y el color de cada volumen, y la mancha de calor sobre el terreno, crecen a medida que baja la puntuación de seguridad de la zona. Los números corresponden a la tabla de valoración.</p>' +
            '</div>' +
            '<div class="doc-bloque">' +
                titulo('Matriz de riesgos (probabilidad × impacto)') +
                '<div class="doc-matriz">' + matrizRiesgosHTML(datos) + '</div>' +
            '</div>' +
            titulo('Valoración del riesgo por zona') +
            '<table class="doc-tabla"><thead><tr>' +
                '<th class="doc-c">N°</th><th>Zona</th><th class="doc-c">Puntuación</th><th>Clasificación</th>' +
                '<th class="doc-c">Probabilidad</th><th class="doc-c">Impacto</th><th class="doc-c">Nivel de riesgo</th>' +
            '</tr></thead><tbody>' + filas + '</tbody></table>' +
            '<p class="doc-nota-tabla">La probabilidad se infiere de la puntuación de seguridad registrada; el impacto, del tipo de zona y su exposición.</p>';
    }

    // Plan detallado por fase
    html += titulo('Plan de acción detallado');
    fases.forEach(function(fase) {
        html += '' +
            '<div class="doc-fase">' +
                '<p class="doc-fase-titulo">Fase ' + fase.numero + ' · ' + fase.nombre + ' <span>' + fase.marco + '</span></p>' +
                '<p class="doc-fase-obj">Objetivo: ' + fase.objetivo + '</p>' +
            '</div>' +
            '<table class="doc-tabla doc-tabla-plan"><thead><tr>' +
                '<th class="doc-c">N°</th><th>Acción y medidas</th><th class="doc-c">Prioridad</th>' +
                '<th>Responsable</th><th>Recursos</th><th class="doc-c">Fecha límite</th><th class="doc-c">Hecho</th>' +
            '</tr></thead><tbody>';

        fase.pasos.forEach(function(p, idx) {
            var pr = PRIORIDADES[p.prioridad] || PRIORIDADES.media;
            html += '<tr>' +
                '<td class="doc-c doc-num">' + fase.numero + '.' + (idx + 1) + '</td>' +
                '<td><strong>' + escapeHTML(p.titulo) + '</strong>' +
                    (p.etiquetaZona ? '<span class="doc-zona-tag">' + escapeHTML(p.etiquetaZona) + '</span>' : '') +
                    '<ul class="doc-medidas">' + p.medidas.map(function(m) { return '<li>' + escapeHTML(m) + '</li>'; }).join('') + '</ul>' +
                '</td>' +
                '<td class="doc-c"><span class="doc-prio" style="border-color:' + pr.color + ';color:' + pr.color + ';">' + pr.label + '</span></td>' +
                '<td>' + escapeHTML(p.responsable) + '</td>' +
                '<td>' + escapeHTML((p.recursos || []).join(', ')) + '<span class="doc-costo">Costo: ' + escapeHTML(p.costo) + '</span></td>' +
                '<td class="doc-c doc-num">' + fechaLimite(p.prioridad) + '</td>' +
                '<td class="doc-c"><span class="doc-check"></span></td>' +
            '</tr>';
        });
        html += '</tbody></table>';
    });

    // Cronograma tipo Gantt según el plazo de cada prioridad
    var columnas = ['Sem. 1', 'Sem. 2-4', 'Mes 2', 'Mes 3', 'Continuo'];
    var tramos = { critica: [0, 0], alta: [0, 1], media: [0, 3], preventiva: [4, 4] };
    var filasGantt = '';
    fases.forEach(function(fase) {
        fase.pasos.forEach(function(p, idx) {
            var pr = PRIORIDADES[p.prioridad] || PRIORIDADES.media;
            var t = tramos[p.prioridad] || tramos.media;
            filasGantt += '<tr><td class="doc-c doc-num">' + fase.numero + '.' + (idx + 1) + '</td><td>' + escapeHTML(p.titulo) + '</td>';
            for (var c = 0; c < columnas.length; c++) {
                var activo = c >= t[0] && c <= t[1];
                filasGantt += '<td class="doc-gantt-celda">' + (activo ? '<span style="background:' + pr.color + ';"></span>' : '') + '</td>';
            }
            filasGantt += '</tr>';
        });
    });
    html += titulo('Cronograma de ejecución') +
        '<table class="doc-tabla doc-gantt"><thead><tr><th class="doc-c">N°</th><th>Acción</th>' +
        columnas.map(function(c) { return '<th class="doc-c">' + c + '</th>'; }).join('') +
        '</tr></thead><tbody>' + filasGantt + '</tbody></table>' +
        '<p class="doc-nota-tabla">Barras coloreadas según prioridad: inmediata, alta, media o preventiva (continua).</p>';

    // Consolidado de recursos
    var recursos = consolidarRecursos(fases);
    html += titulo('Consolidado de recursos requeridos') +
        '<table class="doc-tabla"><thead><tr>' +
            '<th class="doc-c">N°</th><th>Recurso</th><th>Acciones que lo requieren</th><th class="doc-c">Disponible</th><th class="doc-c">Gestionar</th>' +
        '</tr></thead><tbody>' +
        recursos.map(function(r, i) {
            return '<tr><td class="doc-c">' + (i + 1) + '</td><td>' + escapeHTML(r.recurso) + '</td><td class="doc-num">' + r.acciones.join(', ') + '</td>' +
                '<td class="doc-c"><span class="doc-check"></span></td><td class="doc-c"><span class="doc-check"></span></td></tr>';
        }).join('') +
        '</tbody></table>';

    // Seguimiento
    var filasSeg = '';
    for (var s = 0; s < 5; s++) filasSeg += '<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>';
    html += '<div class="doc-bloque">' +
        titulo('Registro de seguimiento') +
        '<table class="doc-tabla doc-tabla-seg"><thead><tr>' +
            '<th>Fecha</th><th class="doc-c">Acción N°</th><th class="doc-c">% avance</th><th>Observaciones</th><th>Firma</th>' +
        '</tr></thead><tbody>' + filasSeg + '</tbody></table>' +
        '</div>' +

        '<div class="doc-firmas">' +
            '<div class="doc-firma"><span class="doc-firma-linea"></span><p>Responsable de la brigada escolar</p></div>' +
            '<div class="doc-firma"><span class="doc-firma-linea"></span><p>Rector / Coordinador</p></div>' +
            '<div class="doc-firma"><span class="doc-firma-linea"></span><p>Comité de gestión del riesgo</p></div>' +
        '</div>' +

        '<footer class="doc-pie">' +
            'Documento generado automáticamente por Klasplus a partir de la evidencia registrada por la brigada escolar. ' +
            'Las fechas límite se calculan desde la fecha de emisión según la prioridad de cada acción. ' +
            'Constituye un instrumento de priorización y no reemplaza la inspección técnica profesional ni el concepto de las autoridades competentes.' +
        '</footer>' +
    '</div>';

    return html;
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
