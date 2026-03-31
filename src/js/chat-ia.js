// Chat IA JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');
    const voiceBtn = document.getElementById('voiceBtn');
    const sendBtn = document.getElementById('sendBtn');

    // Función para obtener la hora actual
    function getCurrentTime() {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
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

    // Manejar botón de voz (por ahora solo muestra un mensaje)
    voiceBtn.addEventListener('click', function() {
        alert('Funcionalidad de voz próximamente');
    });

    // Mensaje de bienvenida inicial (opcional)
    // addIAMessage('¡Hola! Soy tu asistente de IA. ¿En qué puedo ayudarte hoy?');
});
