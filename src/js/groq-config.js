// =============================================================
// Transcripción de voz LOCAL con Whisper (100% en el navegador)
// OPTIMIZADO: WebGPU (GPU) > WASM (CPU) con cuantización rápida
// =============================================================

let whisperPipeline = null;
let isModelLoading = false;
let usingBackend = 'wasm';

// Detectar si WebGPU está disponible (5-10x más rápido que WASM)
async function checkWebGPU() {
    try {
        if (!navigator.gpu) return false;
        const adapter = await navigator.gpu.requestAdapter();
        return !!adapter;
    } catch {
        return false;
    }
}

// Cargar modelo Whisper optimizado
async function getWhisperPipeline() {
    if (whisperPipeline) return whisperPipeline;

    if (isModelLoading) {
        while (isModelLoading) {
            await new Promise(r => setTimeout(r, 500));
        }
        return whisperPipeline;
    }

    isModelLoading = true;
    const chatInput = document.getElementById('chatInput');

    try {
        if (chatInput) chatInput.placeholder = 'Preparando reconocimiento de voz...';

        const { pipeline, env } = await import(
            'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3'
        );

        // Configurar backend óptimo
        const hasWebGPU = await checkWebGPU();

        let pipelineOptions = {
            progress_callback: (progress) => {
                if (progress.status === 'downloading' && chatInput) {
                    const pct = progress.progress ? Math.round(progress.progress) : 0;
                    chatInput.placeholder = `Descargando modelo: ${pct}%`;
                } else if (progress.status === 'loading' && chatInput) {
                    chatInput.placeholder = 'Cargando modelo en memoria...';
                }
            }
        };

        if (hasWebGPU) {
            // WebGPU: usa la GPU, MUCHO más rápido
            usingBackend = 'webgpu';
            pipelineOptions.device = 'webgpu';
            pipelineOptions.dtype = 'fp32';
            console.log('🚀 Usando WebGPU (GPU) — transcripción rápida');
        } else {
            // WASM: usa CPU, cuantización q4 para máxima velocidad
            usingBackend = 'wasm';
            pipelineOptions.dtype = 'q4';
            console.log('⚙️ Usando WASM (CPU) con q4 — optimizado para velocidad');
        }

        whisperPipeline = await pipeline(
            'automatic-speech-recognition',
            'Xenova/whisper-tiny',
            pipelineOptions
        );

        console.log('✅ Modelo Whisper listo (' + usingBackend + ')');
        if (chatInput) chatInput.placeholder = 'Escribe un mensaje...';
        return whisperPipeline;

    } catch (error) {
        console.error('Error al cargar modelo Whisper:', error);
        if (chatInput) chatInput.placeholder = 'Escribe un mensaje...';
        throw new Error('No se pudo cargar el modelo de voz.');
    } finally {
        isModelLoading = false;
    }
}

// Transcribir audio (todo local)
async function transcribeAudio(audioBlob) {
    const chatInput = document.getElementById('chatInput');

    try {
        const startTime = Date.now();
        const transcriber = await getWhisperPipeline();

        if (chatInput) chatInput.placeholder = 'Transcribiendo...';

        // Decodificar audio a 16kHz mono (formato que necesita Whisper)
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 16000
        });

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const audioData = audioBuffer.getChannelData(0);

        // Limitar a máximo 30 segundos para velocidad
        const maxSamples = 16000 * 30;
        const trimmedAudio = audioData.length > maxSamples
            ? audioData.slice(0, maxSamples)
            : audioData;

        // Transcribir
        const result = await transcriber(trimmedAudio, {
            language: 'spanish',
            task: 'transcribe'
        });

        audioContext.close();

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`📝 Transcripción completada en ${elapsed}s (${usingBackend})`);

        return result.text || '';

    } catch (error) {
        console.error('Error al transcribir:', error);
        throw error;
    }
}

// Pre-cargar modelo al abrir la página
window.addEventListener('load', () => {
    setTimeout(() => {
        getWhisperPipeline().catch(() => {
            console.warn('Pre-carga del modelo pospuesta');
        });
    }, 2000);
});
