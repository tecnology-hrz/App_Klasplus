// Funcionalidad del formulario de registro
document.addEventListener('DOMContentLoaded', function() {
    const registroForm = document.getElementById('registroForm');
    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');
    const toggleConfirmPassword = document.getElementById('toggleConfirmPassword');

    // Toggle para mostrar/ocultar contraseña
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const eyeIcon = this.querySelector('#eyeIcon');
            const eyeSlashIcon = this.querySelector('#eyeSlashIcon');
            eyeIcon.classList.toggle('hidden');
            eyeSlashIcon.classList.toggle('hidden');
        });
    }

    // Toggle para mostrar/ocultar confirmar contraseña
    if (toggleConfirmPassword) {
        toggleConfirmPassword.addEventListener('click', function() {
            const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            confirmPasswordInput.setAttribute('type', type);
            
            const eyeIcon = this.querySelector('#eyeIconConfirm');
            const eyeSlashIcon = this.querySelector('#eyeSlashIconConfirm');
            eyeIcon.classList.toggle('hidden');
            eyeSlashIcon.classList.toggle('hidden');
        });
    }

    // Validación del formulario
    if (registroForm) {
        registroForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nombre = nombreInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value.trim();
            const confirmPassword = confirmPasswordInput.value.trim();

            // Validación de nombre
            if (!nombre) {
                alert('Por favor ingresa tu nombre completo');
                nombreInput.focus();
                return;
            }

            if (nombre.length < 3) {
                alert('El nombre debe tener al menos 3 caracteres');
                nombreInput.focus();
                return;
            }

            // Validación de email
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

            // Validación de contraseña
            if (!password) {
                alert('Por favor ingresa una contraseña');
                passwordInput.focus();
                return;
            }

            if (password.length < 6) {
                alert('La contraseña debe tener al menos 6 caracteres');
                passwordInput.focus();
                return;
            }

            // Validación de confirmación de contraseña
            if (!confirmPassword) {
                alert('Por favor confirma tu contraseña');
                confirmPasswordInput.focus();
                return;
            }

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden');
                confirmPasswordInput.focus();
                return;
            }

            // Si todo está correcto, proceder con el registro
            console.log('Registrando usuario:', { nombre, email });
            alert('¡Cuenta creada exitosamente! Redirigiendo al login...');
            
            // Redirigir al login después de 1 segundo
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
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
