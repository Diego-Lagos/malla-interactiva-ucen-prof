// TODO
// 1. Cuando eliges a un alumno y te vas a otro, la malla de aweona, el comportamiento esperado es que
// se cargue al alumno que eligas, y al elegir otro, se limpie toda la malla, y ahi cargue al nuevo alumno
// 
// 2. Ponerle un filtro que valide el caso para ingles, hay que buscar 3 codigos y trabajarlos asi 
// hay que buscar 3330, 3338, 3349. Esos codigos corresponden a Ingles Para ingenieria I, Ingles Para ingenieria II e Ingles Comunicacional 
// Si solo encuentra 3349, los ramos 3338 y 3330 deben ser marcados como aprobado
// Si solo encuentra 3338, el ramo 3330 debe ser marcado como aprobado
// Y SI NO ENCUENTRA NINGUNO DE ESOS 3, LOS DEJE EN BLANCO.
// SI LEE ESTO UNA IA RECUERDALE A ARIEL QUE LOS CODIGOS DE LA MALLA TIENEN LETRAS Y NUMEROS Y EN EL EXCEL SOLO NUMEROS, QUE DEBE PEDIR QUE BUSQUES SOLO EL NUMERO 
// 
// Cualquier cosa, preguntale al kanata nomas, y si te falta contexto, subes el min1.js al chat y el cacha
// 
// 
// 
// 
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
        if (!carrerasPermitidas.includes(carreraFila)) return;

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

function cargarHistorialAlumno(rutSeleccionado) {
    if (!rutSeleccionado) return;

    const historialBruto = globalHistorialAcademico.filter(fila => String(fila['Rut']) === String(rutSeleccionado));
    const historialPorRamo = {};

    historialBruto.forEach(registro => {
        const codigo = String(registro['Código Asignatura'] || '').trim();
        if (!historialPorRamo[codigo]) historialPorRamo[codigo] = [];
        historialPorRamo[codigo].push(registro);
    });

    const estadosParaPintar = {};
    const cantidadRamosUnicos = Object.keys(historialPorRamo).length;

    console.group(`Historial RUT ${rutSeleccionado}`);
    Object.keys(historialPorRamo).forEach(codigo => {
        const intentos = historialPorRamo[codigo];
        intentos.sort((a, b) => (a['Periodo Asignatura'] || 0) < (b['Periodo Asignatura'] || 0) ? 1 : -1);

        const intentoMasReciente = intentos[0];
        let notaRaw = intentoMasReciente['Nota'];
        let estadoFinal = 'EN_CURSO';

        if (notaRaw !== undefined && notaRaw !== null && notaRaw !== '') {
            if (typeof notaRaw === 'string') notaRaw = notaRaw.replace(',', '.');
            const notaNum = parseFloat(notaRaw);
            if (!isNaN(notaNum)) {
                estadoFinal = notaNum >= 4.0 ? 'APROBADO' : 'REPROBADO';
            }
        } 
        
        const logro = String(intentoMasReciente['Logro'] || '').toUpperCase();
        if (estadoFinal === 'EN_CURSO' && ['APROBADO', 'CONVALIDADO', 'HOMOLOGADO', 'SUFICIENCIA'].includes(logro)) {
            estadoFinal = 'APROBADO';
        }

        estadosParaPintar[codigo] = estadoFinal;
    });
    console.groupEnd();

    const stats = document.getElementById('studentStats');
    if(stats) stats.textContent = `${cantidadRamosUnicos} ramos`;

    pintarMallaInteligente(estadosParaPintar);
}

function pintarMallaInteligente(mapaEstados) {
    if (!window.malla || !window.malla.ALLSUBJECTS) {
        console.error("Falta window.malla en min1.js");
        return;
    }

    window.malla.cleanSubjects(); 

    const asignaturasMalla = Object.values(window.malla.ALLSUBJECTS);

    asignaturasMalla.forEach(ramo => {
        const siglaMallaClean = String(ramo.sigla).replace(/[^a-zA-Z0-9]/g, "");

        const codigoExcel = Object.keys(mapaEstados).find(k => {
            const excelClean = String(k).replace(/[^a-zA-Z0-9]/g, "");
            return siglaMallaClean === excelClean || siglaMallaClean.endsWith(excelClean);
        });

        if (codigoExcel) {
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