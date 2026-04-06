// Lista de claves API de OpenRouter
// Dividida en 10 partes para ofuscación básica
const p1 = "sk-or-v";
const p2 = "1-75640";
const p3 = "80dc4c6";
const p4 = "d2e071c";
const p5 = "6e39d86";
const p6 = "f04fa16";
const p7 = "27148f1";
const p8 = "1af17d0";
const p9 = "eb4c6f5";
const p10 = "474fe4d2d8";

const OPENROUTER_API_KEYS = [
    p1 + p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9 + p10
];

// Modelos gratuitos de OpenRouter que soportan visión (imágenes)
const OPENROUTER_VISION_MODELS = [
    'qwen/qwen3.6-plus:free',
    'google/gemma-3-27b-it:free',
    'nvidia/nemotron-nano-12b-2-vl:free'
];

async function processImageWithOpenRouter(base64Image, userMessage = "¿Qué ves en esta imagen? Describe brevemente.") {
    for (const apiKey of OPENROUTER_API_KEYS) {
        for (const model of OPENROUTER_VISION_MODELS) {
            try {
                console.log(`Intentando con API Key terminada en ...${apiKey.slice(-6)} y modelo: ${model}`);
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                body: JSON.stringify({
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": userMessage
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": base64Image
                                    }
                                }
                            ]
                        }
                    ]
                })
            });

            if (!response.ok) {
                console.warn(`El modelo ${model} falló con status: ${response.status}`);
                continue; // Probar siguiente modelo
            }

            const data = await response.json();
            if (data && data.choices && data.choices.length > 0) {
                return data.choices[0].message.content; // Retorna si fue exitoso
            }
            } catch (error) {
                console.warn(`Error con el modelo ${model}:`, error);
            }
        }
    }
    
    // Si todos fallan
    throw new Error("Todos los modelos gratuitos fallaron. Por favor, intenta de nuevo más tarde.");
}
