// Configuración de Mistral API
let MISTRAL_API_KEYS = [];
let MISTRAL_API_URL = '';
let MISTRAL_MODEL = '';

// Cargar configuración desde JSON.
// Soporta "mistralApiKeys" (array, para rotar varias keys y repartir el
// rate limit del plan gratuito) y el formato antiguo "mistralApiKey" (string)
// por retrocompatibilidad.
async function loadMistralConfig() {
    try {
        const response = await fetch('../config/mistral-config.json');
        const config = await response.json();
        if (Array.isArray(config.mistralApiKeys) && config.mistralApiKeys.length > 0) {
            MISTRAL_API_KEYS = config.mistralApiKeys;
        } else if (config.mistralApiKey) {
            MISTRAL_API_KEYS = [config.mistralApiKey];
        }
        MISTRAL_API_URL = config.mistralApiUrl;
        MISTRAL_MODEL = config.model;
    } catch (error) {
        console.error('Error al cargar configuración de Mistral:', error);
    }
}

// Inicializar configuración al cargar el script
loadMistralConfig();

const MISTRAL_SYSTEM_PROMPT = `Eres un asistente especializado en seguridad y gestión de riesgo escolar en Colombia. Tu conocimiento se basa en las normativas colombianas de gestión del riesgo en instituciones educativas.

INSTRUCCIONES DE FORMATO:
- Responde de forma CORTA pero bien estructurada
- USA saltos de línea simples (\n) para separar puntos
- USA doble salto (\n\n) solo para separar secciones importantes
- USA negritas (**texto**) para destacar conceptos clave
- Cuando hagas listas, usa formato moderadamente espaciado:
  **1. Primer punto**
  Explicación breve
  
  **2. Segundo punto**
  Explicación breve
- NO uses emojis
- Máximo 6-8 líneas de respuesta
- Enfócate en información práctica y útil

CONOCIMIENTO BASE:
- Gestión integral del riesgo en instituciones educativas
- Brigadas escolares de emergencia y sus funciones
- Protocolos de evacuación y simulacros
- Identificación de amenazas y vulnerabilidades escolares
- Primeros auxilios básicos en entorno escolar
- Prevención de accidentes en aulas, laboratorios, gimnasios
- Rutas de evacuación y puntos de encuentro
- Manejo de emergencias (incendios, sismos, accidentes)
- Roles y responsabilidades en seguridad escolar
- Normatividad colombiana en gestión del riesgo educativo

Responde siempre de manera organizada y fácil de leer.`;

// Espera en ms, usada entre reintentos ante un 429 de Mistral.
function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function _llamarMistral(userMessage, apiKey) {
    const response = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: MISTRAL_MODEL,
            messages: [
                {
                    role: 'system',
                    content: MISTRAL_SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            temperature: 0.3,
            max_tokens: 300
        })
    });

    if (!response.ok) {
        const err = new Error(`Error en la API: ${response.status}`);
        err.status = response.status;
        err.retryAfter = parseFloat(response.headers.get('Retry-After')) || null;
        throw err;
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// Función para enviar mensaje a Mistral y obtener respuesta.
// Todo el texto se resuelve SIEMPRE con Mistral (OpenRouter queda reservado
// solo para el análisis de imágenes). Ante un 429 "Too Many Requests":
// 1) primero se prueba con la siguiente API key disponible (rotación),
//    ya que el límite de tasa es por key/organización, no por usuario.
// 2) si TODAS las keys están limitadas, se espera con backoff antes de
//    reintentar desde la primera key.
async function getMistralResponse(userMessage) {
    if (MISTRAL_API_KEYS.length === 0 || !MISTRAL_API_URL) {
        await loadMistralConfig();
    }

    const MAX_RONDAS = 2; // vueltas completas por todas las keys
    let ultimoError;

    for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
        for (let i = 0; i < MISTRAL_API_KEYS.length; i++) {
            const apiKey = MISTRAL_API_KEYS[i];
            try {
                return await _llamarMistral(userMessage, apiKey);
            } catch (error) {
                ultimoError = error;
                const esRateLimit = error.status === 429;

                if (!esRateLimit) {
                    console.error('Error al obtener respuesta de Mistral:', error);
                    throw error;
                }

                const quedanKeys = i < MISTRAL_API_KEYS.length - 1;
                if (quedanKeys) {
                    console.warn(`API key #${i + 1} de Mistral con 429, probando con la siguiente key...`);
                    continue;
                }
            }
        }

        // Todas las keys respondieron 429 en esta ronda: esperar antes de reintentar.
        if (ronda < MAX_RONDAS - 1) {
            const espera = ultimoError.retryAfter ? ultimoError.retryAfter * 1000 : (ronda + 1) * 1500;
            console.warn(`Todas las API keys de Mistral respondieron 429, reintentando en ${espera}ms...`);
            await _sleep(espera);
        }
    }

    console.error('Error al obtener respuesta de Mistral:', ultimoError);
    throw ultimoError;
}
