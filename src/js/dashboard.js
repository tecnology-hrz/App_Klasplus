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
                // Mostrar modal de emergencia
                window.showConfirm(
                    '¿Deseas activar el botón de emergencia? Se notificará a las autoridades y brigadas correspondientes.',
                    function() {
                        activarEmergencia();
                    },
                    '⚠️ Emergencia'
                );
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
        // Aquí va la lógica para activar la emergencia
        console.log('Emergencia activada');
        window.showSuccess(
            'Se ha notificado a las autoridades y brigadas. Mantén la calma y sigue las instrucciones.',
            '🚨 Emergencia Activada'
        );
        
        // Aquí puedes agregar la lógica para enviar la alerta a Firebase
        // Por ejemplo: enviar notificación push, actualizar base de datos, etc.
    }

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
