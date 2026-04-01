// Preguntas sobre seguridad escolar: prevención, brigadas y emergencias
const preguntasIA = [
    {
        icon: 'fa-circle-check',
        text: '¿Cómo reportar un peligro o riesgo en la escuela?'
    },
    {
        icon: 'fa-shield-halved',
        text: '¿Cuáles son las medidas de prevención de accidentes?'
    },
    {
        icon: 'fa-bandage',
        text: '¿Cómo aplicar primeros auxilios básicos?'
    },
    {
        icon: 'fa-heart-pulse',
        text: '¿Qué hacer si alguien se lesiona en la escuela?'
    },
    {
        icon: 'fa-triangle-exclamation',
        text: '¿Cuáles son los riesgos más comunes en la escuela?'
    },
    {
        icon: 'fa-person-hiking',
        text: '¿Cuál es el procedimiento de evacuación?'
    },
    {
        icon: 'fa-users',
        text: '¿Cómo funciona la brigada de seguridad?'
    },
    {
        icon: 'fa-eye',
        text: '¿Cuáles son las zonas de riesgo en la escuela?'
    },
    {
        icon: 'fa-handshake',
        text: '¿Quiénes integran la brigada de emergencias?'
    },
    {
        icon: 'fa-warning',
        text: '¿Cómo identificar situaciones de peligro?'
    },
    {
        icon: 'fa-door-open',
        text: '¿Dónde están las salidas de emergencia?'
    },
    {
        icon: 'fa-person-falling',
        text: '¿Cómo prevenir caídas y accidentes?'
    },
    {
        icon: 'fa-flask',
        text: '¿Cuáles son los riesgos en el laboratorio?'
    },
    {
        icon: 'fa-dumbbell',
        text: '¿Cómo usar seguro el equipo del gimnasio?'
    },
    {
        icon: 'fa-utensils',
        text: '¿Cuáles son los riesgos en la cafetería?'
    },
    {
        icon: 'fa-computer',
        text: '¿Cómo mantener segura el aula de informática?'
    },
    {
        icon: 'fa-people-group',
        text: '¿Cómo trabajar en brigadas de seguridad?'
    },
    {
        icon: 'fa-comments',
        text: '¿Cómo reportar situaciones de riesgo?'
    },
    {
        icon: 'fa-person-circle-question',
        text: '¿A quién contactar en caso de emergencia?'
    },
    {
        icon: 'fa-siren',
        text: '¿Qué significan las alarmas de emergencia?'
    },
    {
        icon: 'fa-check-double',
        text: '¿Cómo actuar durante un simulacro?'
    },
    {
        icon: 'fa-exclamation-triangle',
        text: '¿Qué hacer ante un accidente grave?'
    },
    {
        icon: 'fa-person-military-pointing',
        text: '¿Cuáles son los roles en la brigada?'
    },
    {
        icon: 'fa-calendar-check',
        text: '¿Cuándo se realizan los simulacros?'
    },
    {
        icon: 'fa-info',
        text: '¿Dónde obtener información de seguridad?'
    },
    {
        icon: 'fa-lightbulb',
        text: '¿Cómo mejorar la seguridad en la escuela?'
    },
    {
        icon: 'fa-water',
        text: '¿Qué hacer ante derrames o líquidos peligrosos?'
    },
    {
        icon: 'fa-fire-extinguisher',
        text: '¿Dónde están los extintores y cómo usarlos?'
    },
    {
        icon: 'fa-book',
        text: '¿Cuál es el protocolo de seguridad escolar?'
    },
    {
        icon: 'fa-shield-virus',
        text: '¿Cómo prevenir situaciones de violencia?'
    },
    {
        icon: 'fa-heart',
        text: '¿Cómo apoyar a compañeros en crisis?'
    },
    {
        icon: 'fa-brain',
        text: '¿Cómo manejar situaciones de pánico?'
    },
    {
        icon: 'fa-graduation-cap',
        text: '¿Cuáles son mis responsabilidades en seguridad?'
    },
    {
        icon: 'fa-gavel',
        text: '¿Qué debo hacer si presencio un accidente?'
    },
    {
        icon: 'fa-clipboard-check',
        text: '¿Cómo participar en brigadas de seguridad?'
    },
    {
        icon: 'fa-map',
        text: '¿Cuál es el mapa de rutas de evacuación?'
    },
    {
        icon: 'fa-person-military-pointing',
        text: '¿Cómo ser responsable en seguridad escolar?'
    },
    {
        icon: 'fa-exclamation',
        text: '¿Qué hacer si alguien necesita ayuda inmediata?'
    },
    {
        icon: 'fa-stethoscope',
        text: '¿Cuáles son los primeros auxilios para quemaduras?'
    },
    {
        icon: 'fa-hand-fist',
        text: '¿Cómo intervenir de forma segura en conflictos?'
    },
    {
        icon: 'fa-eye-slash',
        text: '¿Cómo actuar ante situaciones de acoso?'
    },
    {
        icon: 'fa-door-closed',
        text: '¿Cómo mantener seguras las áreas comunes?'
    },
    {
        icon: 'fa-wind',
        text: '¿Cómo actuar ante condiciones climáticas peligrosas?'
    },
    {
        icon: 'fa-bicycle',
        text: '¿Cómo llegar seguro a la escuela?'
    },
    {
        icon: 'fa-bus',
        text: '¿Cómo viajar seguro en transporte escolar?'
    }
];

// Función para mezclar array (Fisher-Yates)
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Función para obtener preguntas aleatorias
function getRandomQuestions(count = 4) {
    const shuffled = shuffleArray(preguntasIA);
    return shuffled.slice(0, count);
}

// Función para generar los botones de preguntas
function generateQuestionButtons() {
    const suggestionsContainer = document.querySelector('.ia-suggestions');
    if (!suggestionsContainer) return;

    // Limpiar botones existentes
    suggestionsContainer.innerHTML = '';

    // Obtener preguntas aleatorias
    const preguntas = getRandomQuestions(4);

    // Crear botones
    preguntas.forEach(pregunta => {
        const button = document.createElement('button');
        button.className = 'ia-suggestion-btn';
        button.innerHTML = `
            <i class="fa-solid ${pregunta.icon}"></i>
            <span>${pregunta.text}</span>
            <i class="fa-solid fa-chevron-right"></i>
        `;
        
        // Al hacer clic, enviar la pregunta al chat
        button.addEventListener('click', function() {
            // Guardar la pregunta en localStorage
            localStorage.setItem('preguntaIA', pregunta.text);
            // Redirigir al chat
            window.location.href = 'chat-ia.html';
        });

        suggestionsContainer.appendChild(button);
    });
}

// Generar preguntas cuando carga la página
document.addEventListener('DOMContentLoaded', function() {
    generateQuestionButtons();
});
