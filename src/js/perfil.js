// Verificar autenticación
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userPhoto = localStorage.getItem('userPhoto');

    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    // Cargar datos del usuario
    cargarDatosUsuario(userName, userPhoto);
});

// Cargar datos del usuario
function cargarDatosUsuario(userName, userPhoto) {
    // Actualizar nombre
    const profileNameElement = document.getElementById('profileName');
    if (profileNameElement) {
        profileNameElement.textContent = userName || 'Usuario';
    }
    
    // Actualizar foto de perfil si existe
    if (userPhoto && userPhoto !== '' && userPhoto !== 'null') {
        const profilePhoto = document.getElementById('profilePhoto');
        const placeholder = document.getElementById('profilePhotoPlaceholder');
        
        profilePhoto.src = userPhoto;
        profilePhoto.style.display = 'block';
        placeholder.style.display = 'none';
    } else {
        // Mostrar inicial del nombre
        const inicial = (userName || 'U').charAt(0).toUpperCase();
        const placeholderElement = document.getElementById('profilePhotoPlaceholder');
        if (placeholderElement) {
            placeholderElement.innerHTML = `<i class="fa-solid fa-user"></i>`;
        }
    }
}

// Botón de volver atrás
document.getElementById('backBtn').addEventListener('click', () => {
    // Redirigir al dashboard según el rol del usuario
    const userRole = localStorage.getItem('userRole');
    const roleMap = {
        'estudiante': 'dashboard-estudiante.html',
        'profesor': 'dashboard-profesor.html',
        'admin': 'dashboard-admin.html',
        'coordinador': 'dashboard-coordinador.html',
        'institucion': 'dashboard-institucion.html'
    };
    const dashboardPage = roleMap[userRole?.toLowerCase()] || 'dashboard-estudiante.html';
    window.location.href = dashboardPage;
});

// Botón de notificaciones
document.getElementById('notificationBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
});

// Botón de editar perfil
document.getElementById('editarPerfilBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Editar Perfil', '<i class="fa-solid fa-pen"></i>');
});

// Botón de estadísticas
document.getElementById('estadisticasBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Estadísticas', '<i class="fa-solid fa-chart-simple"></i>');
});

// Botón de notificaciones (opción del menú)
document.getElementById('notificacionesBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
});

// Botón de configuración
document.getElementById('configuracionBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Configuración', '<i class="fa-solid fa-gear"></i>');
});

// Botón de cerrar sesión
document.getElementById('cerrarSesionBtn').addEventListener('click', () => {
    // Crear modal de confirmación
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const container = document.createElement('div');
    container.className = 'development-modal-container';
    container.style.maxWidth = '400px';
    container.innerHTML = `
        <div class="development-content">
            <div class="development-icon"><i class="fa-solid fa-power-off"></i></div>
            <h2 class="development-title">Cerrar Sesión</h2>
            <p class="development-message">¿Estás seguro de que deseas cerrar sesión?</p>
            <div style="display: flex; gap: 15px; margin-top: 20px; width: 100%;">
                <button id="cancelarBtn" style="
                    flex: 1;
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: 2px solid #0047B3;
                    background: white;
                    color: #0047B3;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Cancelar</button>
                <button id="confirmarBtn" style="
                    flex: 1;
                    padding: 12px 24px;
                    border-radius: 12px;
                    border: none;
                    background: #FF0000;
                    color: white;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Cerrar Sesión</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(container);
    document.body.appendChild(overlay);
    
    // Botón cancelar
    container.querySelector('#cancelarBtn').addEventListener('click', () => {
        overlay.remove();
    });
    
    // Botón confirmar
    container.querySelector('#confirmarBtn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
    
    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
});

// Navegación inferior
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
        const section = item.dataset.section;
        
        if (section === 'inicio') {
            // Redirigir al dashboard según el rol del usuario
            const userRole = localStorage.getItem('userRole');
            const roleMap = {
                'estudiante': 'dashboard-estudiante.html',
                'profesor': 'dashboard-profesor.html',
                'admin': 'dashboard-admin.html',
                'coordinador': 'dashboard-coordinador.html',
                'institucion': 'dashboard-institucion.html'
            };
            const dashboardPage = roleMap[userRole?.toLowerCase()] || 'dashboard-estudiante.html';
            window.location.href = dashboardPage;
        } else if (section === 'brigada') {
            window.location.href = 'dashboard-brigada.html';
        } else if (section === 'emergencia') {
            // Mostrar modal de emergencia
            mostrarModalEmergencia();
        } else if (section === 'ia') {
            window.location.href = 'dashboard-ia.html';
        } else if (section === 'perfil') {
            // Ya estamos en perfil
            return;
        }
    });
});

// Función para mostrar modal de sección en desarrollo
function mostrarModalDesarrollo(seccion, icono) {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.className = 'development-modal-container';
    container.innerHTML = `
        <button class="development-close-btn">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#0047B3"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </button>
        
        <div class="development-content">
            <div class="development-icon">${icono}</div>
            <h2 class="development-title">Sección en Desarrollo</h2>
            <p class="development-message">La sección de <strong>${seccion}</strong> está actualmente en desarrollo.</p>
            <p class="development-submessage">Pronto estará disponible con nuevas funcionalidades.</p>
            <div class="development-tools">
                <div class="tool-icon"><i class="fa-solid fa-wrench"></i></div>
                <span class="tool-text">Función de Herramienta</span>
            </div>
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Cerrar con el botón X
    container.querySelector('.development-close-btn').addEventListener('click', () => {
        overlay.remove();
    });

    // Cerrar al hacer clic fuera del modal
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
}

// Función para mostrar modal de emergencia
function mostrarModalEmergencia() {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.className = 'emergency-modal-container';
    container.innerHTML = `
        <button class="emergency-close-btn">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" fill="#FF0000"/>
                <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </button>
        
        <div class="emergency-options">
            <button class="emergency-option" data-numero="125" data-servicio="Ambulancia">
                <img src="../img/ambulancia_cel.png" alt="Ambulancia">
            </button>
            
            <button class="emergency-option" data-numero="119" data-servicio="Bomberos">
                <img src="../img/bomberos_cel.png" alt="Bomberos">
            </button>
        </div>
        
        <div class="emergency-arrows">
            <img src="../img/flechas.png" alt="Flechas" class="arrows-animation">
        </div>
    `;

    overlay.appendChild(container);
    document.body.appendChild(overlay);

    // Cerrar modal con el botón X
    container.querySelector('.emergency-close-btn').addEventListener('click', () => {
        overlay.remove();
    });

    // Manejar clics en las opciones de emergencia
    container.querySelectorAll('.emergency-option').forEach(option => {
        option.addEventListener('click', () => {
            const numero = option.dataset.numero;
            const servicio = option.dataset.servicio;
            
            console.log(`Llamando a ${servicio}: ${numero}`);
            
            // Abrir el marcador del teléfono
            window.location.href = `tel:${numero}`;
            
            // Cerrar el modal
            overlay.remove();
        });
    });

    // No cerrar al hacer clic fuera del modal (solo con el botón X)
}
