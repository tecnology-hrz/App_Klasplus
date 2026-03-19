// Sistema de modales profesionales

// Iconos SVG
const icons = {
    error: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#D32F2F" stroke-width="2"/>
        <path d="M15 9L9 15M9 9L15 15" stroke="#D32F2F" stroke-width="2" stroke-linecap="round"/>
    </svg>`,
    
    success: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#388E3C" stroke-width="2"/>
        <path d="M8 12L11 15L16 9" stroke="#388E3C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    
    warning: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 20H22L12 2Z" stroke="#F57C00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M12 9V13" stroke="#F57C00" stroke-width="2" stroke-linecap="round"/>
        <circle cx="12" cy="17" r="1" fill="#F57C00"/>
    </svg>`,
    
    info: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="#1976D2" stroke-width="2"/>
        <path d="M12 16V12M12 8H12.01" stroke="#1976D2" stroke-width="2" stroke-linecap="round"/>
    </svg>`
};

// Función para mostrar modal
function showModal(options) {
    const {
        type = 'info',
        title = '',
        message = '',
        confirmText = 'Aceptar',
        cancelText = null,
        onConfirm = null,
        onCancel = null
    } = options;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    // Crear contenedor del modal
    const container = document.createElement('div');
    container.className = 'modal-container';

    // Crear icono
    const iconDiv = document.createElement('div');
    iconDiv.className = `modal-icon ${type}`;
    iconDiv.innerHTML = icons[type];

    // Crear título
    const titleDiv = document.createElement('div');
    titleDiv.className = 'modal-title';
    titleDiv.textContent = title;

    // Crear mensaje
    const messageDiv = document.createElement('div');
    messageDiv.className = 'modal-message';
    messageDiv.textContent = message;

    // Crear botones
    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'modal-buttons';

    // Botón de confirmar
    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn primary';
    confirmBtn.textContent = confirmText;
    confirmBtn.onclick = () => {
        closeModal(overlay);
        if (onConfirm) onConfirm();
    };

    buttonsDiv.appendChild(confirmBtn);

    // Botón de cancelar (opcional)
    if (cancelText) {
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn secondary';
        cancelBtn.textContent = cancelText;
        cancelBtn.onclick = () => {
            closeModal(overlay);
            if (onCancel) onCancel();
        };
        buttonsDiv.insertBefore(cancelBtn, confirmBtn);
    }

    // Ensamblar modal
    container.appendChild(iconDiv);
    container.appendChild(titleDiv);
    container.appendChild(messageDiv);
    container.appendChild(buttonsDiv);
    overlay.appendChild(container);

    // Agregar al DOM
    document.body.appendChild(overlay);

    // Cerrar al hacer clic fuera del modal
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal(overlay);
            if (onCancel) onCancel();
        }
    });
}

// Función para cerrar modal
function closeModal(overlay) {
    overlay.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => {
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 300);
}

// Agregar animación de fadeOut
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        to {
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Funciones de acceso rápido
window.showError = (message, title = 'Error') => {
    showModal({ type: 'error', title, message });
};

window.showSuccess = (message, title = 'Éxito') => {
    showModal({ type: 'success', title, message });
};

window.showWarning = (message, title = 'Advertencia') => {
    showModal({ type: 'warning', title, message });
};

window.showInfo = (message, title = 'Información') => {
    showModal({ type: 'info', title, message });
};

window.showConfirm = (message, onConfirm, title = 'Confirmar') => {
    showModal({
        type: 'warning',
        title,
        message,
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        onConfirm
    });
};
