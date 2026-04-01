// Configuración de Mistral API
let MISTRAL_API_KEY = '';
let MISTRAL_API_URL = '';
let MISTRAL_MODEL = '';

// Cargar configuración desde JSON
async function loadMistralConfig() {
    try {
        const response = await fetch('../config/mistral-config.json');
        const config = await response.json();
        MISTRAL_API_KEY = config.mistralApiKey;
        MISTRAL_API_URL = config.mistralApiUrl;
        MISTRAL_MODEL = config.model;
    } catch (error) {
        console.error('Error al cargar configuración de Mistral:', error);
    }
}

// Inicializar configuración al cargar el script
loadMistralConfig();

// Función para enviar mensaje a Mistral y obtener respuesta
async function getMistralResponse(userMessage) {
    try {
        const systemPrompt = `Eres un asistente especializado en seguridad y gestión de riesgo escolar en Colombia. Tu conocimiento se basa en las normativas colombianas de gestión del riesgo en instituciones educativas.

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

        const response = await fetch(MISTRAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: MISTRAL_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
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
            throw new Error(`Error en la API: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('Error al obtener respuesta de Mistral:', error);
        throw error;
    }
}
