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

            globalHistorialAcademico = jsonData;
            console.log("Datos cargados:", globalHistorialAcademico.length, "filas.");

            generarSelectorDeAlumnos(jsonData);

            if (globalAlumnos.length > 0) {
                alert(`Carga exitosa. ${globalAlumnos.length} alumnos importados.`);
            } else {
                alert("No se encontraron alumnos que coincidan con la carrera de esta malla.");
            }
        };

        reader.readAsArrayBuffer(file);
    };

    input.click();
}

function detectarCarreraDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get('m'); // Ej: "ICCI_IC05"

    if (mParam && mParam.includes('_')) {
        const partes = mParam.split('_');
        if (partes.length > 1) {
            return partes[1].toUpperCase(); // Retorna "IC05"
        }
    }
    return null;
}

function generarSelectorDeAlumnos(data) {
    if (data && data.length > 0) {
        console.log("DEBUG - Keys primera fila:", Object.keys(data[0]));
        console.log("DEBUG - Valor 'Código Plan' primera fila:", data[0]['Código Plan']);
    }
    const alumnosMap = new Map();
    const carrerasEncontradas = new Set();

    // 1. Detectar restricción por URL
    const carreraRestringida = detectarCarreraDesdeURL();
    if (carreraRestringida) {
        console.log("Modo Estricto activado para carrera:", carreraRestringida);
    }

    // --- LISTA BLANCA ---
    const carrerasPermitidas = ['IC05', 'IC07'];

    data.forEach(fila => {
        const rut = fila['Rut'];
        const carreraFila = String(fila['Código Plan'] || '').trim().toUpperCase();

        // 1. Debe tener RUT
        if (!rut) return;

        // 2. Debe estar en la lista blanca general
        if (!carrerasPermitidas.includes(carreraFila)) {
            console.warn(`Fila omitida por código de carrera no permitido: ${carreraFila} (RUT: ${rut})`);
            return;
        }

        // 3. (NUEVO) Si hay restricción por URL, debe coincidir EXACTO. Si no, se ignora.
        if (carreraRestringida && carreraFila !== carreraRestringida) return;

        if (!alumnosMap.has(rut)) {
            carrerasEncontradas.add(carreraFila);

            const nombreCompleto = `${fila['Nombres'] || ''} ${fila['1er Apellido'] || ''} ${fila['2do Apellido'] || ''}`.trim();
            const dv = fila['DV'] || '';

            alumnosMap.set(rut, {
                rut: rut,
                carrera: carreraFila,
                textoBusqueda: `${rut}-${dv} ${nombreCompleto}`.toLowerCase(),
                textoMostrar: `${rut}-${dv} | ${nombreCompleto}`
            });
        }
    });

    globalAlumnos = Array.from(alumnosMap.values());

    // --- HTML ---
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

    const listaCarreras = Array.from(carrerasEncontradas).sort();

    // GENERACIÓN INTELIGENTE DEL SELECTOR DE CARRERA
    let htmlSelectCarrera = '';

    if (carreraRestringida) {
        // MODO ESTRICTO: Solo muestra la carrera de la URL y deshabilita el control
        // No agregamos la opción "Todas"
        htmlSelectCarrera = `
            <select id="careerFilter" class="form-control form-control-sm font-weight-bold" 
                    style="background-color: #d1d3e2; color: #333; cursor: not-allowed;" disabled>
                <option value="${carreraRestringida}" selected>Carrera: ${carreraRestringida}</option>
            </select>`;
    } else {
        // MODO LIBRE: Muestra todas las encontradas + opción "Todas"
        const opciones = listaCarreras.map(c => `<option value="${c}">${c}</option>`).join('');
        htmlSelectCarrera = `
            <select id="careerFilter" class="form-control form-control-sm font-weight-bold" style="background-color: #e9ecef;">
                <option value="TODAS" selected>Todas las Carreras</option>
                ${opciones}
            </select>`;
    }

    const html = `
        <div class="row align-items-center justify-content-center">
            
            <div class="col-12 col-md-2 mb-2 mb-md-0">
                ${htmlSelectCarrera}
            </div>

            <div class="col-12 col-md-4 mb-2 mb-md-0">
                <input type="text" id="studentSearchInput" class="form-control form-control-sm" placeholder="🔍 Buscar por RUT o Nombre...">
            </div>

            <div class="col-12 col-md-4 mb-2 mb-md-0">
                <select id="studentSelect" class="form-control form-control-sm">
                    <option value="">-- Selecciona un alumno --</option>
                </select>
            </div>

            <div class="col-auto">
                <span id="studentStats" class="badge badge-light">-</span>
            </div>
        </div>
    `;

    container.innerHTML = html;
    container.style.display = 'block';

    aplicarFiltros(); // Inicializar lista

    // Eventos
    // Solo agregamos evento 'change' si el select NO está deshabilitado
    const careerFilter = document.getElementById('careerFilter');
    if (!careerFilter.disabled) {
        careerFilter.addEventListener('change', () => {
            aplicarFiltros();
            document.getElementById('studentSelect').value = "";
        });
    }

    document.getElementById('studentSearchInput').addEventListener('input', () => {
        aplicarFiltros();
    });

    document.getElementById('studentSelect').addEventListener('change', (e) => {
        cargarHistorialAlumno(e.target.value);
    });
}

function aplicarFiltros() {
    const texto = document.getElementById('studentSearchInput').value.toLowerCase();
    const careerFilter = document.getElementById('careerFilter');
    const carreraSeleccionada = careerFilter.value;

    // Si el filtro está deshabilitado (Modo estricto), la carrera ya es la única opción posible
    // Si está habilitado, puede ser "TODAS" o una específica

    const filtrados = globalAlumnos.filter(alumno => {
        const cumpleTexto = alumno.textoBusqueda.includes(texto);

        let cumpleCarrera = true;
        if (!careerFilter.disabled && carreraSeleccionada !== "TODAS") {
            cumpleCarrera = (alumno.carrera === carreraSeleccionada);
        }
        // En modo estricto (disabled), globalAlumnos YA viene filtrado desde generarSelectorDeAlumnos,
        // así que no hace falta filtrar de nuevo por carrera, pero si lo hiciéramos daría true igual.

        return cumpleTexto && cumpleCarrera;
    });

    actualizarDropdownAlumnos(filtrados);
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
 * Objeto de Equivalencias: Agrégalo al inicio de tu archivo excel_loader.js
 * Formato: "CODIGO_ANTIGUO": "CODIGO_NUEVO"
 */
/**
 * Tabla de Equivalencias entre IC05 (Antigua) e IC07 (Nueva)
 * Formato: "Código_Antiguo": "Código_Nuevo"
 */
const EQUIVALENCIAS_MALLAS = {
    // --- CIENCIAS BÁSICAS Y COMUNES (Ejemplos frecuentes) ---
    // Nota: Revisa si en tu Excel estos códigos coinciden exactamente
    "3225": "1183502", // Algebra I
    "3230": "1183505", // Algebra II
    "3226": "1183503", // Calculo I
    "3231": "1183506", // Calculo II

    "14703": "1183510", // Electricidad y Magnetismo
    "14700": "1183501", // Intro a la Fisica
    "19076": "1185000", // Intro a la Ingenieria
    "58000": "1183500", // Intro a las Matematicas
    "14704": "1183504", // Mecanica
    "14702": "1183512", // Programacion Computacional
    "19084": "1185003", // POO    
};

const CODIGOS_ELECTIVOS_TRANSVERSALES = [
    "4000", "4001", "4002", "10058", "10051", 
    "5150", "5156", "10059", "5182", "10061", "5152", "5170", 
    "5171", "5172", "5173", "5157", "5158", "5151", "5164", "5166", "5155"
];

const CODIGOS_ELECTIVOS_SELLOS_1_2 = [
    "5805",
    "1182912",
    "5810",
    "1182906",
    "1182907",
    "1182908",
    "1182909",
    "1182910",
    "1182911",
    "1182921"
];

const CODIGOS_ELECTIVOS_SELLOS_3_4 = [
    "1182251",
    "1182252",
    "1182250",
    "1182253",
    "1182254",
    "1182255",
    "1182256"
];

const CODIGOS_INTER = [
    "1182917",
    "1182918"

]

const CODIGOS_INTER_AS = [
    "1182919",
    "1182920"

]

function cargarHistorialAlumno(rutSeleccionado) {
    if (!rutSeleccionado) {
        if (window.malla) window.malla.cleanSubjects();
        return;
    }

    const historialBruto = globalHistorialAcademico.filter(fila => String(fila['Rut']) === String(rutSeleccionado));
    const historialPorRamo = {};

    // 1. Agrupar por código original y quedarnos con el más reciente
    historialBruto.forEach(registro => {
        let codigo = String(registro['Código Asignatura'] || '').trim();
        if (!historialPorRamo[codigo]) historialPorRamo[codigo] = [];
        historialPorRamo[codigo].push(registro);
    });

    const estadosTemporales = {};

    Object.keys(historialPorRamo).forEach(codigo => {
        const intentos = historialPorRamo[codigo];
        
        // Ordenar por periodo: el más actual (ej: 202402) queda en el índice [0]
        intentos.sort((a, b) => {
            const perA = parseInt(String(a['Periodo Asignatura']).replace('-', '')) || 0;
            const perB = parseInt(String(b['Periodo Asignatura']).replace('-', '')) || 0;
            return perB - perA; 
        });

        const masReciente = intentos[0];
        let estadoFinal = 'EN_CURSO';
        let notaRaw = masReciente['Nota'];

        // Lógica de Notas
        if (notaRaw !== undefined && notaRaw !== null && notaRaw !== '') {
            if (typeof notaRaw === 'string') notaRaw = notaRaw.replace(',', '.');
            const notaNum = parseFloat(notaRaw);
            if (!isNaN(notaNum)) {
                estadoFinal = notaNum >= 4.0 ? 'APROBADO' : 'REPROBADO';
            }
        }

        // Prioridad a Logros (Convalidaciones, etc)
        const logro = String(masReciente['Logro'] || '').toUpperCase();
        if (['APROBADO', 'CONVALIDADO', 'HOMOLOGADO', 'SUFICIENCIA'].includes(logro)) {
            estadoFinal = 'APROBADO';
        }

        estadosTemporales[codigo] = estadoFinal;
    });

    // 2. PROCESAMIENTO DE BOLSAS Y EQUIVALENCIAS
    const estadosParaPintar = { ...estadosTemporales };
    
    // Contadores para las bolsas (pools)
    const poolTransversales = [];
    const poolSellos12 = [];
    const poolSellos34 = [];
    const poolInter = [];
    const poolInterAS = [];

    Object.keys(estadosTemporales).forEach(codigo => {
        const estado = estadosTemporales[codigo];

        // A. Mapeo Bidireccional (Para ramos fijos)
        for (const [antiguo, nuevo] of Object.entries(EQUIVALENCIAS_MALLAS)) {
            if (codigo === antiguo) estadosParaPintar[nuevo] = estado;
            else if (codigo === nuevo) estadosParaPintar[antiguo] = estado;
        }

        // B. Clasificación en Bolsas (Solo si el ramo está aprobado)
        if (estado === 'APROBADO') {
            if (CODIGOS_ELECTIVOS_TRANSVERSALES.includes(codigo)) poolTransversales.push(codigo);
            if (CODIGOS_ELECTIVOS_SELLOS_1_2.includes(codigo))    poolSellos12.push(codigo);
            if (CODIGOS_ELECTIVOS_SELLOS_3_4.includes(codigo))    poolSellos34.push(codigo);
            if (CODIGOS_INTER.includes(codigo))                  poolInter.push(codigo);
            if (CODIGOS_INTER_AS.includes(codigo))               poolInterAS.push(codigo);
        }
    });

    // 3. ASIGNACIÓN SECUENCIAL A LA MALLA NUEVA
    
    // Transversales
    if (poolTransversales.length >= 1) estadosParaPintar["50000"] = "APROBADO";
    if (poolTransversales.length >= 2) estadosParaPintar["50001"] = "APROBADO";

    // Sellos 1 y 2
    if (poolSellos12.length >= 1) estadosParaPintar["FBVA-01"] = "APROBADO";
    if (poolSellos12.length >= 2) estadosParaPintar["FBVA-02"] = "APROBADO";

    // Sellos 3 y 4
    if (poolSellos34.length >= 1) estadosParaPintar["CSIRD-01"] = "APROBADO";
    if (poolSellos34.length >= 2) estadosParaPintar["CSIRD-02"] = "APROBADO";

    // Inter
    if (poolInter.length >= 1) estadosParaPintar["INTR-01"] = "APROBADO";

    // Inter AS
    if (poolInterAS.length >= 1) estadosParaPintar["INTR-AS-O2"] = "APROBADO";

    // 4. LÓGICA DE INGLÉS (Arrastre de niveles)
    const estaAprobado = (cod) => Object.keys(estadosParaPintar).some(k => 
        (k.endsWith(cod) || k === cod) && estadosParaPintar[k] === 'APROBADO'
    );

    if (estaAprobado('3349')) {
        ['CSH-3349', 'CSH-3338', 'CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
    } else if (estaAprobado('3338')) {
        ['CSH-3338', 'CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
    } else if (estaAprobado('3330')) {
        ['CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
    }

    // 5. Finalizar y Pintar
    const stats = document.getElementById('studentStats');
    if (stats) stats.textContent = `${Object.keys(estadosParaPintar).length} registros procesados`;

    pintarMallaInteligente(estadosParaPintar);
}

function pintarMallaInteligente(mapaEstados) {
    if (!window.malla || !window.malla.ALLSUBJECTS) {
        console.error("Falta window.malla en min1.js");
        return;
    }

    window.malla.cleanSubjects(false);

    const asignaturasMalla = Object.values(window.malla.ALLSUBJECTS);

    // DEBUG: Ver qué tiene el alumno vs qué busca la malla
    console.group("Depuración de Match de Asignaturas");
    console.log("Códigos del Alumno (Excel Clean):", Object.keys(mapaEstados).map(k => String(k).replace(/[^a-zA-Z0-9]/g, "")));

    let matchCount = 0;
    asignaturasMalla.forEach(ramo => {
        const siglaMallaClean = String(ramo.sigla).replace(/[^a-zA-Z0-9]/g, "");
        const numMalla = String(ramo.sigla).replace(/\D/g, ""); // "83500" de "FD-83500"

        const codigoExcel = Object.keys(mapaEstados).find(k => {
            const excelClean = String(k).replace(/[^a-zA-Z0-9]/g, "");

            // 1. Identidad exacta (ej: códigos manuales de inglés)
            if (k === ramo.sigla) return true;
            if (excelClean === siglaMallaClean) return true;

            // 2. Match por sufijo numérico (Maneja el prefijo "11" del excel vs "FD-" de la malla)
            // Solo si tenemos un número identificable de al menos 4 dígitos para evitar colisiones
            if (numMalla.length >= 4 && excelClean.endsWith(numMalla)) {
                return true;
            }

            return false;
        });

        if (codigoExcel) {
            matchCount++;
            const estado = mapaEstados[codigoExcel];
            if (estado === 'APROBADO') ramo.approveRamo();
            else if (estado === 'REPROBADO') ramo.failRamo();
            else if (estado === 'EN_CURSO') ramo.holdRamo();
        }
    });

    window.malla.verifyPrer();
    window.malla.updateStats();
    window.malla.saveAllStates();
}