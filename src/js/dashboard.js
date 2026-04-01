// Dashboard común para todos los roles
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const userRole = localStorage.getItem('userRole');
    const userPhoto = localStorage.getItem('userPhoto');

    if (!userId) {
        // Si no hay sesión, redirigir al login
        window.location.href = 'login.html';
        return;
    }

    // Mostrar nombre del usuario
    const userNameElement = document.getElementById('userName');
    if (userNameElement && userName) {
        userNameElement.textContent = userName;
    }

    // Mostrar nombre en la tarjeta de bienvenida
    const welcomeUserName = document.getElementById('welcomeUserName');
    if (welcomeUserName && userName) {
        welcomeUserName.textContent = userName;
    }

    // Mostrar foto del usuario o iniciales
    const userAvatar = document.getElementById('userAvatar');
    const userAvatarPlaceholder = document.getElementById('userAvatarPlaceholder');
    
    if (userPhoto && userPhoto !== '' && userPhoto !== 'null') {
        userAvatar.src = userPhoto;
        userAvatar.style.display = 'block';
        if (userAvatarPlaceholder) {
            userAvatarPlaceholder.style.display = 'none';
        }
    } else if (userAvatarPlaceholder && userName) {
        // Mostrar iniciales
        const initials = userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        userAvatarPlaceholder.textContent = initials;
    }

    // Botón de notificaciones
    const notificationBtn = document.getElementById('notificationBtn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', function() {
            mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
        });
    }

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.showConfirm(
                '¿Estás seguro que deseas cerrar sesión?',
                function() {
                    localStorage.clear();
                    window.location.href = 'login.html';
                },
                'Cerrar Sesión'
            );
        });
    }

    console.log('Usuario autenticado:', { userId, userName, userRole });

    // Botón de Hablar con IA
    const hablarIABtn = document.getElementById('hablarIABtn');
    if (hablarIABtn) {
        hablarIABtn.addEventListener('click', function() {
            window.location.href = 'dashboard-ia.html';
        });
    }

    // Botón de Tienda
    const tiendaBtn = document.getElementById('tiendaBtn');
    if (tiendaBtn) {
        tiendaBtn.addEventListener('click', function() {
            mostrarModalDesarrollo('Tienda', '<i class="fa-solid fa-store"></i>');
        });
    }

    // Botón de Brigada
    const brigadaBtn = document.getElementById('brigadaBtn');
    if (brigadaBtn) {
        brigadaBtn.addEventListener('click', function() {
            // Redirigir a la página de brigada
            window.location.href = 'dashboard-brigada.html';
        });
    }

    // Botón de Zonas de Peligro
    const zonasPeligroBtn = document.getElementById('zonasPeligroBtn');
    if (zonasPeligroBtn) {
        zonasPeligroBtn.addEventListener('click', function() {
            mostrarModalDesarrollo('Zonas de Peligro', '<i class="fa-solid fa-triangle-exclamation"></i>');
        });
    }

    // Navegación inferior
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            
            if (section === 'emergencia') {
                // Mostrar modal de emergencia directamente
                activarEmergencia();
                return;
            }
            
            // Cambiar sección activa
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Aquí puedes agregar la lógica para cambiar el contenido
            console.log('Navegando a:', section);
            cambiarSeccion(section);
        });
    });

    function activarEmergencia() {
        // Mostrar modal personalizado con opciones de emergencia
        mostrarModalEmergencia();
    }

    function mostrarModalEmergencia() {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10000';

        // Crear contenedor del modal
        const container = document.createElement('div');
        container.className = 'emergency-modal-container';
        container.innerHTML = `
            <button class="emergency-close-btn" onclick="this.closest('.modal-overlay').remove()">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#FF0000"/>
                    <path d="M15 9L9 15M9 9L15 15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </button>
            
            <div class="emergency-options">
                <button class="emergency-option" onclick="llamarEmergencia('125', 'Ambulancia')">
                    <img src="../img/ambulancia_cel.png" alt="Ambulancia">
                </button>
                
                <button class="emergency-option" onclick="llamarEmergencia('119', 'Bomberos')">
                    <img src="../img/bomberos_cel.png" alt="Bomberos">
                </button>
            </div>
            
            <div class="emergency-arrows">
                <img src="../img/flechas.png" alt="Flechas" class="arrows-animation">
            </div>
        `;

        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // No cerrar al hacer clic fuera - solo con el botón X
    }

    // Función global para llamar emergencia
    window.llamarEmergencia = function(numero, servicio) {
        console.log(`Llamando a ${servicio}: ${numero}`);
        
        // Abrir el marcador del teléfono con el número
        window.location.href = `tel:${numero}`;
        
        // Cerrar el modal
        const overlay = document.querySelector('.modal-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Mostrar confirmación
        setTimeout(() => {
            window.showSuccess(
                `Se ha iniciado la llamada a ${servicio} (${numero})`,
                '📞 Llamada de Emergencia'
            );
        }, 500);
    };

    // Función para mostrar modal de sección en desarrollo
    function mostrarModalDesarrollo(seccion, icono) {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.zIndex = '10000';

        // Crear contenedor del modal
        const container = document.createElement('div');
        container.className = 'development-modal-container';
        container.innerHTML = `
            <button class="development-close-btn" onclick="this.closest('.modal-overlay').remove()">
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

        // Cerrar al hacer clic fuera del modal
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                overlay.remove();
            }
        });
    }

    function cambiarSeccion(seccion) {
        const content = document.querySelector('.dashboard-content');
        
        switch(seccion) {
            case 'inicio':
                // Redirigir al dashboard principal según el rol
                const roleMap = {
                    'estudiante': 'dashboard-estudiante.html',
                    'profesor': 'dashboard-profesor.html',
                    'admin': 'dashboard-admin.html',
                    'coordinador': 'dashboard-coordinador.html',
                    'institucion': 'dashboard-institucion.html'
                };
                const dashboardPage = roleMap[userRole.toLowerCase()] || 'dashboard-estudiante.html';
                window.location.href = dashboardPage;
                break;
            case 'brigada':
                // Redirigir a la página de brigada
                window.location.href = 'dashboard-brigada.html';
                break;
            case 'ia':
                // Redirigir a la página de IA
                window.location.href = 'dashboard-ia.html';
                break;
            case 'perfil':
                if (content) {
                    content.innerHTML = `
                        <h1>Mi Perfil</h1>
                        <p><strong>Nombre:</strong> ${userName}</p>
                        <p><strong>Rol:</strong> ${userRole}</p>
                        <p><strong>ID:</strong> ${userId}</p>
                    `;
                }
                break;
            default:
                if (content) {
                    content.innerHTML = '<h1>Sección no encontrada</h1>';
                }
        }
    }
});
