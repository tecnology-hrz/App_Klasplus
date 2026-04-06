// Chat IA JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');

    // Obtener datos del usuario
    const userName = localStorage.getItem('userName');
    const userPhoto = localStorage.getItem('userPhoto');
    const preguntaIA = localStorage.getItem('preguntaIA');

    // Si hay una pregunta del dashboard, enviarla automáticamente
    if (preguntaIA) {
        setTimeout(() => {
            chatInput.value = preguntaIA;
            sendMessage();
            localStorage.removeItem('preguntaIA'); // Limpiar después de usar
        }, 500);
    }

    // Función para obtener la hora actual
    function getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Función para obtener avatar del usuario
    function getUserAvatar() {
        if (userPhoto && userPhoto !== '' && userPhoto !== 'null') {
            return `<img src="${userPhoto}" alt="Usuario" class="message-avatar">`;
        } else if (userName) {
            const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            return `<div class="message-avatar-placeholder">${initials}</div>`;
        } else {
            return `<div class="message-avatar-placeholder">U</div>`;
        }
    }

    // Función para agregar mensaje del usuario
    function addUserMessage(text, save = true, time = getCurrentTime()) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${text}
                <div class="message-time">${time}</div>
            </div>
            ${getUserAvatar()}
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        if (save) {
            let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
            history.push({ role: 'user', text: text, time: time });
            localStorage.setItem('chatHistory', JSON.stringify(history));
        }
    }

    // Función para procesar markdown básico (negritas y saltos de línea)
    function processMarkdown(text) {
        // Convertir **texto** a <strong>texto</strong>
        text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convertir doble salto de línea a un espacio moderado
        text = text.replace(/\n\n/g, '<br><div style="margin: 8px 0;"></div>');
        
        // Convertir salto de línea simple a <br>
        text = text.replace(/\n/g, '<br>');
        
        return text;
    }

    // Función para agregar mensaje de la IA
    function addIAMessage(text, save = true, time = getCurrentTime()) {
        const processedText = processMarkdown(text);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ia';
        messageDiv.innerHTML = `
            <img src="../img/IA-1.png" alt="IA Assistant" class="message-avatar-ia">
            <div class="message-content">
                ${processedText}
                <div class="message-time">${time}</div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();

        if (save) {
            let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
            history.push({ role: 'ia', text: text, time: time });
            localStorage.setItem('chatHistory', JSON.stringify(history));
        }
    }

    // Función para mostrar indicador de escritura
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message ia';
        typingDiv.id = 'typingIndicator';
        typingDiv.innerHTML = `
            <img src="../img/IA-1.png" alt="IA Assistant" class="message-avatar-ia">
            <div class="typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        scrollToBottom();
    }

    // Función para remover indicador de escritura
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Función para hacer scroll al final
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Función para enviar mensaje
    function sendMessage() {
        if (chatInput.value.trim() !== '') {
            const userMessage = chatInput.value.trim();
            addUserMessage(userMessage);
            chatInput.value = '';

            // Mostrar indicador de escritura
            showTypingIndicator();
            
            // Obtener respuesta de Mistral
            getMistralResponse(userMessage)
                .then(response => {
                    removeTypingIndicator();
                    addIAMessage(response);
                    speakText(response);
                })
                .catch(error => {
                    removeTypingIndicator();
                    addIAMessage('Lo siento, hubo un error al procesar tu pregunta. Intenta de nuevo.');
                });
        }
    }

    // Manejar envío de mensaje con Enter
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Mostrar/ocultar botón de enviar según el contenido
    chatInput.addEventListener('input', function() {
        if (chatInput.value.trim() !== '') {
            sendBtn.classList.add('visible');
            voiceBtn.classList.add('hidden');
        } else {
            sendBtn.classList.remove('visible');
            voiceBtn.classList.remove('hidden');
        }
    });

    // Manejar clic en botón de enviar
    sendBtn.addEventListener('click', sendMessage);

    // ===== SISTEMA DE TEXTO A VOZ (TTS) =====
    // Inicializar según sesión
    // ===== SISTEMA DE TEXTO A VOZ (WEB SPEECH NATIVO) =====
    // Inicializar según sesión
    let isTTSActive = localStorage.getItem('chatVoiceActive') === 'true';
    let ttsVoice = null;
    const voiceSelect = document.getElementById('voiceSelect');

    function populateVoiceList() {
        if (!voiceSelect) return;
        const voices = window.speechSynthesis.getVoices();
        const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
        
        voiceSelect.innerHTML = '';
        if (spanishVoices.length === 0) {
            voiceSelect.innerHTML = '<option value="">Sin voces en español</option>';
            return;
        }

        spanishVoices.forEach(voice => {
            const option = document.createElement('option');
            option.textContent = `${voice.name}`;
            option.value = voice.voiceURI;
            voiceSelect.appendChild(option);
        });
        
        if (ttsVoice) {
            voiceSelect.value = ttsVoice.voiceURI;
        }
    }

    function setupTTSVoice() {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            setTimeout(setupTTSVoice, 100);
            return;
        }

        const spanishVoices = voices.filter(v => v.lang.startsWith('es'));
        if (spanishVoices.length === 0) return;

        let bestVoice = null;
        const savedVoiceURI = localStorage.getItem('chatVoiceURI');
        
        // 0. Preferencia manual del usuario
        if (savedVoiceURI) {
            bestVoice = spanishVoices.find(v => v.voiceURI === savedVoiceURI);
        }

        // 1. Prioridad automática: Jorge (por si estás en Edge)
        if (!bestVoice) {
            bestVoice = spanishVoices.find(v => v.name.includes('Jorge'));
        }
        
        // 2. Prioridad Móvil (APK/Android): Motor nativo de Google
        if (!bestVoice) {
            bestVoice = spanishVoices.find(v => v.name.includes('Google'));
        }

        // 3. Prioridad: Español Latino / México
        if (!bestVoice) {
            bestVoice = spanishVoices.find(v => v.lang.includes('MX') || v.name.includes('Latam') || v.name.includes('América'));
        }

        // 4. Voz predeterminada del sistema
        if (!bestVoice) {
            bestVoice = spanishVoices.find(v => v.default);
        }

        // 5. Fallback: Cualquier voz en español
        if (!bestVoice) {
            bestVoice = spanishVoices[0];
        }

        ttsVoice = bestVoice;
        console.log("🗣️ Voz nativa seleccionada:", ttsVoice ? ttsVoice.name : "Ninguna");
        
        populateVoiceList();
    }

    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = setupTTSVoice;
        setupTTSVoice(); // Intentar cargar inicial si ya existen
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', (e) => {
            localStorage.setItem('chatVoiceURI', e.target.value);
            setupTTSVoice();
        });
    }

    const toggleVoiceModalBtn = document.getElementById('toggleVoiceModalBtn');

    function updateVoiceToggleUI() {
        if (isTTSActive) {
            if (toggleVoiceModalBtn) {
                toggleVoiceModalBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i> <span id="toggleVoiceText">Voz: Activada</span>';
            }
            if (!ttsVoice && window.speechSynthesis) setupTTSVoice();
        } else {
            if (toggleVoiceModalBtn) {
                toggleVoiceModalBtn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> <span id="toggleVoiceText">Voz: Desactivada</span>';
            }
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        }
        localStorage.setItem('chatVoiceActive', isTTSActive);
    }

    if (toggleVoiceModalBtn) {
        toggleVoiceModalBtn.addEventListener('click', () => {
            isTTSActive = !isTTSActive;
            updateVoiceToggleUI();
        });
    }

    // Inicializar UI al cargar
    updateVoiceToggleUI();

    function speakText(htmlText) {
        if (!isTTSActive || !window.speechSynthesis) return;

        // Limpiar texto de Markdown/HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlText;
        let cleanText = tempDiv.textContent || tempDiv.innerText || '';
        
        // Quitar asteriscos del markdown para que no los lea
        cleanText = cleanText.replace(/\*/g, '');

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        
        if (!ttsVoice) setupTTSVoice();
        
        // Solo reproducir si realmente tenemos una voz válida (no bloqueada)
        if (ttsVoice) {
            utterance.voice = ttsVoice;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        } else {
            console.warn('Bloqueado: No se enviará a hablar porque solo están disponibles voces indeseadas (como Helena/Pablo).');
        }
    }

    // ===== SISTEMA DE VOZ HÍBRIDO (Nativo móvil + Groq desktop) =====
    // Elementos del UI de grabación
    const normalInputState = document.getElementById('normalInputState');
    const recordingInputState = document.getElementById('recordingInputState');
    const recordingCancelBtn = document.getElementById('recordingCancelBtn');
    const recordingSendBtn = document.getElementById('recordingSendBtn');
    const recordingTimerEl = document.getElementById('recordingTimer');

    // Detectar plataforma
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const canUseNativeVoice = !!SpeechRecognition;

    // Elegir método: móvil usa reconocimiento nativo, desktop usa Groq
    const useNativeVoice = isMobile && canUseNativeVoice;
    console.log(`🎤 Modo de voz: ${useNativeVoice ? 'Nativo del dispositivo' : 'Groq Whisper (grabación)'}`);

    // Estado de grabación
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let recordingStream = null;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationId = null;
    let timerInterval = null;
    let recordingStartTime = null;
    let speechRecognizer = null;
    let nativeTranscript = '';
    let livePreview = '';

    // Función para reproducir sonido
    function playSound(frequency, duration, type = 'sine') {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = frequency;
            oscillator.type = type;
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    function playStartSound() { playSound(800, 0.1); }
    function playStopSound() { playSound(600, 0.15); }

    // Actualizar cronómetro
    function updateTimer() {
        if (!recordingStartTime) return;
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        recordingTimerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    // Animar barras (volumen real con analyser, o simulado sin él)
    function animateRecordingBars() {
        if (!isRecording) return;

        const bars = document.querySelectorAll('.rec-bar');

        if (analyser) {
            // Ondas reales basadas en micrófono
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(dataArray);
            const totalBars = bars.length;
            const chunkSize = Math.floor(dataArray.length / totalBars);

            bars.forEach((bar, i) => {
                let sum = 0;
                for (let j = 0; j < chunkSize; j++) {
                    sum += dataArray[i * chunkSize + j];
                }
                const avg = sum / chunkSize;
                const height = Math.max(4, (avg / 255) * 36);
                bar.style.height = `${height}px`;
            });
        } else {
            // Ondas simuladas (para reconocimiento nativo sin analyser)
            bars.forEach((bar, i) => {
                const height = 4 + Math.abs(Math.sin(Date.now() / 180 + i * 0.7)) * 32;
                bar.style.height = `${height}px`;
            });
        }

        animationId = requestAnimationFrame(animateRecordingBars);
    }

    // Mostrar UI de grabación
    function showRecordingUI() {
        normalInputState.classList.add('hidden-for-recording');
        recordingInputState.classList.add('active');
    }

    // Ocultar UI de grabación
    function hideRecordingUI() {
        normalInputState.classList.remove('hidden-for-recording');
        recordingInputState.classList.remove('active');
        recordingTimerEl.textContent = '0:00';
        document.querySelectorAll('.rec-bar').forEach(bar => {
            bar.style.height = '8px';
        });
    }

    // ==========================================
    // MODO NATIVO (Móvil/APK) — Web Speech API
    // ==========================================
    function startNativeRecognition() {
        if (isRecording) return;

        nativeTranscript = '';
        livePreview = '';

        function createRecognizer() {
            speechRecognizer = new SpeechRecognition();
            speechRecognizer.lang = 'es-ES';
            speechRecognizer.continuous = false;
            speechRecognizer.interimResults = true;
            speechRecognizer.maxAlternatives = 1;

            speechRecognizer.onresult = (event) => {
                if (!isRecording) return; // Evitar que escriba en el placeholder después de haber enviado el mensaje

                // Solo tomar el resultado de ESTA sesión
                let sessionText = '';
                for (let i = 0; i < event.results.length; i++) {
                    sessionText += event.results[i][0].transcript;
                }
                // Mostrar en tiempo real: lo acumulado + lo de esta sesión
                const preview = nativeTranscript
                    ? nativeTranscript + ' ' + sessionText
                    : sessionText;
                chatInput.placeholder = preview || 'Escuchando...';

                // SIEMPRE guardar lo que se ve en pantalla (para enviar)
                livePreview = preview.trim();

                // Si el resultado es final, guardarlo como base permanente
                if (event.results[event.results.length - 1].isFinal) {
                    nativeTranscript = preview.trim();
                }
            };

            speechRecognizer.onerror = (event) => {
                console.warn('Error reconocimiento:', event.error);
                if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
                    stopAllRecording();
                    showError(
                        'Permite el acceso al micrófono en los ajustes de la app.',
                        'Micrófono no disponible'
                    );
                }
                // 'no-speech' es normal — silencio, se reinicia solo
            };

            speechRecognizer.onend = () => {
                // Reiniciar si sigue grabando (nueva sesión limpia)
                if (isRecording) {
                    try {
                        createRecognizer();
                        speechRecognizer.start();
                    } catch(e) {}
                }
            };
        }

        try {
            createRecognizer();
            speechRecognizer.start();
        } catch(e) {
            console.error('No se pudo iniciar reconocimiento:', e);
            showError('No se pudo activar el reconocimiento de voz.', 'Error de voz');
            return;
        }

        isRecording = true;
        recordingStartTime = Date.now();
        playStartSound();
        showRecordingUI();
        chatInput.placeholder = 'Escuchando...';
        timerInterval = setInterval(updateTimer, 1000);
        animateRecordingBars();
    }

    function stopNativeAndSend() {
        if (!isRecording) return;

        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);
        playStopSound();

        if (speechRecognizer) {
            speechRecognizer.onend = null;
            speechRecognizer.stop();
            speechRecognizer = null;
        }

        isRecording = false;
        hideRecordingUI();
        chatInput.placeholder = 'Escribe un mensaje...';

        // Usar livePreview (lo que ve el usuario) si nativeTranscript está vacío
        const textToSend = (nativeTranscript || livePreview || '').trim();

        if (textToSend !== '') {
            chatInput.value = textToSend;
            sendMessage();
        } else {
            showWarning(
                'No se detectó ninguna palabra. Habla más cerca del micrófono.',
                'Sin voz detectada'
            );
        }

        nativeTranscript = '';
        livePreview = '';
    }

    function cancelNativeRecognition() {
        if (!isRecording) return;

        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);

        if (speechRecognizer) {
            speechRecognizer.onend = null;
            speechRecognizer.abort();
            speechRecognizer = null;
        }

        isRecording = false;
        nativeTranscript = '';
        hideRecordingUI();
        chatInput.placeholder = 'Escribe un mensaje...';
    }

    // ==========================================
    // MODO GROQ (Desktop) — MediaRecorder + API
    // ==========================================
    async function startGroqRecording() {
        if (isRecording) return;

        try {
            recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(recordingStream);
            analyser.fftSize = 256;
            microphone.connect(analyser);

            mediaRecorder = new MediaRecorder(recordingStream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.start();
            isRecording = true;
            recordingStartTime = Date.now();

            playStartSound();
            showRecordingUI();
            timerInterval = setInterval(updateTimer, 1000);
            animateRecordingBars();

        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            showError(
                'No se pudo acceder al micrófono. Verifica los permisos del navegador.',
                'Micrófono no disponible'
            );
        }
    }

    async function stopGroqAndSend() {
        if (!isRecording || !mediaRecorder) return;

        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);
        playStopSound();

        return new Promise((resolve) => {
            mediaRecorder.onstop = async () => {
                isRecording = false;
                recordingStream.getTracks().forEach(track => track.stop());
                if (audioContext) audioContext.close();
                analyser = null;

                hideRecordingUI();
                chatInput.placeholder = 'Procesando audio...';

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                if (audioBlob.size < 1000) {
                    chatInput.placeholder = 'Escribe un mensaje...';
                    showWarning('La grabación fue muy corta.', 'Grabación muy corta');
                    resolve();
                    return;
                }

                try {
                    const transcript = await transcribeAudio(audioBlob);
                    chatInput.placeholder = 'Escribe un mensaje...';

                    if (transcript && transcript.trim() !== '') {
                        chatInput.value = transcript;
                        sendMessage();
                    } else {
                        showWarning('No se detectó voz.', 'Sin voz detectada');
                    }
                } catch (error) {
                    console.error('Error al transcribir:', error);
                    chatInput.placeholder = 'Escribe un mensaje...';
                    const msg = error.message || '';

                    if (msg.includes('401')) {
                        showModal({
                            type: 'error',
                            title: 'API Key expirada',
                            message: 'La clave de transcripción está expirada. Contacta al administrador.',
                            confirmText: 'Entendido'
                        });
                    } else if (msg.includes('429')) {
                        showModal({
                            type: 'warning',
                            title: 'Límite alcanzado',
                            message: 'Intenta de nuevo en unos minutos.',
                            confirmText: 'Entendido'
                        });
                    } else {
                        showError('Error al procesar el audio. Verifica tu conexión.', 'Error de transcripción');
                    }
                }
                resolve();
            };
            mediaRecorder.stop();
        });
    }

    function cancelGroqRecording() {
        if (!isRecording) return;

        clearInterval(timerInterval);
        cancelAnimationFrame(animationId);

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = () => {};
            mediaRecorder.stop();
        }
        if (recordingStream) {
            recordingStream.getTracks().forEach(track => track.stop());
        }
        if (audioContext) {
            audioContext.close();
            analyser = null;
        }

        isRecording = false;
        audioChunks = [];
        hideRecordingUI();
    }

    // ==========================================
    // Función general para detener todo
    // ==========================================
    function stopAllRecording() {
        cancelNativeRecognition();
        cancelGroqRecording();
    }

    // ==========================================
    // EVENT LISTENERS — Usan el método correcto
    // ==========================================
    voiceBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (useNativeVoice) {
            startNativeRecognition();
        } else {
            startGroqRecording();
        }
    });

    recordingSendBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (useNativeVoice) {
            stopNativeAndSend();
        } else {
            stopGroqAndSend();
        }
    });

    recordingCancelBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (useNativeVoice) {
            cancelNativeRecognition();
        } else {
            cancelGroqRecording();
        }
    });

    // Carga de historial y msj de bienvenida
    let loadedHistory = JSON.parse(localStorage.getItem('chatHistory')) || [];
    if (loadedHistory.length === 0) {
        addIAMessage('Hola, soy tu asistente de seguridad escolar. Estoy aquí para ayudarte con temas de **gestión de riesgo**, **brigadas de emergencia** y **protocolos de seguridad**.\n\n¿En qué puedo ayudarte hoy?');
    } else {
        loadedHistory.forEach(msg => {
            if (msg.role === 'user') {
                addUserMessage(msg.text, false, msg.time);
            } else {
                addIAMessage(msg.text, false, msg.time);
            }
        });
    }

    // ===== MODAL DE CONFIGURACIÓN =====
    const settingsBtn = document.getElementById('settingsBtn');
    const chatSettingsModal = document.getElementById('chatSettingsModal');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');

    if (settingsBtn && chatSettingsModal) {
        settingsBtn.addEventListener('click', () => {
            chatSettingsModal.style.display = 'flex';
        });

        closeSettingsBtn.addEventListener('click', () => {
            chatSettingsModal.style.display = 'none';
        });

        chatSettingsModal.addEventListener('click', (e) => {
            if (e.target === chatSettingsModal) {
                chatSettingsModal.style.display = 'none';
            }
        });
    }

    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', () => {
            localStorage.removeItem('chatHistory');
            chatMessages.innerHTML = '';
            chatSettingsModal.style.display = 'none';
            addIAMessage('Hola, soy tu asistente de seguridad escolar. Estoy aquí para ayudarte con temas de **gestión de riesgo**, **brigadas de emergencia** y **protocolos de seguridad**.\n\n¿En qué puedo ayudarte hoy?', true);
        });
    }

    // Botón de notificaciones
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
        });
    }

    // Función para mostrar modal de sección en desarrollo
    function mostrarModalDesarrollo(seccion, icono) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;

        // Crear contenedor del modal
        const container = document.createElement('div');
        container.className = 'development-modal-container';
        container.style.cssText = `
            background: white;
            border-radius: 25px;
            padding: 40px 30px;
            max-width: 450px;
            width: 90%;
            box-shadow: 0 15px 50px rgba(0, 0, 0, 0.3);
            transform: scale(0.9);
            animation: scaleIn 0.3s ease forwards;
            position: relative;
            text-align: center;
        `;
        
        container.innerHTML = `
            <button class="development-close-btn" onclick="this.closest('.modal-overlay').remove()" style="
                position: absolute;
                top: 15px;
                right: 15px;
                background: none;
                border: none;
                cursor: pointer;
                padding: 0;
                width: 40px;
                height: 40px;
                transition: transform 0.3s ease;
            ">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
                    <circle cx="12" cy="12" r="10" fill="#0047B3"/>
                    <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </button>
            
            <div class="development-content" style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                <div class="development-icon" style="font-size: 60px; margin-bottom: 10px; color: #0047B3;">${icono}</div>
                <h2 class="development-title" style="color: #0047B3; font-size: 28px; font-weight: 700; margin: 0;">Sección en Desarrollo</h2>
                <p class="development-message" style="color: #333; font-size: 18px; margin: 0; line-height: 1.4;">La sección de <strong>${seccion}</strong> está actualmente en desarrollo.</p>
                <p class="development-submessage" style="color: #666; font-size: 16px; margin: 0; line-height: 1.4;">Pronto estará disponible con nuevas funcionalidades.</p>
                <div class="development-tools" style="display: flex; align-items: center; gap: 12px; background: #F0F7FF; padding: 15px 25px; border-radius: 15px; border: 2px solid #E3F2FD; margin-top: 10px;">
                    <div class="tool-icon" style="font-size: 24px; color: #0047B3;"><i class="fa-solid fa-wrench"></i></div>
                    <span class="tool-text" style="color: #0047B3; font-weight: 600; font-size: 16px;">Función de Herramienta</span>
                </div>
            </div>
        `;

        // Agregar animación CSS
        const style = document.createElement('style');
        style.textContent = `
            @keyframes scaleIn {
                to {
                    transform: scale(1);
                }
            }
        `;
        document.head.appendChild(style);

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Cerrar al hacer clic fuera del modal
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }
});
