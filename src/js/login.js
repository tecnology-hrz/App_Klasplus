// Funcionalidad del formulario de login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const googleBtn = document.getElementById('googleBtn');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    const eyeIcon = document.getElementById('eyeIcon');
    const eyeSlashIcon = document.getElementById('eyeSlashIcon');

    // Toggle para mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            // Cambiar iconos
            eyeIcon.classList.toggle('hidden');
            eyeSlashIcon.classList.toggle('hidden');
        });
    }

    // Manejo del botón de Google
    if (googleBtn) {
        googleBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Iniciar sesión con Google');
            // Aquí iría la integración con Google OAuth
            alert('Funcionalidad de Google Sign-In por implementar');
        });
    }

    // Validación del formulario
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();

            // Validación básica
            if (!email) {
                alert('Por favor ingresa tu correo electrónico');
                emailInput.focus();
                return;
            }

            if (!validateEmail(email)) {
                alert('Por favor ingresa un correo electrónico válido');
                emailInput.focus();
                return;
            }

            if (!password) {
                alert('Por favor ingresa tu contraseña');
                passwordInput.focus();
                return;
            }

            if (password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres');
                passwordInput.focus();
                return;
            }

            // Si todo está correcto, proceder con el login
            console.log('Iniciando sesión con:', email);
            // Aquí iría la lógica de autenticación
            alert('Iniciando sesión...');
        });
    }

    // Función para validar email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    }

    // Efecto visual en los inputs
    const inputs = document.querySelectorAll('.input-field');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.boxShadow = '0 4px 12px rgba(63, 81, 181, 0.2)';
        });

        input.addEventListener('blur', function() {
            this.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
        });
    });
});
