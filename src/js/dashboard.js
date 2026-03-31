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
            alert('Funcionalidad de notificaciones próximamente');
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

    function cambiarSeccion(seccion) {
        const content = document.querySelector('.dashboard-content');
        
        switch(seccion) {
            case 'inicio':
                content.innerHTML = '<h1>Inicio</h1><p>Bienvenido al dashboard de Klasplus</p>';
                break;
            case 'brigada':
                content.innerHTML = '<h1>Brigada</h1><p>Información sobre las brigadas de seguridad</p>';
                break;
            case 'ia':
                content.innerHTML = '<h1>Asistente IA</h1><p>Chatea con nuestro asistente inteligente</p>';
                break;
            case 'perfil':
                content.innerHTML = `
                    <h1>Mi Perfil</h1>
                    <p><strong>Nombre:</strong> ${userName}</p>
                    <p><strong>Rol:</strong> ${userRole}</p>
                    <p><strong>ID:</strong> ${userId}</p>
                `;
                break;
            default:
                content.innerHTML = '<h1>Sección no encontrada</h1>';
        }
    }
});
