// Chat IA JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');

    // Obtener datos del usuario
    const userName = localStorage.getItem('userName');
    const userPhoto = localStorage.getItem('userPhoto');

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

    // Función para agregar mensaje de la IA
    function addIAMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ia';
        messageDiv.innerHTML = `
            <div class="message-content">
                ${text}
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

            // Simular respuesta de la IA
            showTypingIndicator();
            setTimeout(() => {
                removeTypingIndicator();
                addIAMessage('Gracias por tu mensaje. Estoy aquí para ayudarte con cualquier pregunta sobre seguridad escolar.');
            }, 1500);
        }
    }

    // Manejar envío de mensaje con Enter
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
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

    // Manejar botón de voz
    voiceBtn.addEventListener('click', async function() {
        if (isRecording) {
            // Detener grabación
            mediaRecorder.stop();
            if (animationId) {
                cancelAnimationFrame(animationId);
            }
            if (audioContext) {
                audioContext.close();
            }
        } else {
            // Iniciar grabación
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
        }
    });

    // Mensaje de bienvenida inicial (opcional)
    // addIAMessage('¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?');
});
