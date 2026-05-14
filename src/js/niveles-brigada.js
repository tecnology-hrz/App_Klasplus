// Sistema de Niveles - Brigada Klasplus
import { db, collection, doc, getDoc, setDoc, addDoc, updateDoc, query, where, getDocs, serverTimestamp, arrayUnion, increment } from './firebase-config.js';

// Datos de los 50 niveles
const NIVELES_DATA = generarNiveles();

// Estado global
let estadoUsuario = {
    nivelActual: 1,
    tareasCompletadas: [],
    puntosKlasplus: 0,
    nivelesCompletados: []
};

let nivelSeleccionado = null;
let tareaActual = null;
let fotoSeleccionada = null;

document.addEventListener('DOMContentLoaded', async function() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        window.location.href = 'login.html';
        return;
    }

    await cargarProgreso();
    renderCamino();
    setupEventListeners();
});

// Generar los 50 niveles con sus tareas
function generarNiveles() {
    const bloques = [
        { tema: 'Reconocimiento general', zonas: ['entrada', 'pasillos', 'patio', 'salones', 'cafeteria'] },
        { tema: 'Zonas húmedas y sanitarias', zonas: ['baños', 'cafeteria', 'baños', 'cafeteria', 'baños'] },
        { tema: 'Circulación vertical', zonas: ['escaleras', 'escaleras', 'pasillos', 'escaleras', 'entrada'] },
        { tema: 'Equipos de emergencia', zonas: ['pasillos', 'salones', 'entrada', 'laboratorio', 'patio'] },
        { tema: 'Señalización y rutas', zonas: ['pasillos', 'escaleras', 'entrada', 'patio', 'salones'] },
        { tema: 'Zonas especiales', zonas: ['laboratorio', 'laboratorio', 'salones', 'laboratorio', 'salones'] },
        { tema: 'Zonas deportivas', zonas: ['canchas', 'canchas', 'patio', 'canchas', 'patio'] },
        { tema: 'Infraestructura eléctrica', zonas: ['salones', 'pasillos', 'laboratorio', 'cafeteria', 'entrada'] },
        { tema: 'Zonas exteriores', zonas: ['entrada', 'patio', 'canchas', 'entrada', 'patio'] },
        { tema: 'Evaluación integral', zonas: ['baños', 'escaleras', 'laboratorio', 'canchas', 'entrada'] }
    ];

    const titulos = {
        entrada: 'Entrada Principal', pasillos: 'Pasillos', patio: 'Patio Principal',
        salones: 'Salones de Clase', cafeteria: 'Cafetería', baños: 'Baños',
        escaleras: 'Escaleras', laboratorio: 'Laboratorio', canchas: 'Canchas'
    };

    const preguntas = [
        { q: '¿Qué riesgos observas en esta zona?', opts: ['Piso mojado/resbaloso', 'Falta de iluminación', 'Daño estructural visible', 'No observo riesgos'] },
        { q: '¿Hay señalización de emergencia visible?', opts: ['Sí, clara y visible', 'Sí, pero deteriorada', 'No hay señalización', 'Hay pero está mal ubicada'] },
        { q: '¿Cómo calificarías el estado general?', opts: ['Excelente estado', 'Buen estado con detalles menores', 'Estado regular, necesita atención', 'Mal estado, urgente'] },
        { q: '¿Existe ruta de evacuación señalizada?', opts: ['Sí, bien señalizada', 'Parcialmente señalizada', 'No existe señalización', 'Existe pero está obstruida'] },
        { q: '¿Hay extintores o equipos de emergencia cerca?', opts: ['Sí, accesibles y vigentes', 'Sí, pero vencidos o inaccesibles', 'No hay equipos visibles', 'Hay pero están dañados'] }
    ];

    const niveles = [];
    let nivelNum = 1;

    for (let b = 0; b < bloques.length; b++) {
        const bloque = bloques[b];
        for (let z = 0; z < bloque.zonas.length; z++) {
            const zona = bloque.zonas[z];
            const pregunta = preguntas[(nivelNum - 1) % preguntas.length];

            niveles.push({
                numero: nivelNum,
                titulo: `${titulos[zona]} - ${bloque.tema}`,
                descripcion: `Documenta y evalúa: ${titulos[zona]}`,
                zona: zona,
                tareas: [
                    {
                        id: `nivel${nivelNum}_tarea1`,
                        tipo: 'foto',
                        titulo: `Fotografía: ${titulos[zona]}`,
                        descripcion: `Toma una foto clara del estado actual de ${titulos[zona].toLowerCase()}`,
                        zona: zona,
                        puntos: 2
                    },
                    {
                        id: `nivel${nivelNum}_tarea2`,
                        tipo: 'pregunta',
                        titulo: pregunta.q,
                        descripcion: 'Selecciona la opción que mejor describe lo que observas',
                        opciones: pregunta.opts,
                        puntos: 2
                    },
                    {
                        id: `nivel${nivelNum}_tarea3`,
                        tipo: 'ia',
                        titulo: 'Reporta a la IA',
                        descripcion: `Describe los riesgos que observas en ${titulos[zona].toLowerCase()} y pide recomendaciones de mejora`,
                        puntos: 2
                    }
                ]
            });
            nivelNum++;
        }
    }
    return niveles;
}

// Cargar progreso del usuario desde Firebase
async function cargarProgreso() {
    const userId = localStorage.getItem('userId');
    try {
        const progresoRef = doc(db, 'progreso_usuario', userId);
        const progresoDoc = await getDoc(progresoRef);

        if (progresoDoc.exists()) {
            const data = progresoDoc.data();
            estadoUsuario.nivelActual = data.nivelActual || 1;
            estadoUsuario.tareasCompletadas = data.tareasCompletadas || [];
            estadoUsuario.puntosKlasplus = data.puntosKlasplus || 0;
            estadoUsuario.nivelesCompletados = data.nivelesCompletados || [];
        }
    } catch (error) {
        console.error('Error cargando progreso:', error);
    }

    actualizarUI();
}

// Guardar progreso en Firebase
async function guardarProgreso() {
    const userId = localStorage.getItem('userId');
    try {
        const progresoRef = doc(db, 'progreso_usuario', userId);
        await setDoc(progresoRef, {
            nivelActual: estadoUsuario.nivelActual,
            tareasCompletadas: estadoUsuario.tareasCompletadas,
            puntosKlasplus: estadoUsuario.puntosKlasplus,
            nivelesCompletados: estadoUsuario.nivelesCompletados,
            ultimaActividad: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error('Error guardando progreso:', error);
    }
}

// Guardar respuesta de tarea
async function guardarRespuesta(nivel, tarea, respuesta, fotoURL) {
    const userId = localStorage.getItem('userId');
    const userName = localStorage.getItem('userName');
    const institucionId = localStorage.getItem('userInstitution') || 'default';

    try {
        await addDoc(collection(db, 'respuestas_niveles'), {
            usuarioId: userId,
            nombreUsuario: userName,
            nivelId: nivel.numero,
            tareaId: tarea.id,
            institucionId: institucionId,
            tipo: tarea.tipo,
            zona: nivel.zona || tarea.zona || '',
            respuesta: respuesta,
            fotoURL: fotoURL || '',
            fechaCompletada: new Date().toISOString(),
            puntosGanados: tarea.puntos
        });
    } catch (error) {
        console.error('Error guardando respuesta:', error);
    }
}

// Actualizar zona en mapa de peligro
async function actualizarZonaInstitucion(zona, fotoURL) {
    const institucionId = localStorage.getItem('userInstitution') || 'default';

    try {
        const zonasRef = collection(db, 'zonas_institucion');
        const q = query(zonasRef, where('institucionId', '==', institucionId), where('slug', '==', zona));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            await addDoc(collection(db, 'zonas_institucion'), {
                institucionId: institucionId,
                nombre: zona.charAt(0).toUpperCase() + zona.slice(1),
                slug: zona,
                puntuacionPeligro: 5,
                totalFotos: 1,
                totalReportes: 0,
                fotos: fotoURL ? [{ url: fotoURL, fecha: new Date().toISOString() }] : [],
                recomendaciones: [],
                ultimaActualizacion: new Date().toISOString()
            });
        } else {
            const docRef = snapshot.docs[0].ref;
            const data = snapshot.docs[0].data();
            const fotos = data.fotos || [];
            if (fotoURL) {
                fotos.push({ url: fotoURL, fecha: new Date().toISOString() });
            }
            await updateDoc(docRef, {
                totalFotos: (data.totalFotos || 0) + 1,
                fotos: fotos,
                ultimaActualizacion: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error actualizando zona:', error);
    }
}

// Render del camino de niveles - Camino uniforme y limpio
function renderCamino() {
    const container = document.getElementById('caminoContainer');
    container.innerHTML = '';

    // Patrón tipo Duolingo real: el primer nodo centrado arriba,
    // luego baja en S suave — 2 a la derecha, 2 a la izquierda
    const nodoSpacing = 90;
    const totalHeight = NIVELES_DATA.length * nodoSpacing + 100;

    container.style.position = 'relative';
    container.style.height = totalHeight + 'px';
    container.style.padding = '20px 0';

    // SVG para las líneas (detrás de los nodos)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'camino-svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', totalHeight);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    container.appendChild(svg);

    const posiciones = [];

    NIVELES_DATA.forEach((nivel, index) => {
        let xPercent;

        if (index === 0) {
            // Primer nodo centrado
            xPercent = 50;
        } else {
            // Patrón de S: ciclo de 6 posiciones
            // centro → derecha → derecha → centro → izquierda → izquierda → (repite)
            const ciclo = (index - 1) % 6;
            if (ciclo === 0) xPercent = 62;
            else if (ciclo === 1) xPercent = 72;
            else if (ciclo === 2) xPercent = 62;
            else if (ciclo === 3) xPercent = 38;
            else if (ciclo === 4) xPercent = 28;
            else xPercent = 38;
        }

        const yPos = 50 + (index * nodoSpacing);
        const estado = getEstadoNivel(nivel.numero);

        posiciones.push({ x: xPercent, y: yPos, estado });

        // Crear nodo
        const nodo = document.createElement('div');
        nodo.className = `nivel-nodo nodo-${estado}`;
        nodo.dataset.nivel = nivel.numero;
        nodo.style.position = 'absolute';
        nodo.style.left = `${xPercent}%`;
        nodo.style.top = `${yPos}px`;
        nodo.style.transform = 'translateX(-50%)';

        let iconoEstado = '';
        if (estado === 'completado') iconoEstado = '<i class="fa-solid fa-check"></i>';
        else if (estado === 'bloqueado') iconoEstado = '<i class="fa-solid fa-lock" style="font-size:18px;"></i>';
        else iconoEstado = nivel.numero;

        let estrellasHTML = '';
        if (estado === 'completado') {
            estrellasHTML = `<div class="nodo-estrellas">
                <i class="fa-solid fa-star"></i>
                <i class="fa-solid fa-star"></i>
                <i class="fa-solid fa-star"></i>
            </div>`;
        }

        nodo.innerHTML = `
            <div class="nodo-circulo">${iconoEstado}</div>
            ${estrellasHTML}
        `;

        if (estado !== 'bloqueado') {
            nodo.addEventListener('click', () => abrirNivel(nivel));
        }

        container.appendChild(nodo);
    });

    // Dibujar líneas entre nodos consecutivos
    for (let i = 0; i < posiciones.length - 1; i++) {
        const from = posiciones[i];
        const to = posiciones[i + 1];
        const nodoRadius = 31;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', `${from.x}%`);
        line.setAttribute('y1', from.y + nodoRadius);
        line.setAttribute('x2', `${to.x}%`);
        line.setAttribute('y2', to.y + nodoRadius);

        if (from.estado === 'completado' && (to.estado === 'completado' || to.estado === 'actual')) {
            line.setAttribute('class', 'completada');
        }

        svg.appendChild(line);
    }
}

function getEstadoNivel(numero) {
    if (estadoUsuario.nivelesCompletados.includes(numero)) return 'completado';
    if (numero === estadoUsuario.nivelActual) return 'actual';
    if (numero < estadoUsuario.nivelActual) return 'completado';
    return 'bloqueado';
}

// Abrir modal de nivel con sus 3 tareas
function abrirNivel(nivel) {
    nivelSeleccionado = nivel;
    const modal = document.getElementById('nivelModal');
    document.getElementById('modalNivelNumero').textContent = nivel.numero;
    document.getElementById('modalNivelTitulo').textContent = nivel.titulo;
    document.getElementById('modalNivelDesc').textContent = nivel.descripcion;

    const tareasContainer = document.getElementById('modalTareas');
    tareasContainer.innerHTML = '';

    nivel.tareas.forEach((tarea, index) => {
        const completada = estadoUsuario.tareasCompletadas.includes(tarea.id);
        const bloqueada = index > 0 && !estadoUsuario.tareasCompletadas.includes(nivel.tareas[index - 1].id);

        const iconos = { foto: 'fa-camera', pregunta: 'fa-clipboard-question', ia: 'fa-robot' };
        const card = document.createElement('div');
        card.className = `tarea-card ${completada ? 'completada' : ''} ${bloqueada ? 'bloqueada' : ''}`;

        card.innerHTML = `
            <div class="tarea-card-icon ${tarea.tipo}">
                <i class="fa-solid ${iconos[tarea.tipo]}"></i>
            </div>
            <div class="tarea-card-info">
                <h4>${tarea.titulo}</h4>
                <p>${tarea.descripcion}</p>
            </div>
            ${completada ? '<i class="fa-solid fa-circle-check tarea-card-check"></i>' : `<span class="tarea-card-puntos">+${tarea.puntos}</span>`}
        `;

        if (!completada && !bloqueada) {
            card.addEventListener('click', () => abrirTarea(tarea, nivel));
        }

        tareasContainer.appendChild(card);
    });

    modal.style.display = 'flex';
}

// Abrir modal de tarea según tipo
function abrirTarea(tarea, nivel) {
    tareaActual = tarea;
    document.getElementById('nivelModal').style.display = 'none';

    switch (tarea.tipo) {
        case 'foto': abrirTareaFoto(tarea); break;
        case 'pregunta': abrirTareaPregunta(tarea); break;
        case 'ia': abrirTareaIA(tarea); break;
    }
}

function abrirTareaFoto(tarea) {
    document.getElementById('fotoTareaTitulo').textContent = tarea.titulo;
    document.getElementById('fotoTareaDesc').textContent = tarea.descripcion;
    document.getElementById('zonaSelect').value = tarea.zona || '';
    document.getElementById('zonaPersonalizada').style.display = 'none';
    document.getElementById('fotoPreview').style.display = 'none';
    document.getElementById('fotoUploadArea').style.display = 'block';
    document.getElementById('fotoSubmitBtn').disabled = true;
    fotoSeleccionada = null;
    document.getElementById('tareaFotoModal').style.display = 'flex';
}

function abrirTareaPregunta(tarea) {
    document.getElementById('preguntaTareaTitulo').textContent = tarea.titulo;
    document.getElementById('preguntaTexto').style.display = 'none';
    const container = document.getElementById('opcionesContainer');
    container.innerHTML = '';

    const letras = ['A', 'B', 'C', 'D'];
    tarea.opciones.forEach((opcion, i) => {
        const btn = document.createElement('button');
        btn.className = 'opcion-btn';
        btn.innerHTML = `<span class="opcion-letra">${letras[i]}</span><span>${opcion}</span>`;
        btn.addEventListener('click', () => {
            container.querySelectorAll('.opcion-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            document.getElementById('preguntaSubmitBtn').disabled = false;
        });
        container.appendChild(btn);
    });

    document.getElementById('preguntaSubmitBtn').disabled = true;
    document.getElementById('tareaPreguntaModal').style.display = 'flex';
}

function abrirTareaIA(tarea) {
    document.getElementById('iaTareaTitulo').textContent = tarea.titulo;
    document.getElementById('iaTareaDesc').textContent = tarea.descripcion;
    document.getElementById('iaTextoInput').value = '';
    document.getElementById('iaRespuesta').style.display = 'none';
    document.getElementById('iaSubmitBtn').disabled = true;
    document.getElementById('tareaIAModal').style.display = 'flex';
}

// Completar tarea
async function completarTarea(tipo, respuesta, fotoURL) {
    if (!tareaActual || !nivelSeleccionado) return;

    // Guardar respuesta en Firebase
    await guardarRespuesta(nivelSeleccionado, tareaActual, respuesta, fotoURL);

    // Si es foto, actualizar zona
    if (tipo === 'foto') {
        const zona = document.getElementById('zonaSelect').value || nivelSeleccionado.zona;
        await actualizarZonaInstitucion(zona, fotoURL);
    }

    // Actualizar estado local
    estadoUsuario.tareasCompletadas.push(tareaActual.id);
    estadoUsuario.puntosKlasplus += tareaActual.puntos;

    // Verificar si se completó el nivel
    const todasCompletadas = nivelSeleccionado.tareas.every(t =>
        estadoUsuario.tareasCompletadas.includes(t.id)
    );

    if (todasCompletadas && !estadoUsuario.nivelesCompletados.includes(nivelSeleccionado.numero)) {
        estadoUsuario.nivelesCompletados.push(nivelSeleccionado.numero);
        if (nivelSeleccionado.numero >= estadoUsuario.nivelActual) {
            estadoUsuario.nivelActual = nivelSeleccionado.numero + 1;
        }
    }

    await guardarProgreso();
    actualizarUI();

    // Cerrar modal de tarea
    document.getElementById('tareaFotoModal').style.display = 'none';
    document.getElementById('tareaPreguntaModal').style.display = 'none';
    document.getElementById('tareaIAModal').style.display = 'none';

    // Mostrar toast de puntos ganados
    mostrarToastPuntos(tareaActual.puntos, todasCompletadas);
}

function mostrarToastPuntos(puntos, esUltimaTarea) {
    const toast = document.getElementById('puntosToast');
    const texto = document.getElementById('puntosToastTexto');
    texto.textContent = `+${puntos} puntos Klasplus`;

    // Reset
    toast.classList.remove('visible', 'saliendo');
    toast.style.display = 'flex';

    // Forzar reflow
    toast.offsetHeight;
    toast.classList.add('visible');

    setTimeout(() => {
        toast.classList.remove('visible');
        toast.classList.add('saliendo');
        setTimeout(() => {
            toast.style.display = 'none';
            toast.classList.remove('saliendo');
            if (esUltimaTarea) {
                mostrarNivelCompletado();
            } else {
                abrirNivel(nivelSeleccionado);
            }
        }, 300);
    }, 1800);
}

function mostrarNivelCompletado() {
    document.getElementById('nivelCompletadoModal').style.display = 'flex';
}

function actualizarUI() {
    document.getElementById('puntosTotal').textContent = estadoUsuario.puntosKlasplus;
    document.getElementById('nivelActualBadge').textContent = estadoUsuario.nivelActual;
    const completados = estadoUsuario.nivelesCompletados.length;
    document.getElementById('progresoGeneral').style.width = `${(completados / 50) * 100}%`;
    document.getElementById('progresoText').textContent = `${completados}/50 niveles`;
}

// Convertir foto a base64 (para guardar como URL temporal)
function fotoABase64(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
    });
}

// Event Listeners
function setupEventListeners() {
    // Back button
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'dashboard-brigada.html';
    });

    // Cerrar modales
    document.getElementById('cerrarNivelModal').addEventListener('click', () => {
        document.getElementById('nivelModal').style.display = 'none';
    });
    document.getElementById('cerrarFotoModal').addEventListener('click', () => {
        document.getElementById('tareaFotoModal').style.display = 'none';
    });
    document.getElementById('cerrarPreguntaModal').addEventListener('click', () => {
        document.getElementById('tareaPreguntaModal').style.display = 'none';
    });
    document.getElementById('cerrarIAModal').addEventListener('click', () => {
        document.getElementById('tareaIAModal').style.display = 'none';
    });

    // Nivel completado continuar
    document.getElementById('nivelCompletadoContinuar').addEventListener('click', () => {
        document.getElementById('nivelCompletadoModal').style.display = 'none';
        renderCamino();
    });

    // FOTO: zona selector
    document.getElementById('zonaSelect').addEventListener('change', function() {
        const personalizada = document.getElementById('zonaPersonalizada');
        personalizada.style.display = this.value === 'personalizada' ? 'block' : 'none';
        validarFoto();
    });

    // FOTO: upload area click
    document.getElementById('fotoUploadArea').addEventListener('click', () => {
        document.getElementById('fotoAttachmentModal').classList.add('active');
    });

    // Modal adjuntos - cerrar
    document.getElementById('fotoAttachmentClose').addEventListener('click', () => {
        document.getElementById('fotoAttachmentModal').classList.remove('active');
    });
    document.getElementById('fotoAttachmentModal').addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });

    // Cambiar foto (preview)
    document.getElementById('fotoCambiar').addEventListener('click', () => {
        document.getElementById('fotoAttachmentModal').classList.add('active');
    });

    // Variables WebRTC
    let webrtcStream = null;
    const webrtcOverlay = document.getElementById('nivelesWebrtcOverlay');
    const webrtcVideo = document.getElementById('nivelesWebrtcVideo');
    const webrtcCanvas = document.getElementById('nivelesWebrtcCanvas');

    function stopWebRTC() {
        if (webrtcStream) {
            webrtcStream.getTracks().forEach(t => t.stop());
            webrtcStream = null;
        }
        webrtcOverlay.classList.remove('active');
    }

    document.getElementById('nivelesWebrtcClose').addEventListener('click', stopWebRTC);

    function resizeImage(base64Str, maxW = 800, maxH = 800) {
        return new Promise(resolve => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxW) { h *= maxW / w; w = maxW; }
                if (h > maxH) { w *= maxH / h; h = maxH; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
        });
    }

    function setFotoPreview(base64) {
        fotoSeleccionada = base64;
        document.getElementById('fotoPreviewImg').src = base64;
        document.getElementById('fotoPreview').style.display = 'block';
        document.getElementById('fotoUploadArea').style.display = 'none';
        validarFoto();
    }

    // Capturar foto con WebRTC
    document.getElementById('nivelesWebrtcCapture').addEventListener('click', () => {
        if (!webrtcStream) return;
        webrtcCanvas.width = webrtcVideo.videoWidth;
        webrtcCanvas.height = webrtcVideo.videoHeight;
        webrtcCanvas.getContext('2d').drawImage(webrtcVideo, 0, 0);
        const dataURL = webrtcCanvas.toDataURL('image/jpeg');
        stopWebRTC();
        resizeImage(dataURL).then(setFotoPreview);
    });

    // Botón Tomar Foto
    document.getElementById('btnTomarFotoNiveles').addEventListener('click', async () => {
        document.getElementById('fotoAttachmentModal').classList.remove('active');
        try {
            webrtcStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            webrtcVideo.srcObject = webrtcStream;
            webrtcOverlay.classList.add('active');
        } catch (err) {
            console.error('Error cámara:', err);
            const fi = document.getElementById('fotoInput');
            fi.setAttribute('capture', 'environment');
            setTimeout(() => fi.click(), 300);
        }
    });

    // Botón Elegir de Galería
    document.getElementById('btnGaleriaNiveles').addEventListener('click', () => {
        document.getElementById('fotoAttachmentModal').classList.remove('active');
        const fi = document.getElementById('fotoInput');
        fi.removeAttribute('capture');
        setTimeout(() => fi.click(), 300);
    });

    // FOTO: file input change
    document.getElementById('fotoInput').addEventListener('change', async function(e) {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                const resized = await resizeImage(ev.target.result);
                setFotoPreview(resized);
            };
            reader.readAsDataURL(e.target.files[0]);
            this.value = '';
        }
    });

    // FOTO: submit
    document.getElementById('fotoSubmitBtn').addEventListener('click', async () => {
        const zona = document.getElementById('zonaSelect').value;
        const fotoURL = fotoSeleccionada || '';
        await completarTarea('foto', zona, fotoURL);
    });

    // PREGUNTA: submit
    document.getElementById('preguntaSubmitBtn').addEventListener('click', async () => {
        const selected = document.querySelector('.opcion-btn.selected');
        if (selected) {
            const respuesta = selected.querySelector('span:last-child').textContent;
            await completarTarea('pregunta', respuesta, '');
        }
    });

    // IA: textarea input
    document.getElementById('iaTextoInput').addEventListener('input', function() {
        document.getElementById('iaSubmitBtn').disabled = this.value.trim().length < 10;
    });

    // IA: submit
    document.getElementById('iaSubmitBtn').addEventListener('click', async () => {
        const texto = document.getElementById('iaTextoInput').value.trim();
        if (texto.length >= 10) {
            // Mostrar respuesta simulada de la IA
            document.getElementById('iaRespuesta').style.display = 'block';
            document.getElementById('iaRespuestaTexto').textContent =
                'Gracias por tu reporte. He registrado la información sobre esta zona. ' +
                'Esto nos ayuda a mejorar la seguridad de tu institución. ' +
                'Recuerda siempre reportar cualquier situación de riesgo que observes.';

            await completarTarea('ia', texto, '');
        }
    });

    // Cerrar modales al hacer clic fuera
    ['nivelModal', 'tareaFotoModal', 'tareaPreguntaModal', 'tareaIAModal'].forEach(id => {
        document.getElementById(id).addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });
}

function validarFoto() {
    const zona = document.getElementById('zonaSelect').value;
    const tieneZona = zona && zona !== '' && (zona !== 'personalizada' || document.getElementById('zonaPersonalizada').value.trim() !== '');
    const tieneFoto = fotoSeleccionada !== null && fotoSeleccionada !== '';
    document.getElementById('fotoSubmitBtn').disabled = !(tieneZona && tieneFoto);
}
