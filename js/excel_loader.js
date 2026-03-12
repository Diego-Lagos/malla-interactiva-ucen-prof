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
                alert("No se encontraron alumnos válidos en este archivo.");
            }
        };

        reader.readAsArrayBuffer(file);
    };

    input.click();
}

function detectarCarreraDesdeURL() {
    const params = new URLSearchParams(window.location.search);
    const mParam = params.get('m'); 

    if (mParam && mParam.includes('_')) {
        const partes = mParam.split('_');
        if (partes.length > 1) {
            return partes[1].toUpperCase(); 
        }
    }
    return null;
}

function generarSelectorDeAlumnos(data) {
    const alumnosMap = new Map();
    const carrerasEncontradas = new Set();
    const carreraRestringida = detectarCarreraDesdeURL();

    data.forEach(fila => {
        const rut = fila['Rut'];
        const carreraFila = String(fila['Código Plan'] || '').trim().toUpperCase();

        if (!rut) return;
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
    let htmlSelectCarrera = '';

    if (carreraRestringida) {
        htmlSelectCarrera = `
            <select id="careerFilter" class="form-control form-control-sm font-weight-bold" 
                    style="background-color: #d1d3e2; color: #333; cursor: not-allowed;" disabled>
                <option value="${carreraRestringida}" selected>Carrera: ${carreraRestringida}</option>
            </select>`;
    } else {
        const opciones = listaCarreras.map(c => `<option value="${c}">${c}</option>`).join('');
        htmlSelectCarrera = `
            <select id="careerFilter" class="form-control form-control-sm font-weight-bold" style="background-color: #e9ecef;">
                <option value="TODAS" selected>Todas las Carreras</option>
                ${opciones}
            </select>`;
    }

    const html = `
        <div class="row align-items-center justify-content-center">
            <div class="col-12 col-md-2 mb-2 mb-md-0">${htmlSelectCarrera}</div>
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

    aplicarFiltros(); 

    const careerFilter = document.getElementById('careerFilter');
    if (!careerFilter.disabled) {
        careerFilter.addEventListener('change', () => {
            aplicarFiltros();
            document.getElementById('studentSelect').value = "";
        });
    }

    document.getElementById('studentSearchInput').addEventListener('input', aplicarFiltros);
    document.getElementById('studentSelect').addEventListener('change', (e) => cargarHistorialAlumno(e.target.value));
}

function aplicarFiltros() {
    const texto = document.getElementById('studentSearchInput').value.toLowerCase();
    const careerFilter = document.getElementById('careerFilter');
    const carreraSeleccionada = careerFilter.value;

    const filtrados = globalAlumnos.filter(alumno => {
        const cumpleTexto = alumno.textoBusqueda.includes(texto);
        let cumpleCarrera = true;
        if (!careerFilter.disabled && carreraSeleccionada !== "TODAS") {
            cumpleCarrera = (alumno.carrera === carreraSeleccionada);
        }
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

// =========================================================================
// CONSTANTES PARA IC05 / IC07
// =========================================================================
const EQUIVALENCIAS_MALLAS_IC = {
    "3225": "1183502", //Algebra 1
    "3230": "1183505", //Algebra 2
    "3226": "1183503", //Calculo 1
    "3231": "1183506", //Calculo 2
    "14703": "1183510", //Electro
    "14700": "1183501", //Intro a la Fisica
    "19076": "1185000", //Intro a la Informatica
    "58000": "1183500", //Intro a las Matematicas
    "14704": "1183504", //Mecanica
    "14702": "1183512", //Programacion Computacional
    "19084": "1185003" //Programacion Orientada a Objetos
};
const CODIGOS_ELECTIVOS_TRANSVERSALES_IC = ["5158","4000", "4001", "4002", "10058", "10051", "5150", "5156", "10059", "10061", "5152", "5182", "5170", "5171", "5172", "5173", "5157", "5151", "5164", "5166", "5155"];
const CODIGOS_ELECTIVOS_FBVA_1_2_IC = ["5805", "1182912", "5810", "1182906", "1182907", "1182908", "1182909", "1182910", "1182911", "1182921"];
const CODIGOS_ELECTIVOS_SELLOS_3_4_IC = ["1182251", "1182252", "1182250", "1182253", "1182254", "1182255", "1182256"];
const CODIGOS_INTER_IC = ["1182917", "1182918"];
const CODIGOS_INTER_AS_IC = ["1182919", "1182920"];

// =========================================================================
// CONSTANTES PARA CO05 / CO06 (Reemplaza los códigos aquí)
// =========================================================================
const EQUIVALENCIAS_MALLAS_CO = {
    "CB-58000": "FD-83500", // Introducción a las Matemáticas
    "CB-14700": "FD-83501", // Introducción a la Física
    "IAP-3242": "FD-84500", // Introducción a la Ingeniería en Construcción
    "CB-3225": "FD-83502",  // Álgebra I
    "CB-3226": "FD-83503",  // Cálculo I
    "CB-14704": "FD-83504", // Mecánica
    "CB-3230": "FD-83505",  // Álgebra II
    "CB-3231": "FD-83506",  // Cálculo II
    "CB-3267": "FD-83518",  // Química General
    "CI-3245": "FD-84501"   // Dibujo e Interpretación de Planos
};
const CODIGOS_ELECTIVOS_TRANSVERSALES_CO = ["5158","4000", "4001", "4002", "10058", "10051", "5150", "5156", "10059", "10061", "5152", "5182", "5170", "5171", "5172", "5173", "5157", "5151", "5164", "5166", "5155"];
const CODIGOS_ELECTIVOS_FBVA_1_2_CO = ["5805", "1182912", "5810", "1182906", "1182907", "1182908", "1182909", "1182910", "1182911", "1182921"];
const CODIGOS_ELECTIVOS_SELLOS_3_4_CO = ["1182251", "1182252", "1182250", "1182253", "1182254", "1182255", "1182256"];
const CODIGOS_INTER_CO = ["1182917", "1182918"];
const CODIGOS_INTER_AS_CO = ["1182919", "1182920"];

// =========================================================================
// CONSTANTES PARA OTROS (Reemplaza los códigos aquí)
// =========================================================================
const EQUIVALENCIAS_MALLAS_OTROS = {
    "OTRO_ANTIGUO_1": "OTRO_NUEVO_1"
};
const CODIGOS_ELECTIVOS_TRANSVERSALES_OTROS = ["5158","4000", "4001", "4002", "10058", "10051", "5150", "5156", "10059", "10061", "5152", "5182", "5170", "5171", "5172", "5173", "5157", "5151", "5164", "5166", "5155"];
const CODIGOS_ELECTIVOS_SELLOS_1_2_OTROS = ["OTRO_SELLO1_1"];
const CODIGOS_ELECTIVOS_SELLOS_3_4_OTROS = ["OTRO_SELLO3_1"];
const CODIGOS_INTER_OTROS = ["OTRO_INTER_1"];
const CODIGOS_INTER_AS_OTROS = ["OTRO_INTER_AS_1"];


// =========================================================================
// LÓGICA PRINCIPAL DE CARGA DE HISTORIAL
// =========================================================================
function cargarHistorialAlumno(rutSeleccionado) {
    if (!rutSeleccionado) {
        if (window.malla) window.malla.cleanSubjects();
        return;
    }

    const alumnoSeleccionado = globalAlumnos.find(a => String(a.rut) === String(rutSeleccionado));
    const carreraAlumno = alumnoSeleccionado ? alumnoSeleccionado.carrera : '';

    const historialBruto = globalHistorialAcademico.filter(fila => String(fila['Rut']) === String(rutSeleccionado));
    const historialPorRamo = {};

    window.historialPorRamoGlobal = historialPorRamo; // <-- NUEVO
    window.mapaMallaAExcel = {}; // <-- NUEVO

    historialBruto.forEach(registro => {
        let codigo = String(registro['Código Asignatura'] || '').trim();
        if (!historialPorRamo[codigo]) historialPorRamo[codigo] = [];
        historialPorRamo[codigo].push(registro);
    });

    const estadosTemporales = {};

    Object.keys(historialPorRamo).forEach(codigo => {
        const intentos = historialPorRamo[codigo];
        intentos.sort((a, b) => {
            const perA = parseInt(String(a['Periodo Asignatura']).replace('-', '')) || 0;
            const perB = parseInt(String(b['Periodo Asignatura']).replace('-', '')) || 0;
            return perB - perA; 
        });

        const masReciente = intentos[0];
        let estadoFinal = 'EN_CURSO';
        let notaRaw = masReciente['Nota'];

        if (notaRaw !== undefined && notaRaw !== null && notaRaw !== '') {
            if (typeof notaRaw === 'string') notaRaw = notaRaw.replace(',', '.');
            const notaNum = parseFloat(notaRaw);
            if (!isNaN(notaNum)) estadoFinal = notaNum >= 4.0 ? 'APROBADO' : 'REPROBADO';
        }

        const logro = String(masReciente['Logro'] || '').toUpperCase();
        if (['APROBADO', 'CONVALIDADO', 'HOMOLOGADO', 'SUFICIENCIA'].includes(logro)) {
            estadoFinal = 'APROBADO';
        }
        estadosTemporales[codigo] = estadoFinal;
    });

    const estadosParaPintar = { ...estadosTemporales };
    const limpiarParaMatch = (str) => String(str).toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

    // =====================================================================
    // RAMIFICACIÓN POR CARRERA 
    // =====================================================================

    if (['IC05', 'IC07'].includes(carreraAlumno)) {
        
        const poolTransversales = [];
        const poolFBVA12 = [];
        const poolSellos34 = [];
        const poolInter = [];
        const poolInterAS = [];

        Object.keys(estadosTemporales).forEach(codigo => {
            const estado = estadosTemporales[codigo];
            
            // 1. RASTREO PARA EQUIVALENCIAS DIRECTAS
            for (const [antiguo, nuevo] of Object.entries(EQUIVALENCIAS_MALLAS_IC)) {
                if (codigo === antiguo) {
                    estadosParaPintar[nuevo] = estado;
                    window.mapaMallaAExcel[nuevo] = antiguo; // <- Memoria
                } else if (codigo === nuevo) {
                    estadosParaPintar[antiguo] = estado;
                    window.mapaMallaAExcel[antiguo] = nuevo; // <- Memoria (por si acaso)
                }
            }

            if (estado === 'APROBADO') {
                const codLimpio = limpiarParaMatch(codigo);
                
                // 2. GUARDAR EL CÓDIGO REAL DEL EXCEL EN LAS BOLSAS (push(codigo) en vez de codLimpio)
                if (CODIGOS_ELECTIVOS_TRANSVERSALES_IC.some(c => limpiarParaMatch(c) === codLimpio)) poolTransversales.push(codigo);
                if (CODIGOS_ELECTIVOS_FBVA_1_2_IC.some(c => limpiarParaMatch(c) === codLimpio)) poolFBVA12.push(codigo);
                if (CODIGOS_ELECTIVOS_SELLOS_3_4_IC.some(c => limpiarParaMatch(c) === codLimpio)) poolSellos34.push(codigo);
                if (CODIGOS_INTER_IC.some(c => limpiarParaMatch(c) === codLimpio)) poolInter.push(codigo);
                if (CODIGOS_INTER_AS_IC.some(c => limpiarParaMatch(c) === codLimpio)) poolInterAS.push(codigo);
            }
        });

        // 3. RASTREO AL ASIGNAR BOLSAS A LA MALLA
        if (poolTransversales.length >= 1) { estadosParaPintar["50000"] = "APROBADO"; window.mapaMallaAExcel["50000"] = poolTransversales[0]; }
        if (poolTransversales.length >= 2) { estadosParaPintar["50001"] = "APROBADO"; window.mapaMallaAExcel["50001"] = poolTransversales[1]; }

        if (poolFBVA12.length >= 1) { estadosParaPintar["FBVA-01"] = "APROBADO"; window.mapaMallaAExcel["FBVA-01"] = poolFBVA12[0]; }
        if (poolFBVA12.length >= 2) { estadosParaPintar["FBVA-02"] = "APROBADO"; window.mapaMallaAExcel["FBVA-02"] = poolFBVA12[1]; }
        
        if (poolSellos34.length >= 1) { estadosParaPintar["CSIRD-01"] = "APROBADO"; window.mapaMallaAExcel["CSIRD-01"] = poolSellos34[0]; }
        if (poolSellos34.length >= 2) { estadosParaPintar["CSIRD-02"] = "APROBADO"; window.mapaMallaAExcel["CSIRD-02"] = poolSellos34[1]; }

        if (poolInter.length >= 1) { estadosParaPintar["INTR"] = "APROBADO"; window.mapaMallaAExcel["INTR-01"] = poolInter[0]; }
        if (poolInterAS.length >= 1) { estadosParaPintar["INTRAS"] = "APROBADO"; window.mapaMallaAExcel["INTR-AS-O2"] = poolInterAS[0]; }

        // 4. RASTREO DE INGLÉS (Como un ramo de Excel aprueba varios de la malla, le pasamos el mismo código original a todos)
        const getCodigoOriginalAprobado = (cod) => {
            let llave = Object.keys(estadosParaPintar).find(k => (k.endsWith(cod) || k === cod) && estadosParaPintar[k] === 'APROBADO');
            return llave ? (window.mapaMallaAExcel[llave] || llave) : null;
        };

        let codInglesAvanzado = getCodigoOriginalAprobado('3349');
        let codInglesIntermedio = getCodigoOriginalAprobado('3338');
        let codInglesBasico = getCodigoOriginalAprobado('3330');

        if (codInglesAvanzado) {
            ['CSH-3349', 'CSH-3338', 'CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesAvanzado; });
        } else if (codInglesIntermedio) {
            ['CSH-3338', 'CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesIntermedio; });
        } else if (codInglesBasico) {
            ['CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesBasico; });
        }

    } else if (['CO05', 'CO06'].includes(carreraAlumno)) {
        
        const poolTransversales = [];
        const poolFBVA12 = [];
        const poolSellos34 = [];
        const poolInter = [];
        const poolInterAS = [];

        Object.keys(estadosTemporales).forEach(codigo => {
            const estado = estadosTemporales[codigo];
            
            // RASTREO EQUIVALENCIAS
            for (const [antiguo, nuevo] of Object.entries(EQUIVALENCIAS_MALLAS_CO)) {
                if (codigo === antiguo) {
                    estadosParaPintar[nuevo] = estado;
                    window.mapaMallaAExcel[nuevo] = antiguo; // <- Memoria
                } else if (codigo === nuevo) {
                    estadosParaPintar[antiguo] = estado;
                    window.mapaMallaAExcel[antiguo] = nuevo; // <- Memoria
                }
            }

            if (estado === 'APROBADO') {
                const codLimpio = limpiarParaMatch(codigo);
                
                // GUARDAR EL CÓDIGO REAL DEL EXCEL (push(codigo))
                if (CODIGOS_ELECTIVOS_TRANSVERSALES_CO.some(c => limpiarParaMatch(c) === codLimpio)) poolTransversales.push(codigo);
                if (CODIGOS_ELECTIVOS_FBVA_1_2_CO.some(c => limpiarParaMatch(c) === codLimpio)) poolFBVA12.push(codigo);
                if (CODIGOS_ELECTIVOS_SELLOS_3_4_CO.some(c => limpiarParaMatch(c) === codLimpio)) poolSellos34.push(codigo);
                if (CODIGOS_INTER_CO.some(c => limpiarParaMatch(c) === codLimpio)) poolInter.push(codigo);
                if (CODIGOS_INTER_AS_CO.some(c => limpiarParaMatch(c) === codLimpio)) poolInterAS.push(codigo);
            }
        });

        // ASIGNACIÓN DE BOLSAS + MEMORIA (mapaMallaAExcel)
        //if (poolTransversales.length >= 1) { estadosParaPintar["CTI1"] = "APROBADO"; window.mapaMallaAExcel["CTI1"] = poolTransversales[0]; }
        //if (poolTransversales.length >= 2) { estadosParaPintar["CTI2"] = "APROBADO"; window.mapaMallaAExcel["CTI2"] = poolTransversales[1]; }

        if (poolFBVA12.length >= 1) { estadosParaPintar["FBVA01"] = "APROBADO"; window.mapaMallaAExcel["FBVA01"] = poolFBVA12[0]; }
        if (poolFBVA12.length >= 2) { estadosParaPintar["FBVA02"] = "APROBADO"; window.mapaMallaAExcel["FBVA02"] = poolFBVA12[1]; }

        if (poolSellos34.length >= 1) { estadosParaPintar["CSIRD3"] = "APROBADO"; window.mapaMallaAExcel["CSIRD3"] = poolSellos34[0]; }
        if (poolSellos34.length >= 2) { estadosParaPintar["CSIRD4"] = "APROBADO"; window.mapaMallaAExcel["CSIRD4"] = poolSellos34[1]; }
        
        if (poolInter.length >= 1) { estadosParaPintar["INTR"] = "APROBADO"; window.mapaMallaAExcel["INTR"] = poolInter[0]; }
        if (poolInterAS.length >= 1) { estadosParaPintar["INTRAS"] = "APROBADO"; window.mapaMallaAExcel["INTRAS"] = poolInterAS[0]; }

        // LÓGICA DE INGLÉS
        const getCodigoOriginalAprobado = (cod) => {
            let llave = Object.keys(estadosParaPintar).find(k => (k.endsWith(cod) || k === cod) && estadosParaPintar[k] === 'APROBADO');
            return llave ? (window.mapaMallaAExcel[llave] || llave) : null;
        };

        let codInglesAvanzado = getCodigoOriginalAprobado('3349');
        let codInglesIntermedio = getCodigoOriginalAprobado('3338');
        let codInglesBasico = getCodigoOriginalAprobado('3330');

        if (codInglesAvanzado) {
            ['CSH-3349', 'CSH-3338', 'CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesAvanzado; });
        } else if (codInglesIntermedio) {
            ['CSH-3338', 'CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesIntermedio; });
        } else if (codInglesBasico) {
            ['CSH-3330'].forEach(c => { estadosParaPintar[c] = 'APROBADO'; window.mapaMallaAExcel[c] = codInglesBasico; });
        }

    }else {
        
        const poolTransversales = [];
        const poolFBVA12 = [];
        const poolSellos34 = [];
        const poolInter = [];
        const poolInterAS = [];

        Object.keys(estadosTemporales).forEach(codigo => {
            const estado = estadosTemporales[codigo];
            for (const [antiguo, nuevo] of Object.entries(EQUIVALENCIAS_MALLAS_OTROS)) {
                if (codigo === antiguo) estadosParaPintar[nuevo] = estado;
                else if (codigo === nuevo) estadosParaPintar[antiguo] = estado;
            }

            if (estado === 'APROBADO') {
                const codLimpio = limpiarParaMatch(codigo);
                if (CODIGOS_ELECTIVOS_TRANSVERSALES_OTROS.some(c => limpiarParaMatch(c) === codLimpio)) poolTransversales.push(codLimpio);
                if (CODIGOS_ELECTIVOS_SELLOS_1_2_OTROS.some(c => limpiarParaMatch(c) === codLimpio)) poolFBVA12.push(codLimpio);
                if (CODIGOS_ELECTIVOS_SELLOS_3_4_OTROS.some(c => limpiarParaMatch(c) === codLimpio)) poolSellos34.push(codLimpio);
                if (CODIGOS_INTER_OTROS.some(c => limpiarParaMatch(c) === codLimpio)) poolInter.push(codLimpio);
                if (CODIGOS_INTER_AS_OTROS.some(c => limpiarParaMatch(c) === codLimpio)) poolInterAS.push(codLimpio);
            }
        });

        if (poolTransversales.length >= 1) estadosParaPintar["50000"] = "APROBADO";
        if (poolTransversales.length >= 2) estadosParaPintar["50001"] = "APROBADO";
        if (poolFBVA12.length >= 1) estadosParaPintar["82000"] = "APROBADO";
        if (poolFBVA12.length >= 2) estadosParaPintar["82001"] = "APROBADO";
        if (poolSellos34.length >= 1) estadosParaPintar["CSRID-01"] = "APROBADO";
        if (poolSellos34.length >= 2) estadosParaPintar["CSRID-02"] = "APROBADO";
        if (poolInter.length >= 1) estadosParaPintar["INTR-01"] = "APROBADO";
        if (poolInterAS.length >= 1) estadosParaPintar["INTR-AS-O2"] = "APROBADO";

        const estaAprobado = (cod) => Object.keys(estadosParaPintar).some(k => (k.endsWith(cod) || k === cod) && estadosParaPintar[k] === 'APROBADO');
        if (estaAprobado('3349')) ['CSH-3349', 'CSH-3338', 'CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
        else if (estaAprobado('3338')) ['CSH-3338', 'CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
        else if (estaAprobado('3330')) ['CSH-3330'].forEach(c => estadosParaPintar[c] = 'APROBADO');
    }

    pintarMallaInteligente(estadosParaPintar);
}

function pintarMallaInteligente(mapaEstados) {
    if (!window.malla || !window.malla.ALLSUBJECTS) return;

    window.malla.cleanSubjects(false);
    const asignaturasMalla = Object.values(window.malla.ALLSUBJECTS);

    asignaturasMalla.forEach(ramo => {
        const siglaMallaClean = String(ramo.sigla).replace(/[^a-zA-Z0-9]/g, "");
        const numMalla = String(ramo.sigla).replace(/\D/g, "");

        let siglaPostGuion = String(ramo.sigla);
        if (siglaPostGuion.includes('-')) {
            siglaPostGuion = siglaPostGuion.substring(siglaPostGuion.indexOf('-') + 1);
        }
        const siglaPostGuionClean = siglaPostGuion.replace(/[^a-zA-Z0-9]/g, "");

        const codigoExcel = Object.keys(mapaEstados).find(k => {
            const excelClean = String(k).replace(/[^a-zA-Z0-9]/g, "");
            
            if (k === ramo.sigla) return true;
            if (excelClean === siglaMallaClean) return true;
            if (excelClean === siglaPostGuionClean) return true;
            if (numMalla.length >= 4 && excelClean.endsWith(numMalla)) return true;
            return false;
        });

        if (codigoExcel) {
            // RECICLAJE: Conectamos la Malla -> Mapa de Estados -> Excel Original
            window.mapaMallaAExcel[ramo.sigla] = window.mapaMallaAExcel[codigoExcel] || codigoExcel;

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

window.mostrarDetalleAsignatura = function(siglaMalla) {
    const studentSelect = document.getElementById('studentSelect');
    if (!studentSelect || !studentSelect.value) return;

    const rutSeleccionado = studentSelect.value;
    const alumno = globalAlumnos.find(a => String(a.rut) === String(rutSeleccionado));
    const nombreAlumno = alumno ? alumno.textoMostrar : `RUT: ${rutSeleccionado}`;

    // MAGIA: Rescatamos el código real del Excel gracias al rastro
    const codigoExcelReal = window.mapaMallaAExcel ? window.mapaMallaAExcel[siglaMalla] : null;
    
    let registros = [];
    
    // Si la malla lo reconoció y lo pintó, vamos directo al registro correcto (O(1))
    if (codigoExcelReal && window.historialPorRamoGlobal && window.historialPorRamoGlobal[codigoExcelReal]) {
        registros = window.historialPorRamoGlobal[codigoExcelReal];
    } else {
        // Plan B: Lógica estricta de respaldo por si pinchan un ramo gris que no está en el Excel
        const numMalla = String(siglaMalla).replace(/\D/g, ""); 
        let siglaPostGuionClean = String(siglaMalla);
        if (siglaPostGuionClean.includes('-')) siglaPostGuionClean = siglaPostGuionClean.substring(siglaPostGuionClean.indexOf('-') + 1);
        siglaPostGuionClean = siglaPostGuionClean.replace(/[^a-zA-Z0-9]/g, "");

        registros = globalHistorialAcademico.filter(fila => {
            if (String(fila['Rut']) !== String(rutSeleccionado)) return false;
            const excelClean = String(fila['Código Asignatura']).replace(/[^a-zA-Z0-9]/g, "");
            
            if (String(fila['Código Asignatura']) === siglaMalla) return true;
            if (excelClean === String(siglaMalla).replace(/[^a-zA-Z0-9]/g, "")) return true;
            if (excelClean === siglaPostGuionClean) return true;
            if (numMalla.length >= 4 && excelClean.endsWith(numMalla)) return true;
            return false;
        });
    }

    if (registros.length === 0) {
        document.getElementById('modalBody').innerHTML = `
            <div class="alert alert-warning mb-0">
                No se encontraron registros de cursado para la asignatura <strong>${siglaMalla}</strong> en el historial de este alumno.
            </div>`;
        $('#modalDetalleRamo').modal('show');
        return;
    }

    let tablaHtml = `
        <div class="mb-3">
            <strong>Alumno:</strong> ${nombreAlumno}<br>
            <strong>Asignatura:</strong> ${siglaMalla} - ${registros[0]['Asignatura'] || 'Sin nombre'}
        </div>
        <table class="table table-sm table-striped border">
            <thead class="thead-dark">
                <tr>
                    <th>Periodo</th>
                    <th class="text-center">Nota</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${registros.map(reg => {
                    const notaRaw = reg['Nota'];
                    let notaClass = '';
                    let notaMostrar = notaRaw || '—';

                    if (notaRaw && typeof notaRaw === 'string') {
                        const notaNum = parseFloat(notaRaw.replace(',', '.'));
                        if (!isNaN(notaNum)) notaClass = notaNum < 4.0 ? 'text-danger font-weight-bold' : 'text-primary font-weight-bold';
                    } else if (typeof notaRaw === 'number') {
                        notaClass = notaRaw < 4.0 ? 'text-danger font-weight-bold' : 'text-primary font-weight-bold';
                    }

                    return `
                    <tr>
                        <td>${reg['Periodo Asignatura'] || 'N/A'}</td>
                        <td class="text-center"><span class="${notaClass}">${notaMostrar}</span></td>
                        <td><small>${reg['Logro'] || 'EN CURSO'}</small></td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>`;

    document.getElementById('modalBody').innerHTML = tablaHtml;
    $('#modalDetalleRamo').modal('show'); 
};