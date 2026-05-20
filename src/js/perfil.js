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
    window.location.href = 'dashboard.html';
});

// Botón de notificaciones
document.getElementById('notificationBtn').addEventListener('click', () => {
    mostrarModalDesarrollo('Notificaciones', '<i class="fa-solid fa-bell"></i>');
});

// Botón de perfil de riesgo
document.getElementById('editarPerfilBtn').addEventListener('click', () => {
    var panel = document.getElementById('perfilRiesgoPanel');
    var opciones = document.querySelector('.profile-options');
    var clasPanel = document.getElementById('clasificacionPanel');
    clasPanel.style.display = 'none';
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        opciones.style.display = 'none';
        renderPerfilRiesgo();
    } else {
        panel.style.display = 'none';
        opciones.style.display = 'flex';
    }
});

async function renderPerfilRiesgo() {
    var nombreInst = localStorage.getItem('userInstitutionName') || '';
    var institucionId = localStorage.getItem('userInstitution') || 'default';

    var zonasEvaluadas = 0;
    var zonasSeguras = 0;
    var totalScore = 0;
    var zonasList = [];
    var misionesCompletadas = 0;
    var puntosTotal = 0;

    try {
        const { db, collection, query, where, getDocs, doc, getDoc } = await import('../js/firebase-config.js');

        if (!nombreInst || nombreInst === 'default') {
            var uid = localStorage.getItem('userId');
            if (uid) {
                var userDocSnap = await getDoc(doc(db, 'usuarios', uid));
                if (userDocSnap.exists()) {
                    nombreInst = userDocSnap.data().institucionNombre || 'Mi Institución';
                    localStorage.setItem('userInstitutionName', nombreInst);
                }
            }
        }

        var zonasRef = collection(db, 'zonas_institucion');
        var q = query(zonasRef, where('institucionId', '==', institucionId));
        var snapshot = await getDocs(q);

        snapshot.forEach(function(docSnap) {
            var data = docSnap.data();
            zonasEvaluadas++;
            totalScore += (data.puntuacionPeligro || 5);
            if ((data.puntuacionPeligro || 5) >= 7) zonasSeguras++;
            zonasList.push({ nombre: data.nombre || data.slug, score: data.puntuacionPeligro || 5, fotos: data.totalFotos || 0 });
        });

        var progresoRef = doc(db, 'progreso_usuario', localStorage.getItem('userId'));
        var progresoDoc = await getDoc(progresoRef);
        if (progresoDoc.exists()) {
            var pData = progresoDoc.data();
            misionesCompletadas = (pData.nivelesCompletados || []).length;
            puntosTotal = pData.puntosKlasplus || 0;
        }
    } catch(e) { console.error('Error cargando perfil de riesgo:', e); }

    if (!nombreInst) nombreInst = 'Mi Institución';

    var scorePromedio = zonasEvaluadas > 0 ? (totalScore / zonasEvaluadas).toFixed(1) : '0.0';
    var scoreNum = parseFloat(scorePromedio);
    var scoreColor = scoreNum >= 8 ? '#4CAF50' : scoreNum >= 6 ? '#FF9800' : scoreNum >= 4 ? '#FF6B35' : '#FF5722';
    var scoreLabel = scoreNum >= 8 ? 'Segura' : scoreNum >= 6 ? 'Moderada' : scoreNum >= 4 ? 'En riesgo' : 'Crítica';
    var scorePercent = Math.min(scoreNum * 10, 100);

    // Zonas HTML
    zonasList.sort(function(a, b) { return a.score - b.score; });
    var zonasHTML = '';
    if (zonasList.length > 0) {
        zonasList.forEach(function(z) {
            var zColor = z.score >= 8 ? '#4CAF50' : z.score >= 6 ? '#FF9800' : z.score >= 4 ? '#FF6B35' : '#FF5722';
            var zLabel = z.score >= 8 ? 'Segura' : z.score >= 6 ? 'Moderada' : z.score >= 4 ? 'Riesgo' : 'Crítica';
            zonasHTML += '<div class="riesgo-zona-item"><div class="riesgo-zona-left"><div class="riesgo-zona-dot" style="background:' + zColor + ';"></div><span>' + z.nombre + '</span></div><span class="riesgo-zona-score" style="color:' + zColor + ';">' + z.score.toFixed(1) + ' · ' + zLabel + '</span></div>';
        });
    } else {
        zonasHTML = '<p class="riesgo-sin-datos">Sin zonas evaluadas. Completa misiones para ver datos.</p>';
    }

    document.getElementById('perfilRiesgoContent').innerHTML = '<div class="riesgo-header-card"><div class="riesgo-header-top"><i class="fa-solid fa-shield-halved"></i><h3>Perfil de Riesgo</h3></div><p class="riesgo-inst-name">' + nombreInst + '</p></div><div class="riesgo-score-card"><p class="riesgo-score-label">PUNTUACIÓN DE SEGURIDAD</p><div class="riesgo-score-big">' + scorePromedio + '<span>/10</span></div><div class="riesgo-score-bar"><div class="riesgo-score-fill" style="width:' + scorePercent + '%;background:' + scoreColor + ';"></div></div><span class="riesgo-score-status" style="color:' + scoreColor + ';">' + scoreLabel + '</span></div><div class="riesgo-stats-grid"><div class="riesgo-stat"><div class="riesgo-stat-num" style="color:#0047B3;">' + zonasEvaluadas + '</div><div class="riesgo-stat-label">Zonas evaluadas</div></div><div class="riesgo-stat"><div class="riesgo-stat-num" style="color:#4CAF50;">' + zonasSeguras + '</div><div class="riesgo-stat-label">Zonas seguras</div></div><div class="riesgo-stat"><div class="riesgo-stat-num" style="color:#FF6B35;">' + misionesCompletadas + '</div><div class="riesgo-stat-label">Misiones</div></div></div><div class="riesgo-zonas-section"><div class="riesgo-zonas-header"><span><i class="fa-solid fa-map-location-dot"></i> Zonas de la Institución</span><span>' + zonasEvaluadas + '/9</span></div>' + zonasHTML + '</div><div class="riesgo-puntos-card"><i class="fa-solid fa-star"></i><div><span class="riesgo-puntos-label">Puntos Klasplus</span><span class="riesgo-puntos-valor">' + puntosTotal + ' pts</span></div></div>';
}

// Botón de clasificación Klasplus
document.getElementById('clasificacionBtn').addEventListener('click', () => {
    var panel = document.getElementById('clasificacionPanel');
    var opciones = document.querySelector('.profile-options');
    var riesgoPanel = document.getElementById('perfilRiesgoPanel');
    riesgoPanel.style.display = 'none';
    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        opciones.style.display = 'none';
        renderClasificacion();
    } else {
        panel.style.display = 'none';
        opciones.style.display = 'flex';
    }
});

// Clasificación basada en instituciones reales registradas en Firebase
async function renderClasificacion() {
    var nombreInstitucion = localStorage.getItem('userInstitutionName') || '';

    // Si no tenemos el nombre, intentar cargarlo de Firebase
    if (!nombreInstitucion || nombreInstitucion === 'default') {
        try {
            const { db, doc, getDoc } = await import('../js/firebase-config.js');
            var uid = localStorage.getItem('userId');
            if (uid) {
                var userDocSnap = await getDoc(doc(db, 'usuarios', uid));
                if (userDocSnap.exists()) {
                    var uData = userDocSnap.data();
                    nombreInstitucion = uData.institucionNombre || '';
                    localStorage.setItem('userInstitution', uData.institucionId || 'default');
                    localStorage.setItem('userInstitutionName', nombreInstitucion);
                }
            }
        } catch(e) { console.error(e); }
    }
    if (!nombreInstitucion) nombreInstitucion = 'Mi Institución';

    // Cargar todas las instituciones que tienen zonas registradas en Firebase
    var ranking = [];
    try {
        const { db, collection, getDocs } = await import('../js/firebase-config.js');
        const zonasSnap = await getDocs(collection(db, 'zonas_institucion'));

        var instMap = {};
        zonasSnap.forEach(function(docSnap) {
            var data = docSnap.data();
            var instId = data.institucionId || 'default';
            if (!instMap[instId]) {
                instMap[instId] = { id: instId, nombre: data.institucionNombre || instId, zonas: 0, seguras: 0, totalScore: 0 };
            }
            instMap[instId].zonas++;
            instMap[instId].totalScore += (data.puntuacionPeligro || 5);
            if ((data.puntuacionPeligro || 5) >= 7) {
                instMap[instId].seguras++;
            }
        });

        Object.values(instMap).forEach(function(inst) {
            inst.score = inst.zonas > 0 ? Math.round((inst.totalScore / inst.zonas) * 10) : 0;
            ranking.push(inst);
        });

        ranking.sort(function(a, b) { return b.score - a.score; });
    } catch(e) {
        console.error('Error cargando clasificación:', e);
    }

    // Asegurar que la institución del usuario esté en el ranking
    var instUsuario = localStorage.getItem('userInstitution') || 'default';
    var encontrada = false;
    ranking.forEach(function(inst) {
        if (inst.id === instUsuario) {
            inst.esMia = true;
            inst.nombre = nombreInstitucion;
            encontrada = true;
        }
    });
    if (!encontrada) {
        ranking.push({ id: instUsuario, nombre: nombreInstitucion, zonas: 9, seguras: 3, score: 45, esMia: true });
        ranking.sort(function(a, b) { return b.score - a.score; });
    }

    // Rellenar hasta 10 posiciones con espacios vacíos
    while (ranking.length < 10) {
        ranking.push({ id: 'vacio_' + ranking.length, nombre: '—', zonas: 0, seguras: 0, score: 0, vacio: true });
    }

    // Mi institución
    var miInst = ranking.find(function(r) { return r.esMia; });
    var miPuesto = ranking.indexOf(miInst) + 1;
    var totalReales = ranking.filter(function(r) { return !r.vacio; }).length;

    // Render header con mi posición
    var scoreColor = miInst.score >= 80 ? '#4CAF50' : miInst.score >= 60 ? '#FF9800' : miInst.score >= 40 ? '#FF6B35' : '#FF5722';
    var scoreBar = Math.min(miInst.score, 100);

    document.getElementById('miInstitucionRank').innerHTML = '<div class="mi-rank-card"><div class="mi-rank-puesto"><span class="rank-numero">#' + miPuesto + '</span><span class="rank-de">de ' + totalReales + '</span></div><div class="mi-rank-info"><h4>' + miInst.nombre + '</h4><div class="mi-rank-stats"><span><i class="fa-solid fa-shield-halved"></i> Score: <strong>' + miInst.score + '</strong>/100</span><span><i class="fa-solid fa-check-circle"></i> ' + miInst.seguras + '/' + miInst.zonas + ' zonas seguras</span></div><div class="mi-rank-bar"><div class="mi-rank-bar-fill" style="width:' + scoreBar + '%;background:' + scoreColor + ';"></div></div></div></div>';

    // Lista completa (10 posiciones)
    var lista = document.getElementById('clasificacionLista');
    lista.innerHTML = '';

    ranking.forEach(function(inst, i) {
        var puesto = i + 1;
        var medalHTML = '';
        if (puesto === 1) medalHTML = '<div class="medal-circle gold"><i class="fa-solid fa-trophy"></i></div>';
        else if (puesto === 2) medalHTML = '<div class="medal-circle silver"><i class="fa-solid fa-medal"></i></div>';
        else if (puesto === 3) medalHTML = '<div class="medal-circle bronze"><i class="fa-solid fa-medal"></i></div>';
        else medalHTML = '<div class="medal-circle"><span>' + puesto + '</span></div>';

        var itemScoreColor = inst.score >= 80 ? '#4CAF50' : inst.score >= 60 ? '#FF9800' : inst.score >= 40 ? '#FF6B35' : inst.vacio ? '#ddd' : '#FF5722';

        var item = document.createElement('div');
        item.className = 'clasificacion-item' + (inst.esMia ? ' es-mia' : '') + (inst.vacio ? ' vacio' : '');

        if (inst.vacio) {
            item.innerHTML = '<div class="clasificacion-medal">' + medalHTML + '</div><div class="clasificacion-info"><span class="clasificacion-nombre vacio-text">Puesto disponible</span><span class="clasificacion-ciudad">Esperando institución...</span></div><div class="clasificacion-score" style="color:#ddd;">—</div>';
        } else {
            item.innerHTML = '<div class="clasificacion-medal">' + medalHTML + '</div><div class="clasificacion-info"><span class="clasificacion-nombre">' + inst.nombre + '</span><span class="clasificacion-ciudad"><i class="fa-solid fa-check-circle" style="color:#4CAF50;font-size:10px;"></i> ' + inst.seguras + '/' + inst.zonas + ' zonas seguras</span></div><div class="clasificacion-score" style="color:' + itemScoreColor + ';"><span>' + inst.score + '</span></div>';
        }
        lista.appendChild(item);
    });
}

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
            window.location.href = 'dashboard.html';
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
