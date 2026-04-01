// Dashboard de Brigada
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
            mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
        });
    }

    // Botón de cerrar sesión
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            // Crear modal de confirmación
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.zIndex = '10000';
            
            const container = document.createElement('div');
            container.className = 'development-modal-container';
            container.style.maxWidth = '400px';
            container.innerHTML = `
                <div class="development-content">
                    <div class="development-icon"><i class="fa-solid fa-power-off"></i></div>
                    <h2 class="development-title">Cerrar Sesión</h2>
                    <p class="development-message">¿Estás seguro de que deseas cerrar sesión?</p>
                    <div style="display: flex; gap: 15px; margin-top: 20px; width: 100%;">
                        <button class="cancelar-btn" style="
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
                        <button class="confirmar-btn" style="
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
            container.querySelector('.cancelar-btn').addEventListener('click', () => {
                overlay.remove();
            });
            
            // Botón confirmar
            container.querySelector('.confirmar-btn').addEventListener('click', () => {
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
    }

    console.log('Usuario autenticado en Brigada:', { userId, userName, userRole });

    // Función global para continuar tareas
    window.continuarTarea = function(tipoTarea) {
        const tareasTitulos = {
            'fotos': 'Tomar Fotos de Zonas Peligrosas',
            'cuestionario': 'Cuestionario de Riesgos',
            'escaleras': 'Inspección de Escaleras',
            'extintores': 'Verificación de Extintores'
        };

        const tareasIconos = {
            'fotos': '<i class="fa-solid fa-camera"></i>',
            'cuestionario': '<i class="fa-solid fa-triangle-exclamation"></i>',
            'escaleras': '<i class="fa-solid fa-stairs"></i>',
            'extintores': '<i class="fa-solid fa-fire-extinguisher"></i>'
        };

        const titulo = tareasTitulos[tipoTarea] || 'Tarea';
        const icono = tareasIconos[tipoTarea] || '<i class="fa-solid fa-tasks"></i>';

        mostrarModalDesarrollo(titulo, icono);
    };

    // Función para ver todos los brigadistas
    window.verTodosBrigadistas = function() {
        mostrarModalDesarrollo('Lista Completa de Brigadistas', '<i class="fa-solid fa-user-group"></i>');
    };

    // Función para ver perfil de brigadista
    window.verPerfilBrigadista = function(brigadistaId) {
        mostrarModalDesarrollo('Perfil del Brigadista', '<i class="fa-solid fa-user"></i>');
    };

    // Cargar estudiantes brigadistas desde Firebase
    cargarBrigadistas();

    async function cargarBrigadistas() {
        try {
            // Importar Firebase
            const { db, collection, query, where, getDocs } = await import('../js/firebase-config.js');

            const brigadistasContainer = document.getElementById('brigadistasContainer');
            
            // Consultar estudiantes que están en brigada
            const usuariosRef = collection(db, 'usuarios');
            const q = query(usuariosRef, where('enBrigada', '==', true));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                brigadistasContainer.innerHTML = `
                    <div class="empty-message">
                        <i class="fa-solid fa-user-group"></i>
                        <p>No hay estudiantes brigadistas registrados</p>
                    </div>
                `;
                return;
            }

            // Limpiar contenedor
            brigadistasContainer.innerHTML = '';

            // Mostrar solo los primeros 3 brigadistas
            let count = 0;
            querySnapshot.forEach((doc) => {
                if (count < 3) {
                    const brigadista = doc.data();
                    const brigadistaCard = crearTarjetaBrigadista(brigadista, doc.id);
                    brigadistasContainer.appendChild(brigadistaCard);
                    count++;
                }
            });

        } catch (error) {
            console.error('Error al cargar brigadistas:', error);
            const brigadistasContainer = document.getElementById('brigadistasContainer');
            brigadistasContainer.innerHTML = `
                <div class="empty-message">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Error al cargar los brigadistas</p>
                </div>
            `;
        }
    }

    function crearTarjetaBrigadista(brigadista, id) {
        const card = document.createElement('div');
        card.className = 'brigadista-card';

        // Determinar si es jefe de brigada (puedes ajustar esta lógica según tus necesidades)
        const esJefe = brigadista.rolBrigada === 'jefe' || false;

        // Crear avatar o placeholder
        let avatarHTML = '';
        if (brigadista.fotoPerfil && brigadista.fotoPerfil !== '') {
            avatarHTML = `<img src="${brigadista.fotoPerfil}" alt="${brigadista.nombreCompleto || brigadista.nombre}" class="brigadista-avatar">`;
        } else {
            const iniciales = (brigadista.nombreCompleto || brigadista.nombre || 'U')
                .split(' ')
                .map(n => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase();
            avatarHTML = `<div class="brigadista-avatar-placeholder">${iniciales}</div>`;
        }

        card.innerHTML = `
            ${avatarHTML}
            <div class="brigadista-info">
                <h3 class="brigadista-nombre">${brigadista.nombreCompleto || brigadista.nombre || 'Sin nombre'}</h3>
                <div class="brigadista-detalles">
                    <div class="brigadista-rol ${esJefe ? 'jefe' : ''}">
                        <i class="fa-solid fa-${esJefe ? 'shield-halved' : 'user-shield'}"></i>
                        <span>${esJefe ? 'Jefe de brigada' : 'Brigadista'}</span>
                    </div>
                    <span class="brigadista-grado">${brigadista.grado || 'Sin grado'}</span>
                </div>
            </div>
        `;

        return card;
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
            
            // Navegación a otras secciones
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
                // Ya estamos en brigada, no hacer nada
                break;
            case 'ia':
                // Redirigir a la página de IA
                window.location.href = 'dashboard-ia.html';
                break;
            case 'perfil':
                // Redirigir a la página de perfil
                window.location.href = 'dashboard-perfil.html';
                break;
            default:
                console.log('Sección no encontrada:', seccion);
        }
    }
});