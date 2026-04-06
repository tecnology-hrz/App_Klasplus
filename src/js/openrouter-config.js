// Lista de claves API de OpenRouter para respaldo
const OPENROUTER_API_KEYS = [
    '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',
    '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',
    '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',
    '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'
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
