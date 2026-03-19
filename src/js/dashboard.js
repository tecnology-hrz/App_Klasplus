// Dashboard común para todos los roles
document.addEventListener('DOMContentLoaded', function() {
    // Verificar si el usuario está autenticado
    const userId = sessionStorage.getItem('userId');
    const userName = sessionStorage.getItem('userName');
    const userRole = sessionStorage.getItem('userRole');
    const userPhoto = sessionStorage.getItem('userPhoto');

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
                    sessionStorage.clear();
                    window.location.href = 'login.html';
                },
                'Cerrar Sesión'
            );
        });
    }

    console.log('Usuario autenticado:', { userId, userName, userRole });
});
