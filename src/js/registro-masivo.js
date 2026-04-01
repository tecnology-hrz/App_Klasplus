import { auth, db, collection, getDocs, query, where } from './firebase-config.js';
import { addDoc, setDoc, doc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { colombiaData } from './colombia-data.js';

// Variables globales
let datosEstudiantes = [];
let institucionSeleccionada = null;

// Elementos del DOM
const institucionSelect = document.getElementById('institucionSelect');
const descargarPlantillaBtn = document.getElementById('descargarPlantilla');
const cargarArchivoBtn = document.getElementById('cargarArchivo');
const fileInput = document.getElementById('fileInput');
const previewSection = document.getElementById('previewSection');
const previewTableBody = document.getElementById('previewTableBody');
const confirmarCargaBtn = document.getElementById('confirmarCarga');
const cancelarCargaBtn = document.getElementById('cancelarCarga');
const statsSection = document.getElementById('statsSection');
const mostrarFormInstitucionBtn = document.getElementById('mostrarFormInstitucion');
const crearInstitucionSection = document.getElementById('crearInstitucionSection');
const guardarInstitucionBtn = document.getElementById('guardarInstitucion');
const cancelarInstitucionBtn = document.getElementById('cancelarInstitucion');

// Cargar departamentos al iniciar
function cargarDepartamentos() {
    const departamentoSelect = document.getElementById('departamentoInstitucion');
    departamentoSelect.innerHTML = '<option value="">Selecciona el Departamento</option>';
    
    Object.keys(colombiaData).sort().forEach(departamento => {
        const option = document.createElement('option');
        option.value = departamento;
        option.textContent = departamento;
        departamentoSelect.appendChild(option);
    });
}

// Cargar ciudades según departamento seleccionado
function cargarCiudades(departamento) {
    const ciudadSelect = document.getElementById('ciudadInstitucion');
    ciudadSelect.innerHTML = '<option value="">Selecciona la Ciudad</option>';
    
    if (departamento && colombiaData[departamento]) {
        ciudadSelect.disabled = false;
        colombiaData[departamento].sort().forEach(ciudad => {
            const option = document.createElement('option');
            option.value = ciudad;
            option.textContent = ciudad;
            ciudadSelect.appendChild(option);
        });
    } else {
        ciudadSelect.disabled = true;
        ciudadSelect.innerHTML = '<option value="">Primero selecciona un departamento</option>';
    }
}

// Cargar instituciones al iniciar
async function cargarInstituciones() {
    try {
        const q = query(
            collection(db, "usuarios"), 
            where("tipoUsuario", "==", "institucion"),
            where("estado", "==", "activo")
        );
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            institucionSelect.innerHTML = '<option value="">No hay instituciones disponibles</option>';
            console.log('No se encontraron instituciones activas');
            return;
        }

        // Limpiar opciones existentes excepto la primera
        institucionSelect.innerHTML = '<option value="">Selecciona una institución</option>';
        
        querySnapshot.forEach((doc) => {
            const institucion = doc.data();
            const option = document.createElement('option');
            option.value = doc.id; // UID de la institución
            option.textContent = institucion.nombre || institucion.nombreCompleto || 'Sin nombre';
            option.dataset.nombreInstitucion = institucion.nombre || institucion.nombreCompleto;
            institucionSelect.appendChild(option);
        });

        console.log(`${querySnapshot.size} instituciones cargadas`);
    } catch (error) {
        console.error('Error al cargar instituciones:', error);
        institucionSelect.innerHTML = '<option value="">Error al cargar instituciones</option>';
        alert('Error al cargar las instituciones: ' + error.message);
    }
}

// Descargar plantilla Excel
function descargarPlantilla() {
    if (!institucionSelect.value) {
        alert('Por favor selecciona una institución primero');
        return;
    }

    // Crear datos de ejemplo para la plantilla (2 filas de ejemplo + 98 filas vacías = 100 filas)
    const datosPlantilla = [
        {
            'Nombres': 'Juan',
            'Apellidos': 'Pérez García',
            'Teléfono': '3001234567',
            'Tipo Documento': 'cedula_ciudadania',
            'Número Documento': '1234567890',
            'Sexo': 'masculino',
            'Grado': '10-1',
            'Jornada': 'Mañana'
        },
        {
            'Nombres': 'María',
            'Apellidos': 'González López',
            'Teléfono': '3009876543',
            'Tipo Documento': 'tarjeta_identidad',
            'Número Documento': '9876543210',
            'Sexo': 'femenino',
            'Grado': '11-2',
            'Jornada': 'Tarde'
        }
    ];

    // Agregar 98 filas vacías para completar 100 filas
    for (let i = 0; i < 98; i++) {
        datosPlantilla.push({
            'Nombres': '',
            'Apellidos': '',
            'Teléfono': '',
            'Tipo Documento': '',
            'Número Documento': '',
            'Sexo': '',
            'Grado': '',
            'Jornada': ''
        });
    }

    // Crear hoja de trabajo
    const ws = XLSX.utils.json_to_sheet(datosPlantilla);
    
    // Ajustar ancho de columnas
    const colWidths = [
        { wch: 15 }, // Nombres
        { wch: 20 }, // Apellidos
        { wch: 15 }, // Teléfono
        { wch: 20 }, // Tipo Documento
        { wch: 18 }, // Número Documento
        { wch: 15 }, // Sexo
        { wch: 10 }, // Grado
        { wch: 12 }  // Jornada
    ];
    ws['!cols'] = colWidths;

    // Estilo para los encabezados (primera fila - fondo azul, texto blanco)
    const headerStyle = {
        fill: { 
            patternType: "solid",
            fgColor: { rgb: "0052CC" }
        },
        font: { 
            color: { rgb: "FFFFFF" }, 
            bold: true,
            sz: 11
        },
        alignment: { 
            horizontal: "center", 
            vertical: "center" 
        },
        border: {
            top: { style: "thin", color: { rgb: "0052CC" } },
            bottom: { style: "thin", color: { rgb: "0052CC" } },
            left: { style: "thin", color: { rgb: "0052CC" } },
            right: { style: "thin", color: { rgb: "0052CC" } }
        }
    };

    // Estilo para las celdas de datos (con bordes)
    const cellStyle = {
        border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } }
        },
        alignment: { 
            vertical: "center" 
        }
    };

    // Aplicar estilos a los encabezados (fila 1)
    const headers = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1'];
    headers.forEach(cell => {
        if (ws[cell]) {
            ws[cell].s = headerStyle;
        }
    });

    // Aplicar bordes a todas las celdas de datos (filas 2 a 101)
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (let row = 2; row <= 101; row++) {
        columns.forEach(col => {
            const cellRef = col + row;
            if (!ws[cellRef]) {
                ws[cellRef] = { t: 's', v: '' };
            }
            ws[cellRef].s = cellStyle;
        });
    }

    // Crear libro de trabajo
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');

    // Agregar hoja de instrucciones con formato
    const instrucciones = [
        ['INSTRUCCIONES PARA COMPLETAR LA PLANTILLA'],
        [''],
        ['1. Complete todos los campos requeridos para cada estudiante'],
        [''],
        ['2. Tipos de Documento válidos:'],
        ['   - cedula_ciudadania'],
        ['   - cedula_extranjeria'],
        ['   - tarjeta_identidad'],
        ['   - cedula_identidad'],
        ['   - pasaporte'],
        ['   - pep'],
        [''],
        ['3. Sexo válido:'],
        ['   - masculino'],
        ['   - femenino'],
        ['   - sin_especificar'],
        [''],
        ['4. Grado válido:'],
        ['   - Formato: número solo (ej: 6, 10, 11)'],
        ['   - O con sección: número-sección (ej: 6-1, 6-2, 10-3)'],
        ['   - Grados válidos: 0 a 11 (preescolar a once)'],
        [''],
        ['5. Jornada válida:'],
        ['   - Mañana (con mayúscula)'],
        ['   - Tarde (con mayúscula)'],
        [''],
        ['6. Elimine las filas de ejemplo antes de cargar el archivo']
    ];
    
    const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
    wsInstrucciones['!cols'] = [{ wch: 70 }];
    
    // Estilo para el título de instrucciones (fondo azul, texto blanco)
    const tituloInstruccionesStyle = {
        fill: { 
            patternType: "solid",
            fgColor: { rgb: "0052CC" }
        },
        font: { 
            color: { rgb: "FFFFFF" }, 
            bold: true,
            sz: 14
        },
        alignment: { 
            horizontal: "center", 
            vertical: "center" 
        },
        border: {
            top: { style: "medium", color: { rgb: "0052CC" } },
            bottom: { style: "medium", color: { rgb: "0052CC" } },
            left: { style: "medium", color: { rgb: "0052CC" } },
            right: { style: "medium", color: { rgb: "0052CC" } }
        }
    };
    
    // Estilo para los títulos de secciones (negrita, azul)
    const seccionStyle = {
        font: { 
            color: { rgb: "0052CC" }, 
            bold: true,
            sz: 12
        },
        alignment: { 
            vertical: "center" 
        }
    };
    
    // Estilo para el contenido normal
    const contenidoStyle = {
        font: { 
            sz: 11
        },
        alignment: { 
            vertical: "center",
            wrapText: true
        }
    };
    
    // Aplicar estilo al título principal (A1)
    if (wsInstrucciones['A1']) {
        wsInstrucciones['A1'].s = tituloInstruccionesStyle;
    }
    
    // Aplicar estilos a las secciones numeradas (filas 3, 5, 13, 18, 23, 27)
    const filasSeccion = [3, 5, 13, 18, 23, 27];
    filasSeccion.forEach(fila => {
        const cellRef = 'A' + fila;
        if (wsInstrucciones[cellRef]) {
            wsInstrucciones[cellRef].s = seccionStyle;
        }
    });
    
    // Aplicar estilo al resto del contenido
    for (let row = 2; row <= 27; row++) {
        if (!filasSeccion.includes(row) && row !== 1) {
            const cellRef = 'A' + row;
            if (wsInstrucciones[cellRef]) {
                wsInstrucciones[cellRef].s = contenidoStyle;
            }
        }
    }
    
    XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');

    // Descargar archivo
    const nombreInstitucion = institucionSelect.options[institucionSelect.selectedIndex].text;
    const nombreArchivo = `Plantilla_Estudiantes_${nombreInstitucion.replace(/\s+/g, '_')}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
}

// Generar email automáticamente
function generarEmail(nombres, numeroDocumento) {
    // Tomar el primer nombre y limpiarlo
    const primerNombre = nombres.trim().split(' ')[0].toLowerCase();
    // Remover acentos y caracteres especiales
    const nombreLimpio = primerNombre
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '');
    
    return `${nombreLimpio}.${numeroDocumento}@klasplus.edu.co`;
}

// Validar datos del estudiante
function validarEstudiante(estudiante) {
    const errores = [];

    if (!estudiante.Nombres || estudiante.Nombres.trim() === '') {
        errores.push('Nombres requerido');
    }
    if (!estudiante.Apellidos || estudiante.Apellidos.trim() === '') {
        errores.push('Apellidos requerido');
    }
    if (!estudiante.Teléfono || estudiante.Teléfono.trim() === '') {
        errores.push('Teléfono requerido');
    }
    
    const tiposDocumentoValidos = ['cedula_ciudadania', 'cedula_extranjeria', 'tarjeta_identidad', 'cedula_identidad', 'pasaporte', 'pep'];
    if (!tiposDocumentoValidos.includes(estudiante['Tipo Documento'])) {
        errores.push('Tipo de documento inválido');
    }
    
    if (!estudiante['Número Documento'] || estudiante['Número Documento'].toString().trim() === '') {
        errores.push('Número de documento requerido');
    }
    
    const sexosValidos = ['masculino', 'femenino', 'sin_especificar'];
    if (!sexosValidos.includes(estudiante.Sexo)) {
        errores.push('Sexo inválido');
    }
    
    if (!estudiante.Grado || estudiante.Grado.toString().trim() === '') {
        errores.push('Grado requerido');
    } else {
        // Validar formato de grado: puede ser "6" o "6-1", "6-2", etc.
        const gradoStr = estudiante.Grado.toString().trim();
        const gradoRegex = /^(0|[1-9]|1[0-1])(-[1-9])?$/;
        if (!gradoRegex.test(gradoStr)) {
            errores.push('Formato de grado inválido (ej: 6, 6-1, 6-2)');
        }
    }
    
    const jornadasValidas = ['Mañana', 'Tarde', 'manana', 'tarde'];
    if (!jornadasValidas.includes(estudiante.Jornada)) {
        errores.push('Jornada inválida');
    }

    return errores;
}

// Cargar archivo Excel
function cargarArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!institucionSelect.value) {
        alert('Por favor selecciona una institución primero');
        fileInput.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) {
                alert('El archivo está vacío');
                return;
            }

            datosEstudiantes = jsonData.map(estudiante => {
                const errores = validarEstudiante(estudiante);
                // Generar email y contraseña automáticamente
                const email = generarEmail(estudiante.Nombres, estudiante['Número Documento']);
                const password = estudiante['Número Documento'].toString();
                
                return {
                    ...estudiante,
                    Email: email,
                    Contraseña: password,
                    valido: errores.length === 0,
                    errores: errores
                };
            });

            mostrarVistaPrevia();
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            alert('Error al procesar el archivo. Asegúrate de que sea un archivo Excel válido.');
        }
    };
    reader.readAsArrayBuffer(file);
}

// Mostrar vista previa de datos
function mostrarVistaPrevia() {
    previewTableBody.innerHTML = '';
    
    datosEstudiantes.forEach((estudiante, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${estudiante.Nombres || ''}</td>
            <td>${estudiante.Apellidos || ''}</td>
            <td>${estudiante.Teléfono || ''}</td>
            <td>${estudiante['Tipo Documento'] || ''}</td>
            <td>${estudiante['Número Documento'] || ''}</td>
            <td>${estudiante.Sexo || ''}</td>
            <td>${estudiante.Grado || ''}</td>
            <td>${estudiante.Jornada || ''}</td>
            <td>${estudiante.Email || ''}</td>
            <td>${estudiante.Contraseña || ''}</td>
            <td>
                <span class="status-badge ${estudiante.valido ? 'status-valid' : 'status-invalid'}">
                    ${estudiante.valido ? 'Válido' : 'Errores: ' + estudiante.errores.join(', ')}
                </span>
            </td>
        `;
        previewTableBody.appendChild(row);
    });

    previewSection.style.display = 'block';
    statsSection.style.display = 'none';
}

// Confirmar y registrar estudiantes
async function confirmarCarga() {
    if (!institucionSelect.value) {
        alert('Por favor selecciona una institución');
        return;
    }

    const estudiantesValidos = datosEstudiantes.filter(e => e.valido);
    
    if (estudiantesValidos.length === 0) {
        alert('No hay estudiantes válidos para registrar');
        return;
    }

    if (!confirm(`¿Deseas registrar ${estudiantesValidos.length} estudiantes?`)) {
        return;
    }

    confirmarCargaBtn.disabled = true;
    confirmarCargaBtn.textContent = 'Procesando...';

    let exitosos = 0;
    let errores = 0;

    for (const estudiante of estudiantesValidos) {
        try {
            // Crear usuario en Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                estudiante.Email,
                estudiante.Contraseña
            );

            // Normalizar jornada (convertir a minúsculas)
            const jornada = estudiante.Jornada.toLowerCase();
            
            // Guardar datos en Firestore
            await addDoc(collection(db, 'usuarios'), {
                uid: userCredential.user.uid,
                nombres: estudiante.Nombres,
                apellidos: estudiante.Apellidos,
                nombreCompleto: `${estudiante.Nombres} ${estudiante.Apellidos}`,
                telefono: estudiante.Teléfono,
                tipoDocumento: estudiante['Tipo Documento'],
                numeroDocumento: estudiante['Número Documento'].toString(),
                sexo: estudiante.Sexo,
                genero: estudiante.Sexo,
                grado: estudiante.Grado.toString(),
                jornada: jornada,
                institucionId: institucionSelect.value,
                institucionNombre: institucionSelect.options[institucionSelect.selectedIndex].text,
                email: estudiante.Email,
                tipoUsuario: 'estudiante',
                estado: 'activo',
                autorizacionDatos: true,
                fechaRegistro: new Date().toISOString()
            });

            exitosos++;
        } catch (error) {
            console.error('Error al registrar estudiante:', estudiante.Email, error);
            errores++;
        }
    }

    // Mostrar estadísticas
    document.getElementById('statExitosos').textContent = exitosos;
    document.getElementById('statErrores').textContent = errores;
    document.getElementById('statTotal').textContent = exitosos + errores;
    
    statsSection.style.display = 'block';
    previewSection.style.display = 'none';

    confirmarCargaBtn.disabled = false;
    confirmarCargaBtn.textContent = 'Confirmar y Registrar Estudiantes';

    // Limpiar datos
    datosEstudiantes = [];
    fileInput.value = '';

    alert(`Proceso completado:\n${exitosos} estudiantes registrados exitosamente\n${errores} errores`);
}

// Cancelar carga
function cancelarCarga() {
    datosEstudiantes = [];
    fileInput.value = '';
    previewSection.style.display = 'none';
    statsSection.style.display = 'none';
}

// Event Listeners
institucionSelect.addEventListener('change', (e) => {
    institucionSeleccionada = e.target.value;
});

descargarPlantillaBtn.addEventListener('click', descargarPlantilla);

cargarArchivoBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', cargarArchivo);

confirmarCargaBtn.addEventListener('click', confirmarCarga);

cancelarCargaBtn.addEventListener('click', cancelarCarga);

// Mostrar formulario de crear institución
mostrarFormInstitucionBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const isVisible = crearInstitucionSection.style.display === 'block';
    crearInstitucionSection.style.display = isVisible ? 'none' : 'block';
    mostrarFormInstitucionBtn.textContent = isVisible ? 'Nueva Institución' : 'Ocultar Formulario';
    
    if (isVisible) {
        limpiarFormularioInstitucion();
    }
});

// Cancelar creación de institución
cancelarInstitucionBtn.addEventListener('click', () => {
    crearInstitucionSection.style.display = 'none';
    mostrarFormInstitucionBtn.innerHTML = `
        <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Nueva Institución
    `;
    limpiarFormularioInstitucion();
});

// Guardar nueva institución
guardarInstitucionBtn.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreInstitucion').value.trim();
    const telefono = document.getElementById('telefonoInstitucion').value.trim();
    const nit = document.getElementById('nitInstitucion').value.trim();
    const direccion = document.getElementById('direccionInstitucion').value.trim();
    const departamento = document.getElementById('departamentoInstitucion').value;
    const ciudad = document.getElementById('ciudadInstitucion').value;
    const email = document.getElementById('emailInstitucion').value.trim();
    const password = document.getElementById('passwordInstitucion').value.trim();

    if (!nombre || !telefono || !nit || !direccion || !departamento || !ciudad || !email || !password) {
        alert('Por favor completa todos los campos');
        return;
    }

    if (password.length < 6) {
        alert('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    guardarInstitucionBtn.disabled = true;
    guardarInstitucionBtn.textContent = 'Creando...';

    try {
        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Guardar datos en Firestore usando setDoc con el UID como ID del documento
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
            uid: userCredential.user.uid,
            nombre: nombre,
            nombreCompleto: nombre,
            telefono: telefono,
            nit: nit,
            numeroDocumento: nit,
            tipoDocumento: 'nit',
            direccion: direccion,
            ciudad: ciudad,
            departamento: departamento,
            pais: 'Colombia',
            email: email,
            tipoUsuario: 'institucion',
            estado: 'activo',
            fechaRegistro: new Date().toISOString()
        });

        alert('Institución creada exitosamente');
        
        // Limpiar formulario y recargar instituciones
        limpiarFormularioInstitucion();
        crearInstitucionSection.style.display = 'none';
        mostrarFormInstitucionBtn.innerHTML = `
            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Nueva Institución
        `;
        await cargarInstituciones();
        
        // Seleccionar la nueva institución
        institucionSelect.value = userCredential.user.uid;
        
    } catch (error) {
        console.error('Error al crear institución:', error);
        let errorMessage = 'Error al crear la institución';
        
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'Este email ya está registrado';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email inválido';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Contraseña muy débil';
        }
        
        alert(errorMessage);
    } finally {
        guardarInstitucionBtn.disabled = false;
        guardarInstitucionBtn.textContent = 'Guardar Institución';
    }
});

function limpiarFormularioInstitucion() {
    document.getElementById('nombreInstitucion').value = '';
    document.getElementById('telefonoInstitucion').value = '';
    document.getElementById('nitInstitucion').value = '';
    document.getElementById('direccionInstitucion').value = '';
    document.getElementById('departamentoInstitucion').value = '';
    document.getElementById('ciudadInstitucion').value = '';
    document.getElementById('ciudadInstitucion').disabled = true;
    document.getElementById('emailInstitucion').value = '';
    document.getElementById('passwordInstitucion').value = '';
}

// Event listener para cambio de departamento
document.getElementById('departamentoInstitucion').addEventListener('change', (e) => {
    cargarCiudades(e.target.value);
});

// Toggle para mostrar/ocultar contraseña de institución
const togglePasswordInstitucion = document.getElementById('togglePasswordInstitucion');
if (togglePasswordInstitucion) {
    togglePasswordInstitucion.addEventListener('click', function() {
        const passwordInput = document.getElementById('passwordInstitucion');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        const eyeIcon = document.getElementById('eyeIconInstitucion');
        const eyeSlashIcon = document.getElementById('eyeSlashIconInstitucion');
        eyeIcon.classList.toggle('hidden');
        eyeSlashIcon.classList.toggle('hidden');
    });
}

// Inicializar
cargarInstituciones();
cargarDepartamentos();
