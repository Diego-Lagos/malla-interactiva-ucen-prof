// Variables globales
let globalHistorialAcademico = [];
let globalAlumnos = [];

document.addEventListener('DOMContentLoaded', () => {
    const btnExcel = document.getElementById('uploadExcelButton');
    if (btnExcel) {
        btnExcel.addEventListener('click', handleExcelUpload);
    }
});

function handleExcelUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();

        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("El archivo parece estar vacío.");
                return;
            }

            // Guardamos datos crudos
            globalHistorialAcademico = jsonData;
            console.log("Datos cargados:", globalHistorialAcademico.length, "filas.");
            
            // Generar buscador
            generarSelectorDeAlumnos(jsonData);
            alert(`Carga exitosa. ${jsonData.length} registros procesados.`);
        };

        reader.readAsArrayBuffer(file);
    };

    input.click();
}

function generarSelectorDeAlumnos(data) {
    const alumnosMap = new Map();
    
    data.forEach(fila => {
        const rut = fila['Rut'];
        if (rut && !alumnosMap.has(rut)) {
            const nombreCompleto = `${fila['Nombres'] || ''} ${fila['1er Apellido'] || ''} ${fila['2do Apellido'] || ''}`.trim();
            const dv = fila['DV'] || '';
            alumnosMap.set(rut, {
                rut: rut,
                textoBusqueda: `${rut}-${dv} ${nombreCompleto}`.toLowerCase(),
                textoMostrar: `${rut}-${dv} | ${nombreCompleto}`
            });
        }
    });

    globalAlumnos = Array.from(alumnosMap.values());

    // Crear contenedor si no existe
    let container = document.getElementById('student-selector-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'student-selector-container';
        container.className = 'container-fluid bg-secondary text-white py-2 mb-2';
        container.style.display = 'none';

        const toolbar = document.querySelector('.toolbar-malla');
        if (toolbar && toolbar.parentNode) {
            toolbar.parentNode.insertBefore(container, toolbar.nextSibling);
        } else {
            document.getElementById('content').prepend(container);
        }
    }

    const html = `
        <div class="row align-items-center justify-content-center">
            <div class="col-12 col-md-4 mb-2 mb-md-0">
                <input type="text" id="studentSearchInput" class="form-control form-control-sm" placeholder="🔍 Buscar por RUT o Nombre...">
            </div>
            <div class="col-12 col-md-5 mb-2 mb-md-0">
                <select id="studentSelect" class="form-control form-control-sm">
                    <option value="">-- Selecciona un alumno --</option>
                </select>
            </div>
            <div class="col-auto">
                <span id="studentStats" class="badge badge-light">0 ramos</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';
    actualizarDropdownAlumnos(globalAlumnos);

    // Eventos
    document.getElementById('studentSearchInput').addEventListener('input', (e) => {
        const termino = e.target.value.toLowerCase();
        const filtrados = globalAlumnos.filter(al => al.textoBusqueda.includes(termino));
        actualizarDropdownAlumnos(filtrados);
        if(filtrados.length === 1) {
            document.getElementById('studentSelect').value = filtrados[0].rut;
            cargarHistorialAlumno(filtrados[0].rut);
        }
    });

    document.getElementById('studentSelect').addEventListener('change', (e) => {
        cargarHistorialAlumno(e.target.value);
    });
}

function actualizarDropdownAlumnos(lista) {
    const select = document.getElementById('studentSelect');
    select.innerHTML = '<option value="">-- Selecciona un alumno --</option>';
    const limite = 100;
    
    lista.slice(0, limite).forEach(al => {
        const opt = document.createElement('option');
        opt.value = al.rut;
        opt.textContent = al.textoMostrar;
        select.appendChild(opt);
    });
    
    if (lista.length > limite) {
        const opt = document.createElement('option');
        opt.disabled = true;
        opt.textContent = `... y ${lista.length - limite} más`;
        select.appendChild(opt);
    }
}

/**
 * Lógica Principal de Filtrado y Coloreo
 */
function cargarHistorialAlumno(rutSeleccionado) {
    if (!rutSeleccionado) return;

    // 1. Obtener todas las filas de este alumno
    const historialBruto = globalHistorialAcademico.filter(fila => String(fila['Rut']) === String(rutSeleccionado));
    
    // 2. Agrupar por Código de Asignatura (para manejar repeticiones)
    const historialPorRamo = {};

    historialBruto.forEach(registro => {
        const codigo = String(registro['Código Asignatura'] || '').trim(); // Ej: "58001"
        if (!historialPorRamo[codigo]) {
            historialPorRamo[codigo] = [];
        }
        historialPorRamo[codigo].push(registro);
    });

    // 3. Procesar: Encontrar el registro más actual para cada ramo
    const estadosParaPintar = {};
    const cantidadRamosUnicos = Object.keys(historialPorRamo).length;

    console.group(`Analizando ${cantidadRamosUnicos} asignaturas para RUT ${rutSeleccionado}`);

    Object.keys(historialPorRamo).forEach(codigo => {
        const intentos = historialPorRamo[codigo];
        
        // ORDENAR: El periodo más reciente primero (Descendente)
        // Asumimos formato año-semestre numérico o string comparable (ej: 202310 > 202220)
        // Si 'Periodo Asignatura' es texto, esto intenta ordenarlo alfabéticamente al revés, lo cual suele funcionar para fechas ISO.
        intentos.sort((a, b) => {
            const pA = a['Periodo Asignatura'] || 0;
            const pB = b['Periodo Asignatura'] || 0;
            return pA < pB ? 1 : -1;
        });

        const intentoMasReciente = intentos[0];
        
        // LOGS EN CONSOLA (Requerimiento usuario)
        console.log(`Ramo ${codigo}: ${intentos.length} intentos.`, intentos);
        console.log(`>> Último estado considerado:`, intentoMasReciente);

        // DETERMINAR ESTADO SEGÚN NOTA
        // Nota viene como "5,4" o 5.4 o null
        let notaRaw = intentoMasReciente['Nota'];
        let estadoFinal = 'PENDIENTE'; // Default

        if (notaRaw !== undefined && notaRaw !== null && notaRaw !== '') {
            // Reemplazar coma por punto si es string
            if (typeof notaRaw === 'string') notaRaw = notaRaw.replace(',', '.');
            const notaNum = parseFloat(notaRaw);

            if (!isNaN(notaNum)) {
                if (notaNum >= 4.0) {
                    estadoFinal = 'APROBADO';
                } else {
                    estadoFinal = 'REPROBADO';
                }
            } else {
                // Si hay algo en nota pero no es numero (ej: "P"), revisar Logro o asumir en curso
                estadoFinal = 'EN_CURSO'; 
            }
        } else {
            // Sin nota suele ser que lo está cursando actualmente
            estadoFinal = 'EN_CURSO';
        }

        estadosParaPintar[codigo] = estadoFinal;
    });
    console.groupEnd();

    // Actualizar UI
    const stats = document.getElementById('studentStats');
    if(stats) stats.textContent = `${cantidadRamosUnicos} asignaturas`;

    pintarMallaInteligente(estadosParaPintar);
}

/**
 * Pinta la malla usando la lógica interna de min1.js
 * Esto habilita los prerequisitos automáticamente.
 */
function pintarMallaInteligente(mapaEstados) {
    // 0. Verificar que el puente exista
    if (!window.malla || !window.malla.ALLSUBJECTS) {
        console.error("No se encontró la instancia de la Malla. Asegúrate de agregar 'window.malla = m;' en initMalla() dentro de min1.js");
        return;
    }

    // 1. Limpiar la malla completamente (Lógica y Visual)
    window.malla.cleanSubjects(); 

    // 2. Recorrer los ramos REALES de la malla (del sistema, no del DOM)
    // window.malla.ALLSUBJECTS es un objeto donde la clave es la SIGLA (ej: "INFO1122")
    const asignaturasMalla = Object.values(window.malla.ALLSUBJECTS);

    asignaturasMalla.forEach(ramo => {
        // ramo.sigla es el código oficial en el JSON (ej: "CSH-58001" o "INFO1122")
        // Necesitamos ver si este ramo está en nuestro mapaEstados (que viene del Excel como "58001")
        
        const siglaMallaClean = String(ramo.sigla).replace(/[^a-zA-Z0-9]/g, ""); // "CSH58001"

        // Buscamos si hay match con el Excel
        const codigoExcel = Object.keys(mapaEstados).find(k => {
            const excelClean = String(k).replace(/[^a-zA-Z0-9]/g, ""); // "58001"
            return siglaMallaClean === excelClean || siglaMallaClean.endsWith(excelClean);
        });

        if (codigoExcel) {
            const estado = mapaEstados[codigoExcel];
            
            // 3. Ejecutar la lógica interna de la Malla
            // Esto actualiza colores, contadores y DESBLOQUEA PRERREQUISITOS
            if (estado === 'APROBADO') {
                ramo.approveRamo(); 
            } else if (estado === 'REPROBADO') {
                ramo.failRamo();
            } else if (estado === 'EN_CURSO') {
                ramo.holdRamo(); // "Inscrito" o cursando
            }
        }
    });

    // 4. Paso Final Vital: Decirle a la malla que recalcule los candados
    window.malla.verifyPrer(); 
    window.malla.updateStats(); // Actualizar barritas de progreso
    window.malla.saveAllStates(); // Guardar en localStorage por si recarga la página
    
    console.log("Malla sincronizada con lógica de prerequisitos.");
}