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
                        role: 'user',
                        content: userMessage
                    }
                ],
                temperature: 0.7,
                max_tokens: 1024
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
