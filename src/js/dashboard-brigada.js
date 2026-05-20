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

    // Cargar nivel actual y puntos del usuario
    (async () => {
        try {
            const { db, doc, getDoc } = await import('./firebase-config.js');
            const progresoRef = doc(db, 'progreso_usuario', userId);
            const snap = await getDoc(progresoRef);
            if (snap.exists()) {
                const data = snap.data();
                const nivelActual = data.nivelActual || 1;
                const nivelesCompletados = (data.nivelesCompletados || []).length;
                const puntos = data.puntosKlasplus || 0;
                const porcentaje = Math.round((nivelesCompletados / 250) * 100);

                const badge = document.getElementById('nivelActualBadge');
                const puntosBadge = document.getElementById('puntosActualesBadge');
                const fill = document.getElementById('nivelesProgressFill');
                const label = document.getElementById('nivelesCompletadosLabel');
                const pctLabel = document.getElementById('nivelesProgresoLabel');

                if (badge) badge.textContent = `Nv. ${nivelActual}`;
                if (puntosBadge) puntosBadge.textContent = `${puntos} pts`;
                if (fill) fill.style.width = `${porcentaje}%`;
                if (label) label.textContent = `${nivelesCompletados} / 250 niveles`;
                if (pctLabel) pctLabel.textContent = `${porcentaje}%`;

                // Sincronizar puntos con localStorage para la tienda
                localStorage.setItem('puntosKlasplus', puntos.toString());
            }
        } catch (e) { console.error(e); }
    })();

    // Función global para continuar tareas
    window.continuarTarea = function(tipoTarea) {
        // Redirigir al sistema de niveles
        window.location.href = 'niveles-brigada.html';
    };

    // Función para ver todos los brigadistas (se sobreescribe tras cargar datos)
    window.verTodosBrigadistas = function() {};

    // Función para ver perfil de brigadista
    window.verPerfilBrigadista = function(brigadistaId) {
        mostrarModalDesarrollo('Perfil del Brigadista', '<i class="fa-solid fa-user"></i>');
    };

    // Cargar estudiantes brigadistas desde Firebase
    cargarBrigadistas();

    async function cargarBrigadistas() {
        try {
            const { db, collection, query, where, getDocs } = await import('../js/firebase-config.js');
            const brigadistasContainer = document.getElementById('brigadistasContainer');

            const usuariosRef = collection(db, 'usuarios');
            const q = query(usuariosRef, where('enBrigada', '==', true));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                brigadistasContainer.innerHTML = `
                    <div class="empty-message">
                        <i class="fa-solid fa-user-group"></i>
                        <p>No hay estudiantes brigadistas registrados</p>
                    </div>`;
                return;
            }

            // Cargar puntos y nivel de cada brigadista desde progreso_usuario
            const todosLosDocs = [];
            for (const docSnap of querySnapshot.docs) {
                const data = docSnap.data();
                let puntos = 0;
                let nivel = 1;
                try {
                    const { doc, getDoc } = await import('../js/firebase-config.js');
                    const progresoSnap = await getDoc(doc(db, 'progreso_usuario', docSnap.id));
                    if (progresoSnap.exists()) {
                        puntos = progresoSnap.data().puntosKlasplus || 0;
                        nivel = progresoSnap.data().nivelActual || 1;
                    }
                } catch(e) {}
                todosLosDocs.push({ id: docSnap.id, data: { ...data, puntosKlasplus: puntos, nivelActual: nivel } });
            }

            // Ordenar por puntos descendente
            todosLosDocs.sort((a, b) => b.data.puntosKlasplus - a.data.puntosKlasplus);

            let mostrandoTodos = false;

            function renderBrigadistas() {
                brigadistasContainer.innerHTML = '';

                // Podio top 3
                const top3 = todosLosDocs.slice(0, 3);
                if (top3.length >= 2) {
                    const podio = document.createElement('div');
                    podio.className = 'podio-container';

                    const posiciones = top3.length === 3
                        ? [top3[1], top3[0], top3[2]]  // orden visual: 2°, 1°, 3°
                        : top3.length === 2
                            ? [top3[1], top3[0]]
                            : [top3[0]];

                    const medallas = top3.length === 3
                        ? [2, 1, 3]
                        : top3.length === 2
                            ? [2, 1]
                            : [1];

                    posiciones.forEach((item, i) => {
                        const pos = medallas[i];
                        const card = crearPodioCard(item.data, pos);
                        podio.appendChild(card);
                    });

                    brigadistasContainer.appendChild(podio);
                }

                // Resto de la lista (desde posición 4 en adelante)
                const resto = mostrandoTodos ? todosLosDocs.slice(3) : todosLosDocs.slice(3, 6);
                if (resto.length > 0) {
                    const listaResto = document.createElement('div');
                    listaResto.className = 'brigadistas-lista-resto';
                    resto.forEach(({ data, id }, idx) => {
                        const card = crearTarjetaBrigadista(data, id, idx + 4);
                        listaResto.appendChild(card);
                    });
                    brigadistasContainer.appendChild(listaResto);
                }

                if (todosLosDocs.length > 6) {
                    const verMasBtn = document.createElement('button');
                    verMasBtn.className = 'ver-mas-btn';
                    verMasBtn.textContent = mostrandoTodos ? 'Ver menos' : `Ver más (${todosLosDocs.length - 6} más)`;
                    verMasBtn.addEventListener('click', () => {
                        mostrandoTodos = !mostrandoTodos;
                        renderBrigadistas();
                    });
                    brigadistasContainer.appendChild(verMasBtn);
                }
            }

            renderBrigadistas();

        } catch (error) {
            console.error('Error al cargar brigadistas:', error);
            document.getElementById('brigadistasContainer').innerHTML = `
                <div class="empty-message">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    <p>Error al cargar los brigadistas</p>
                </div>`;
        }
    }

    function crearPodioCard(brigadista, posicion) {
        const card = document.createElement('div');
        card.className = `podio-card podio-${posicion}`;

        const iniciales = (brigadista.nombreCompleto || brigadista.nombre || 'U')
            .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        const avatarHTML = brigadista.fotoPerfil
            ? `<img src="${brigadista.fotoPerfil}" class="podio-avatar-img" alt="${iniciales}">`
            : `<div class="podio-avatar-placeholder">${iniciales}</div>`;

        const coronas = { 1: '🥇', 2: '🥈', 3: '🥉' };
        const alturas = { 1: 'podio-alto', 2: 'podio-medio', 3: 'podio-bajo' };

        card.innerHTML = `
            <div class="podio-medalla">${coronas[posicion]}</div>
            <div class="podio-avatar ${alturas[posicion]}">${avatarHTML}</div>
            <div class="podio-nombre">${(brigadista.nombreCompleto || brigadista.nombre || 'Sin nombre').split(' ')[0]}</div>
            <div class="podio-puntos-badge">
                <i class="fa-solid fa-star"></i>
                ${brigadista.puntosKlasplus || 0}
            </div>
            <div class="podio-nivel-badge">Nv. ${brigadista.nivelActual || 1}</div>
            <div class="podio-base podio-base-${posicion}">${posicion}°</div>
        `;
        return card;
    }

    function crearTarjetaBrigadista(brigadista, id, posicion) {
        const card = document.createElement('div');
        card.className = 'brigadista-card';

        const esJefe = brigadista.rolBrigada === 'jefe' || false;

        let avatarHTML = '';
        if (brigadista.fotoPerfil && brigadista.fotoPerfil !== '') {
            avatarHTML = `<img src="${brigadista.fotoPerfil}" alt="${brigadista.nombreCompleto || brigadista.nombre}" class="brigadista-avatar">`;
        } else {
            const iniciales = (brigadista.nombreCompleto || brigadista.nombre || 'U')
                .split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            avatarHTML = `<div class="brigadista-avatar-placeholder">${iniciales}</div>`;
        }

        const posLabel = posicion ? `<span class="brigadista-posicion">${posicion}°</span>` : '';

        card.innerHTML = `
            ${posLabel}
            ${avatarHTML}
            <div class="brigadista-info">
                <h3 class="brigadista-nombre">${brigadista.nombreCompleto || brigadista.nombre || 'Sin nombre'}</h3>
                <div class="brigadista-detalles">
                    <div class="brigadista-rol ${esJefe ? 'jefe' : ''}">
                        <i class="fa-solid fa-${esJefe ? 'shield-halved' : 'user-shield'}"></i>
                        <span>${esJefe ? 'Jefe de brigada' : 'Brigadista'}</span>
                    </div>
                    <span class="brigadista-grado">${brigadista.grado || ''}</span>
                </div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:5px;flex-shrink:0;">
                <div class="brigadista-pts-badge">
                    <i class="fa-solid fa-star"></i>
                    ${brigadista.puntosKlasplus || 0}
                </div>
                <span style="font-size:11px;color:#0047B3;font-weight:600;">Nv. ${brigadista.nivelActual || 1}</span>
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
                window.location.href = 'dashboard.html';
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