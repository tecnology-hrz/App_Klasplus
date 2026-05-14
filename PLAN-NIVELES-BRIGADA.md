# Plan de Acción: Sistema de Niveles - Brigada Klasplus

## Concepto General

Sistema gamificado de 50 niveles con 3 tareas cada uno (150 tareas totales). Los estudiantes brigadistas avanzan por un "camino" visual completando misiones que alimentan la IA de seguridad de su institución educativa. Las fotos geolocalizan zonas de la institución y la IA las analiza para generar un mapa de peligro con puntuación 1-10 por zona.

---

## Flujo Principal

```
Estudiante completa nivel → Sube fotos con ubicación/zona
→ Responde preguntas de contexto → Consulta/reporta a la IA
→ Todo se guarda por institución (sin sobreescribir)
→ La IA procesa las fotos + respuestas
→ Genera mapa de peligro con puntuación 1-10 por zona
→ Cuando alguien pregunta a la IA, responde con datos reales de ESA institución
```

---

## Estructura de Niveles

### Cada nivel contiene 3 tareas en este orden:

| # | Tipo | Icono | Descripción |
|---|---|---|---|
| 1 | 📸 Foto + Zona | Cámara | Tomar foto de una zona específica de la institución (baños, escaleras, patio, lab, etc.) indicando exactamente qué lugar es |
| 2 | 📝 Pregunta ABC/D | Cuestionario | Pregunta de contexto sobre esa zona (estado, riesgos observados, señalización, etc.) |
| 3 | 🤖 Consulta/Reporte IA | Robot | Describir riesgos, pedir recomendaciones, o reportar algo a la IA sobre esa zona |

### Recompensa
- Cada tarea completada = **2 puntos Klasplus**
- Cada nivel completado (3 tareas) = **6 puntos Klasplus** + badge de nivel
- Los puntos se intercambian en la Tienda Klasplus

---

## Sistema de Fotos + Mapa de Peligro

### Cómo funciona:

1. **Tarea 1 de cada nivel**: El estudiante toma una foto y selecciona la zona de la institución (de una lista predefinida o crea nueva):
   - Baños
   - Escaleras (piso 1, 2, 3...)
   - Patio principal
   - Laboratorio
   - Cafetería
   - Pasillos
   - Entrada principal
   - Canchas
   - Salones
   - Azotea/Terraza
   - Zona personalizada (el estudiante la nombra)

2. **La IA analiza** la foto + las respuestas del cuestionario + el reporte y asigna una **puntuación de peligro de 1 a 10**:
   - 1-3: 🟢 Zona segura
   - 4-6: 🟡 Riesgo moderado
   - 7-9: 🟠 Riesgo alto
   - 10: 🔴 Peligro crítico

3. **En el Mapa de Peligro** (`mapa-peligro.html`):
   - Se muestran todas las zonas con su puntuación
   - Se pueden ver TODAS las fotos de cada zona (de todos los estudiantes)
   - Se muestran recomendaciones de la IA para mejorar cada zona
   - La puntuación se actualiza conforme más estudiantes reportan

4. **Múltiples fotos por zona**: Varios estudiantes pueden subir fotos del mismo lugar. Todas se guardan y se pueden ver en galería. La IA usa TODAS para dar una puntuación más precisa.

---

## Diseño Visual - Camino de Niveles

- Estilo "mapa de camino" vertical (como un sendero/ruta de aventura)
- Cada nivel es un nodo circular en el camino
- Niveles completados: verde con check ✅
- Nivel actual: grande, animado, con brillo naranja 🔶
- Niveles bloqueados: gris con candado 🔒
- Al tocar un nivel se despliegan las 3 tareas con iconos y colores

### Paleta de colores (sin morado):
- Primario: `#0047B3` (azul Klasplus)
- Acento: `#FF6B35` (naranja)
- Éxito: `#2ECC71` (verde)
- Alerta: `#F39C12` (amarillo/naranja)
- Peligro: `#E74C3C` (rojo)
- Fondo camino: `#F0F4F8` (gris claro)
- Texto: `#1A1A2E` (negro suave)
- Bloqueado: `#BDC3C7` (gris)

---

## Base de Datos (Firestore)

### Colección: `niveles`
```
niveles/{nivelId}
├── numero: 1-50
├── titulo: "Reconocimiento de Baños"
├── descripcion: "Documenta el estado de los baños..."
├── zonaObjetivo: "baños" (zona que se debe fotografiar)
├── tareas: [
│   {
│       id: "tarea_1",
│       tipo: "foto",
│       titulo: "Fotografía los baños del primer piso",
│       descripcion: "Toma una foto clara mostrando el estado actual",
│       zonaRequerida: "baños_piso1",
│       puntos: 2
│   },
│   {
│       id: "tarea_2",
│       tipo: "pregunta",
│       titulo: "¿Qué riesgos observas en esta zona?",
│       opciones: [
│           "A) Piso mojado sin señalización",
│           "B) Falta de iluminación",
│           "C) Daño estructural visible",
│           "D) No observo riesgos"
│       ],
│       respuestaCorrecta: null (todas válidas, es contexto),
│       puntos: 2
│   },
│   {
│       id: "tarea_3",
│       tipo: "ia",
│       titulo: "Describe los riesgos y pide recomendaciones",
│       descripcion: "Cuéntale a la IA qué problemas ves y pide sugerencias",
│       puntos: 2
│   }
│]
└── puntosTotal: 6
```

### Colección: `respuestas_niveles`
```
respuestas_niveles/{autoId}
├── usuarioId: "uid_estudiante"
├── nombreUsuario: "Laura Pabon"
├── nivelId: 1
├── tareaId: "tarea_1"
├── institucionId: "id_institucion"
├── tipo: "foto" | "pregunta" | "ia"
├── zona: "baños_piso1"
├── respuesta: "url_foto" | "A" | "texto_reporte"
├── fotoURL: "https://..." (si tipo=foto)
├── correcta: null (las preguntas son de contexto, no hay incorrecta)
├── fechaCompletada: timestamp
├── puntosGanados: 2
```

> **IMPORTANTE**: Las respuestas NUNCA se sobreescriben. Cada estudiante genera su propio documento. Así se acumulan TODAS las respuestas de TODOS los estudiantes para retroalimentar la IA por institución.

### Colección: `zonas_institucion`
```
zonas_institucion/{autoId}
├── institucionId: "id_institucion"
├── nombre: "Baños Piso 1"
├── slug: "baños_piso1"
├── puntuacionPeligro: 7.5 (promedio calculado por IA, 1-10)
├── totalFotos: 12
├── totalReportes: 8
├── fotos: [
│   { url: "...", usuarioId: "...", fecha: timestamp },
│   { url: "...", usuarioId: "...", fecha: timestamp }
│]
├── recomendaciones: [
│   "Instalar señalización de piso mojado",
│   "Mejorar iluminación en zona de lavamanos",
│   "Reparar baldosa suelta"
│]
├── ultimaActualizacion: timestamp
└── historialPuntuacion: [
│   { fecha: timestamp, puntuacion: 8.0 },
│   { fecha: timestamp, puntuacion: 7.5 }
│]
```

### Colección: `progreso_usuario`
```
progreso_usuario/{usuarioId}
├── nivelActual: 5
├── tareasCompletadas: ["nivel1_tarea1", "nivel1_tarea2", ...]
├── puntosKlasplus: 48
├── nivelesCompletados: [1, 2, 3, 4]
├── fotosSubidas: 15
├── reportesIA: 8
└── ultimaActividad: timestamp
```

---

## Flujo de la IA por Institución

1. Estudiantes suben fotos con zona identificada
2. Responden cuestionario de contexto sobre esa zona
3. Reportan/consultan a la IA sobre riesgos
4. TODO se guarda con `institucionId` + `zona`
5. La IA procesa:
   - Fotos → Identifica riesgos visuales
   - Respuestas → Contexto de los estudiantes
   - Reportes → Información cualitativa
6. Genera puntuación 1-10 por zona
7. Actualiza el mapa de peligro
8. Cuando alguien pregunta a la IA sobre seguridad, responde con datos REALES de ESA institución:
   - "Los baños del piso 1 tienen puntuación 7.5/10 de peligro. 12 estudiantes han reportado piso mojado y falta de señalización. Recomendamos..."

---

## Distribución de los 50 Niveles (por bloques temáticos)

| Bloque | Niveles | Tema | Zonas a documentar |
|---|---|---|---|
| 1 | 1-5 | Reconocimiento general | Entrada, pasillos, patio |
| 2 | 6-10 | Zonas húmedas y sanitarias | Baños, cafetería, fuentes |
| 3 | 11-15 | Zonas de circulación vertical | Escaleras, rampas, ascensores |
| 4 | 16-20 | Equipos de emergencia | Extintores, botiquín, alarmas |
| 5 | 21-25 | Señalización y rutas | Señales, rutas evacuación, puntos encuentro |
| 6 | 26-30 | Zonas especiales | Laboratorios, talleres, biblioteca |
| 7 | 31-35 | Zonas deportivas | Canchas, gimnasio, vestidores |
| 8 | 36-40 | Infraestructura eléctrica | Tomacorrientes, tableros, cableado |
| 9 | 41-45 | Zonas exteriores | Parqueadero, jardines, muros |
| 10 | 46-50 | Evaluación integral | Re-evaluación de zonas críticas |

---

## Pantallas a Crear

1. **Mapa de niveles** (`niveles-brigada.html`) - Camino visual con los 50 nodos
2. **Detalle de nivel** - Al tocar un nivel se muestran las 3 tareas con iconos
3. **Tarea foto** - Cámara + seleccionar zona + subir imagen
4. **Tarea pregunta** - Opciones A/B/C/D con colores e iconos
5. **Tarea IA** - Input de texto para consultar/reportar
6. **Resumen de nivel** - Puntos ganados + animación
7. **Mapa de peligro mejorado** - Zonas con puntuación, galería de fotos, recomendaciones

---

## Archivos a Crear/Modificar

```
src/secciones/niveles-brigada.html    → Vista del mapa/camino de niveles
src/css/niveles.css                    → Estilos del camino y tareas
src/js/niveles-brigada.js             → Lógica de niveles, progreso, Firebase
src/secciones/mapa-peligro.html       → Actualizar con zonas + fotos + puntuación
src/js/mapa-peligro.js                → Lógica del mapa con datos de Firebase
```

---

## Siguiente Paso

Implementar el mapa de niveles visual (camino) con las 3 tareas por nivel y la conexión a Firebase para guardar fotos por zona.
