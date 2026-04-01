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
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${text}
                <div class="message-time">${getCurrentTime()}</div>
            </div>
            ${getUserAvatar()}
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
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
    function addIAMessage(text) {
        const processedText = processMarkdown(text);
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ia';
        messageDiv.innerHTML = `
            <img src="../img/IA-1.png" alt="IA Assistant" class="message-avatar-ia">
            <div class="message-content">
                ${processedText}
                <div class="message-time">${getCurrentTime()}</div>
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
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

    // Grabación de audio con Groq Whisper
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let audioContext = null;
    let analyser = null;
    let microphone = null;
    let animationId = null;

    // Función para reproducir sonido
    function playSound(frequency, duration, type = 'sine') {
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
    }

    // Sonido al presionar (beep corto)
    function playStartSound() {
        playSound(800, 0.1);
    }

    // Sonido al soltar (beep más grave)
    function playStopSound() {
        playSound(600, 0.15);
    }

    // Función para animar las barras según el volumen
    function animateVoiceWave() {
        if (!analyser || !isRecording) return;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);

        // Calcular el volumen promedio
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        // Obtener las barras
        const bars = document.querySelectorAll('.recording-bar');
        
        // Orden desde el centro: [3, 2, 1, 0, 4, 5, 6]
        const centerOrder = [3, 2, 1, 0, 4, 5, 6];
        
        // Animar cada barra con valores diferentes basados en el volumen
        bars.forEach((bar, index) => {
            const dataIndex = centerOrder[index];
            const value = dataArray[dataIndex * 15] || average;
            const height = Math.max(8, (value / 255) * 40); // Entre 8px y 40px
            bar.style.height = `${height}px`;
        });

        animationId = requestAnimationFrame(animateVoiceWave);
    }

    // Manejar botón de voz - Presionar para grabar, soltar para detener
    voiceBtn.addEventListener('mousedown', async function(e) {
        e.preventDefault();
        
        if (isRecording) return; // Evitar múltiples grabaciones
        
        // Reproducir sonido de inicio
        playStartSound();
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Configurar análisis de audio
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            microphone = audioContext.createMediaStreamSource(stream);
            analyser.fftSize = 256;
            microphone.connect(analyser);

            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstart = () => {
                isRecording = true;
                voiceBtn.classList.add('recording');
                document.getElementById('recordingIndicator').classList.add('active');
                chatInput.placeholder = 'Escuchando...';
                
                // Iniciar animación de ondas
                animateVoiceWave();
            };

            mediaRecorder.onstop = async () => {
                isRecording = false;
                voiceBtn.classList.remove('recording');
                document.getElementById('recordingIndicator').classList.remove('active');
                chatInput.placeholder = 'Procesando audio...';

                // Detener el stream
                stream.getTracks().forEach(track => track.stop());

                // Crear blob de audio
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                try {
                    // Transcribir con Groq
                    const transcript = await transcribeAudio(audioBlob);
                    chatInput.value = transcript;
                    chatInput.placeholder = 'Escribe un mensaje...';

                    // Enviar mensaje automáticamente si hay texto
                    if (transcript.trim() !== '') {
                        sendMessage();
                    }
                } catch (error) {
                    console.error('Error al transcribir:', error);
                    chatInput.placeholder = 'Escribe un mensaje...';
                    alert('Error al procesar el audio. Intenta de nuevo.');
                }
            };

            mediaRecorder.start();
        } catch (error) {
            console.error('Error al acceder al micrófono:', error);
            alert('No se pudo acceder al micrófono. Verifica los permisos.');
        }
    });

    // Detener grabación al soltar el botón
    document.addEventListener('mouseup', function() {
        if (isRecording && mediaRecorder) {
            // Reproducir sonido de fin
            playStopSound();
            
            mediaRecorder.stop();
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (audioContext) {
                audioContext.close();
            }
        }
    });

    // Mensaje de bienvenida inicial
    addIAMessage('Hola, soy tu asistente de seguridad escolar. Estoy aquí para ayudarte con temas de **gestión de riesgo**, **brigadas de emergencia** y **protocolos de seguridad**.\n\n¿En qué puedo ayudarte hoy?');

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
