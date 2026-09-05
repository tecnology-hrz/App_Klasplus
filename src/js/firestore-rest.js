// ==========================================================
// Capa de LECTURA de Firestore vía API REST
//
// ¿Por qué existe esto?
// El SDK de Firestore no usa HTTPS simple: abre un canal de streaming
// (WebChannel) y hasta getDoc() lo utiliza internamente
// (getDocumentViaSnapshotListener). Cuando ese canal está bloqueado por
// extensiones del navegador, antivirus con inspección HTTPS o proxies, el SDK
// espera 10 segundos y reporta:
//     "Could not reach Cloud Firestore backend / client is offline"
// aunque la red funcione perfectamente.
//
// Verificado en este proyecto: la API REST del mismo proyecto responde 200 con
// los datos reales, mientras el SDK falla. Por eso las lecturas críticas usan
// esta capa: una sola petición HTTPS normal, sin streaming.
// ==========================================================

// Se importa desde firebase-keys.js (sin SDK) y NO desde firebase-config.js,
// que arrastraría 660 KB del SDK de Firebase sin necesidad.
import { firebaseConfig } from './firebase-keys.js';

const BASE = 'https://firestore.googleapis.com/v1/projects/' +
    firebaseConfig.projectId + '/databases/(default)/documents';

const TIMEOUT_MS = 12000;

// Convierte un valor con el formato tipado de la REST de Firestore
// ({ stringValue: "x" }) a un valor JavaScript normal.
function valorFirestore(v) {
    if (!v || typeof v !== 'object') return null;
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return Number(v.integerValue);
    if ('doubleValue' in v) return Number(v.doubleValue);
    if ('booleanValue' in v) return v.booleanValue;
    if ('nullValue' in v) return null;
    if ('timestampValue' in v) return v.timestampValue;
    if ('referenceValue' in v) return v.referenceValue;
    if ('geoPointValue' in v) return v.geoPointValue;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(valorFirestore);
    if ('mapValue' in v) return mapearCampos(v.mapValue.fields || {});
    return null;
}

// Convierte el objeto "fields" de un documento REST a un objeto plano.
export function mapearCampos(fields) {
    var salida = {};
    Object.keys(fields || {}).forEach(function(clave) {
        salida[clave] = valorFirestore(fields[clave]);
    });
    return salida;
}

// fetch con límite de tiempo, para no dejar la interfaz esperando de más.
async function fetchConTimeout(url, opciones) {
    var controlador = new AbortController();
    var temporizador = setTimeout(function() { controlador.abort(); }, TIMEOUT_MS);
    try {
        return await fetch(url, Object.assign({}, opciones, { signal: controlador.signal }));
    } finally {
        clearTimeout(temporizador);
    }
}

/**
 * Lee un documento suelto.
 * @param {string} ruta ej. 'usuarios/abc123' o 'progreso_usuario/abc123'
 * @returns {Promise<Object|null>} campos del documento, o null si no existe
 */
export async function restObtenerDoc(ruta) {
    var url = BASE + '/' + ruta + '?key=' + firebaseConfig.apiKey;
    var respuesta = await fetchConTimeout(url);

    // Un documento inexistente no es un error de conexión.
    if (respuesta.status === 404) return null;
    if (!respuesta.ok) {
        throw new Error('Firestore REST ' + respuesta.status + ' al leer ' + ruta);
    }

    var datos = await respuesta.json();
    return mapearCampos(datos.fields);
}

/**
 * Lee todos los documentos de una colección.
 * @param {string} collectionId ej. 'zonas_institucion'
 * @param {number} [pageSize=300] tope de documentos a traer
 * @returns {Promise<Array<Object>>} lista de documentos como objetos planos
 */
export async function restListarColeccion(collectionId, pageSize) {
    var url = BASE + '/' + collectionId + '?pageSize=' + (pageSize || 300) +
        '&key=' + firebaseConfig.apiKey;
    var respuesta = await fetchConTimeout(url);

    if (respuesta.status === 404) return [];
    if (!respuesta.ok) {
        throw new Error('Firestore REST ' + respuesta.status + ' al listar ' + collectionId);
    }

    var datos = await respuesta.json();
    return (datos.documents || []).map(function(documento) {
        var campos = mapearCampos(documento.fields);
        campos._id = documento.name.split('/').pop();
        return campos;
    });
}

/**
 * Consulta una colección filtrando por igualdad en un campo.
 * @param {string} collectionId ej. 'zonas_institucion'
 * @param {string} campo ej. 'institucionId'
 * @param {string} valor valor exacto a comparar
 * @returns {Promise<Array<Object>>} lista de documentos como objetos planos
 */
export async function restConsultar(collectionId, campo, valor) {
    var url = BASE + ':runQuery?key=' + firebaseConfig.apiKey;
    var cuerpo = {
        structuredQuery: {
            from: [{ collectionId: collectionId }],
            where: {
                fieldFilter: {
                    field: { fieldPath: campo },
                    op: 'EQUAL',
                    value: { stringValue: valor }
                }
            }
        }
    };

    var respuesta = await fetchConTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo)
    });

    if (!respuesta.ok) {
        throw new Error('Firestore REST ' + respuesta.status + ' al consultar ' + collectionId);
    }

    var resultado = await respuesta.json();
    // runQuery devuelve un array; los elementos sin "document" son metadatos.
    return (Array.isArray(resultado) ? resultado : [])
        .filter(function(fila) { return fila && fila.document; })
        .map(function(fila) {
            var campos = mapearCampos(fila.document.fields);
            campos._id = fila.document.name.split('/').pop();
            return campos;
        });
}
