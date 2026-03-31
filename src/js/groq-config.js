// Configuración de Groq API - Cargada desde JSON
let GROQ_API_KEY = '';
let GROQ_API_URL = '';

// Cargar configuración desde JSON
async function loadGroqConfig() {
    try {
        const response = await fetch('../config/groq-config.json');
        const config = await response.json();
        GROQ_API_KEY = config.groqApiKey;
        GROQ_API_URL = config.groqApiUrl;
    } catch (error) {
        console.error('Error al cargar configuración de Groq:', error);
    }
}

// Inicializar configuración al cargar el script
loadGroqConfig();

// Función para transcribir audio usando Groq Whisper
async function transcribeAudio(audioBlob) {
    try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');
        formData.append('model', 'whisper-large-v3');
        formData.append('language', 'es');
        formData.append('response_format', 'json');

        const response = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Error en la API: ${response.status}`);
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error al transcribir audio:', error);
        throw error;
    }
}
