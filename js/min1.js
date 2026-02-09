let vh = .01 * window.innerHeight;
document.documentElement.style.setProperty("--vh", `${vh}px`);
window.addEventListener("resize", () => {
    let t = .01 * window.innerHeight;
    document.documentElement.style.setProperty("--vh", `${t}px`);
});

const params = new URLSearchParams(window.location.search);
let carr = params.get("m") || localStorage.getItem("currentCarreer") || "ICCI_2018";
if (params.get("m")) localStorage.setItem("currentCarreer", carr);

let prioritario = document.URL.includes("prioridad"),
    personalizar = document.URL.includes("personalizar"),
    mallaPersonal = document.URL.includes("malla."),
    contact = document.URL.includes("contact"),
    relaPath = (prioritario || personalizar || mallaPersonal || contact) ? "../" : "./",
    texts = mallaPersonal ? "Personal" : prioritario ? "Prioridad" : personalizar ? "Generadora" : "Malla";

const sct = params.get("SCT") !== "false";

// Sanitize sigla values for safe DOM ids.
const domIdForSigla = (sigla) => String(sigla).replace(/[^A-Za-z0-9_-]/g, "_");
const selectById = (id) => d3.select(document.getElementById(domIdForSigla(id)));

// Función para limpiar el pop-up de carga
function removePopUp() {
    d3.select("#overlay").transition().duration(500).style("opacity", 0).on("end", function () {
        d3.select(this).style("display", "none");
        d3.select("#content").classed("blur", false);
    });
}

// Proceso de carga principal
document.addEventListener("DOMContentLoaded", () => {
    if (!params.get("m") && !contact) return; // No cargar si es landing

    let includes = document.querySelectorAll("[data-include]");
    let promises = [];

    // 1. Cargar fragmentos HTML (Header/Footer)
    includes.forEach(t => {
        let url = relaPath + "views/" + t.attributes["data-include"].nodeValue + ".html";
        promises.push(fetch(url).then(r => r.text()).then(html => t.insertAdjacentHTML("afterbegin", html)));
    });

    // 2. Cargar Textos de Bienvenida y Datos de Carrera
    promises.push(fetch(relaPath + "data/welcomeTexts.json").then(r => r.json()));
    promises.push(fetch(relaPath + "data/carreras.json").then(r => r.json()));

    Promise.all(promises).then(values => {
        const welcomeData = values[promises.length - 2][texts];
        const carreras = values[promises.length - 1];

        // Configurar UI Básica
        const templateStr = document.querySelector('script[data-template="tab-template1"]').text;
        const render = (obj) => templateStr.replace(/\${(.+?)}/g, (match, p1) => obj[p1]);

        let fullCareerName = "";
        carreras.forEach(c => {
            if (c.Link === carr) {
                fullCareerName = c.Nombre;
                document.title = "Malla " + c.Nombre;
                $(".carrera").text(c.Nombre);
            }
        });

        if (!contact) {
            initMalla(fullCareerName, welcomeData);
        }

        // Quitar overlay tras un pequeño delay para asegurar renderizado
        setTimeout(removePopUp, 500);
    }).catch(err => console.error("Error cargando la malla:", err));
});

function initMalla(careerName, welcome) {
    let m = mallaPersonal ? new CustomMalla(sct) : new Malla(sct);

    window.malla = m; // <--- AGREGA ESTA LÍNEA (El puente mágico)

    if (prioritario || personalizar) m.enableCreditsSystem();
    else {
        m.enableCreditsStats();
        m.enableCreditsSystem();
        m.enableSave();
    }

    m.setCareer(carr, careerName, relaPath).then(() => {
        m.drawMalla(".canvas");
        m.initVisualizer();
        m.startVisualizerListeners();
        m.updateStats();
        m.displayCreditSystem();
        m.showColorDescriptions();
        m.loadAllStates();
        m.enablePrerCheck();
    });

    // Setup de botones de UI
    const cleanBtn = document.getElementById("cleanApprovedButton");
    if (cleanBtn) cleanBtn.onclick = () => m.cleanSubjects();
}

class Malla {
    constructor(t = !1, e = Ramo, a = 1, r = 1) {
        this.scaleX = a, this.scaleY = r, this.subjectType = e, this.rawMalla = {}, this.categories = {}, this.malla = {}, this.sct = t, this.longestSemester = 0, this.totalCredits = 0, this.totalSubjects = 0, this.MAX_SELECTED_CREDITS = 32, this.semesterManager = null, this.currentMalla = null, this.generatedCode = [], this.APPROVED = [], this.FAILED = [], this.ONHOLD = [], this.SUBJECTID = 1, this.ALLSUBJECTS = {}, this.checkPrer = !1, this.saveEnabled = !1, this.isMallaSet = !1, this.showCreditSystem = !1, this.showCreditStats = !1, document.getElementById("loadfile") && document.getElementById("loadfile").addEventListener("click", this.loadFile.bind(this)), document.getElementById("downloadStateButton") && document.getElementById("downloadStateButton").addEventListener("click", this.downloadMallaState.bind(this));
        document.getElementById("downloadImageButton") && document.getElementById("downloadImageButton").addEventListener("click", () => this.downloadMallaImage("jpg"));
        this.dependencyMap = {};
        this.baseSemester = 1;
    }
    enableCreditsStats() { this.showCreditStats = !0 }
    enableCreditsSystem() { this.showCreditSystem = !0 }
    enableSave() { this.saveEnabled = !0 }
    setCareer(t, e, a) {
        if (null != localStorage.sharedMalla) {
            let t = localStorage.sharedMalla;
            localStorage.removeItem("sharedMalla");
            let e = JSON.parse(t);
            return this.currentMalla = e.name, this.fullCareerName = e.name, Promise.resolve(this.setMallaAndCategories(e.malla, e.categories))
        } {
            this.currentMalla = t, this.fullCareerName = e;
            let r = [];
            return r.push(d3.json(a + "data/data_" + this.currentMalla + ".json")), r.push(d3.json(a + "data/colors_" + this.currentMalla + ".json")), Promise.all(r).then(t => {
                this.setMallaAndCategories(t[0], t[1])
            })
        }
    }
    setMallaAndCategories(t, e) {
        let a, r = 0, s = 0, i = 0;
        for (a in this.rawMalla = t, this.categories = e, this.rawMalla) {
            this.malla[a] = {};
            let semesterNum = parseInt(a.replace("s", ""));
            t[a].length > r && (r = t[a].length), t[a].forEach(t => {
                i += 1;
                let ramoObj;
                if (7 === t.length) {
                    ramoObj = new this.subjectType(t[0], t[1], t[2], t[4], t[5], this.SUBJECTID++, this, t[3], !1, t[6]);
                } else if (6 === t.length) {
                    ramoObj = new this.subjectType(t[0], t[1], t[2], t[4], t[5], this.SUBJECTID++, this, t[3], !1, "");
                } else {
                    ramoObj = new this.subjectType(t[0], t[1], t[2], t[3], t.length > 4 ? t[4] : [], this.SUBJECTID++, this);
                }
                ramoObj.semester = semesterNum;
                this.malla[a][t[1]] = ramoObj;
                this.ALLSUBJECTS[t[1]] = ramoObj;
                s += ramoObj.getDisplayCredits()
            });
        }
        this.longestSemester = r, this.totalCredits = s, this.totalSubjects = i, this.isMallaSet = !0
    }
    setSemesterManager(t) { this.semesterManager = t }
    addSubject(t) { this.ALLSUBJECTS[t.sigla] = t }
    delSubjects(t) {
        Object.values(this.ALLSUBJECTS).forEach(e => {
            e.prer.has(t.sigla) && (e.prer.delete(t.sigla), e.verifyPrer())
        }), delete this.ALLSUBJECTS[t.sigla]
    }
    drawMalla(t) {
        if (!this.isMallaSet) return;
        let e = 10,
            a = 30 * this.scaleY,
            r = this.subjectType.getDisplayWidth(this.scaleX) * Object.keys(this.malla).length + e * (Object.keys(this.malla).length - 1),
            s = (this.subjectType.getDisplayHeight(this.scaleY) + e) * this.longestSemester + 2 * a + e,
            i = r + e,
            l = s + 5;
        d3.select(t).selectAll("svg").remove();
        const n = d3.select(t).append("svg").attr("width", i).attr("height", l).attr("role", "figure");
        n.append("title").text("Malla " + this.fullCareerName);
        const o = n;
        let c = 5, d = 0, h = !1, m = 0, p = 0, u = null, g = null, y = null;
        Object.keys(this.malla).forEach(t => {
            if (d = 0, 0 === m) {
                y = o.append("g").attr("cursor", "pointer").attr("role", "heading").attr("aria-level", "5").classed("year", !0);
                let t = y.append("title");
                u = y.append("rect").attr("x", c).attr("y", d).attr("width", this.subjectType.getDisplayWidth(this.scaleX)).attr("height", a).attr("fill", "gray").classed("bars", !0), m++, g = y.append("text").attr("x", c + this.subjectType.getDisplayWidth(this.scaleX) / 2).attr("y", d + a / 2).text("Año " + p++ + " 1/2").attr("font-weight", "bold").attr("fill", "white").attr("dominant-baseline", "central").attr("text-anchor", "middle"), t.text("Año " + p + " 1/2"), y.on("click", () => {
                    let t = d3.select(d3.event.currentTarget),
                        e = parseInt(t.select("text").text().substr(4));
                    t.node().getBBox().width <= 2 * this.subjectType.getDisplayWidth(this.scaleX) - this.subjectType.getDisplayWidth(this.scaleX) / 2 ? d3.select("#sem" + (2 * e + 1)).dispatch("click") : (d3.select("#sem" + 2 * e).dispatch("click"), d3.select("#sem" + (2 * e - 1)).dispatch("click"))
                })
            } else u.attr("width", 2 * this.subjectType.getDisplayWidth(this.scaleX) + e), g.text("Año " + p), g.attr("x", c - 5), m = 0, y.select("title").text("Año " + p);
            d += a + e, h || (o.append("rect").attr("x", c).attr("y", d).attr("width", r).attr("height", a).attr("fill", "#EEE").classed("sem", !0), h = !0);
            let s = t;
            s = "s" === s[0] ? parseInt(s.substr(1)) : parseInt(s);
            let i = o.append("g").attr("id", "sem" + s).attr("cursor", "pointer").attr("width", this.subjectType.getDisplayWidth(this.scaleX)).attr("height", a).attr("role", "heading").attr("aria-level", "6").classed("sem", !0);
            i.append("title").text("Semestre " + s), i.append("rect").attr("cursor", "pointer").attr("x", c).attr("y", d).attr("width", this.subjectType.getDisplayWidth(this.scaleX)).attr("height", a).classed("sem", !0).attr("fill", "#EEE"), i.append("text").attr("x", c + this.subjectType.getDisplayWidth(this.scaleX) / 2).attr("y", d + a / 2).text(this.romanize(s)).attr("dominant-baseline", "central").attr("text-anchor", "middle"), i.on("click", () => {
                let e = d3.select(d3.event.currentTarget),
                    a = this.deRomanize(e.select("text").text());
                "s" === t[0] && (a = "s" + a), Object.values(this.malla[a]).forEach(t => {
                    t.isBeingClicked()
                })
            }), d += a + e, Object.keys(this.malla[t]).forEach(a => {
                this.malla[t][a].draw(o, c, d, this.scaleX, this.scaleY), d += this.subjectType.getDisplayHeight(this.scaleY) + e
            }), c += this.subjectType.getDisplayWidth(this.scaleX) + e
        })
    }
    showColorDescriptions() {
        let container = d3.select(".color-description");
        container.selectAll("*").remove();
        Object.keys(this.categories).forEach(t => {
            let e = container.append("div").attr("style", "display:flex;vertical-align:middle;margin-right:15px;");
            e.append("svg").attr("height", "25px").attr("width", "25px").append("circle").attr("r", 10).attr("cx", 12).attr("cy", 12).attr("fill", this.categories[t][0]), e.append("span").text(this.categories[t][1])
        })
    }
    enablePrerCheck() { this.checkPrer = !0, this.verifyPrer() }
    verifyPrer() {
        if (this.checkPrer) {
            Object.values(this.ALLSUBJECTS).forEach(t => { t.verifyPrer() });
            this.verifySemesterRange();
            this.saveAllStates();
        }
    }
    verifySemesterRange() {
        let lowestUnfinishedSemester = 99, hasAnyUnfinished = false;
        Object.values(this.ALLSUBJECTS).forEach(ramo => {
            if (!ramo.approved) {
                if (ramo.semester < lowestUnfinishedSemester) lowestUnfinishedSemester = ramo.semester;
                hasAnyUnfinished = true;
            }
        });
        if (!hasAnyUnfinished) {
            this.baseSemester = 1;
            Object.values(this.ALLSUBJECTS).forEach(r => r.unblockByRange());
            return;
        }
        this.baseSemester = lowestUnfinishedSemester;
        let maxAllowedSemester = this.baseSemester + 2;
        Object.values(this.ALLSUBJECTS).forEach(ramo => {
            ramo.semester > maxAllowedSemester ? ramo.blockByRange() : ramo.unblockByRange();
        });
    }
    displayCreditSystem() { this.showCreditSystem && d3.select("#credits-system").text(this.sct ? "SCT" : "USM") }
    updateStats() {
        if (!this.showCreditStats) return;
        let t = 0, e = 0;
        this.APPROVED.forEach(a => { t += a.getDisplayCredits(), e += 1 });
        let a = t / this.totalCredits * 100, r = e / this.totalSubjects * 100;
        d3.select("#credits").text(parseInt(t)), d3.select("#credPercentage").text(parseInt(a)), d3.select("#ramoPercentage").text(parseInt(r))
    }
    updateSelectedCreditsCounter() {
        let totalSelectedCredits = 0;
        this.ONHOLD.forEach(ramo => { totalSelectedCredits += ramo.getDisplayCredits() });
        const countDisplay = document.getElementById('selected-credit-count'), container = document.getElementById('credit-counter-container');
        if (countDisplay && container) {
            countDisplay.textContent = totalSelectedCredits;
            if (totalSelectedCredits > this.MAX_SELECTED_CREDITS) {
                container.classList.add('exceeded');
                if (!window.creditLimitAlertShown) {
                    alert(`¡Advertencia! Has superado el límite de ${this.MAX_SELECTED_CREDITS} créditos.`);
                    window.creditLimitAlertShown = true;
                }
            } else {
                container.classList.remove('exceeded');
                window.creditLimitAlertShown = false;
            }
        }
    }
    cleanSubjects(animated = true) {
        Object.values(this.ALLSUBJECTS).forEach(t => { t.cleanRamo(animated) });
        this.APPROVED = [], this.FAILED = [], this.ONHOLD = [];
        this.verifyPrer(), this.updateStats(), this.updateSelectedCreditsCounter(), this.saveAllStates();
    }
    approveSubject(t) {
        this.FAILED = this.FAILED.filter(ramo => ramo.sigla !== t.sigla);
        this.ONHOLD = this.ONHOLD.filter(ramo => ramo.sigla !== t.sigla);
        this.APPROVED.push(t)
    }
    deApproveSubject(t) {
        let e = this.APPROVED.indexOf(t);
        e > -1 && this.APPROVED.splice(e, 1)
    }
    failSubject(t) {
        this.APPROVED = this.APPROVED.filter(ramo => ramo.sigla !== t.sigla);
        this.ONHOLD = this.ONHOLD.filter(ramo => ramo.sigla !== t.sigla);
        this.FAILED.push(t)
    }
    deFailSubject(t) {
        let e = this.FAILED.indexOf(t);
        e > -1 && this.FAILED.splice(e, 1)
    }
    holdSubject(t) {
        this.APPROVED = this.APPROVED.filter(ramo => ramo.sigla !== t.sigla);
        this.FAILED = this.FAILED.filter(ramo => ramo.sigla !== t.sigla);
        this.ONHOLD.push(t)
    }
    deHoldSubject(t) {
        let e = this.ONHOLD.indexOf(t);
        e > -1 && this.ONHOLD.splice(e, 1)
    }
    getSubject(t) { return this.ALLSUBJECTS[t] }
    saveAllStates() {
        if (this.saveEnabled) {
            let t = "approvedRamos_" + this.currentMalla, f = "failedRamos_" + this.currentMalla, h = "onHoldRamos_" + this.currentMalla, e = [], a = [], r = [];
            this.APPROVED.forEach(t => { e.push(t.sigla) });
            this.FAILED.forEach(t => { a.push(t.sigla) });
            this.ONHOLD.forEach(t => { r.push(t.sigla) });
            localStorage[t] = JSON.stringify(e);
            localStorage[f] = JSON.stringify(a);
            localStorage[h] = JSON.stringify(r);
        }
    }
    loadAllStates() {
        let t = localStorage["approvedRamos_" + this.currentMalla];
        if (t) { JSON.parse(t).forEach(t => { void 0 !== this.ALLSUBJECTS[t] && this.ALLSUBJECTS[t].approveRamo() }) }
        let f = localStorage["failedRamos_" + this.currentMalla];
        if (f) { JSON.parse(f).forEach(f => { void 0 !== this.ALLSUBJECTS[f] && this.ALLSUBJECTS[f].failRamo() }) }
        let h = localStorage["onHoldRamos_" + this.currentMalla];
        if (h) { JSON.parse(h).forEach(h => { void 0 !== this.ALLSUBJECTS[h] && this.ALLSUBJECTS[h].holdRamo() }) }
        this.verifyPrer(), this.updateSelectedCreditsCounter()
    }
    downloadMallaState() {
        let approvedSiglas = this.APPROVED.map(r => r.sigla), failedSiglas = this.FAILED.map(r => r.sigla), onHoldSiglas = this.ONHOLD.map(r => r.sigla);
        const mallaState = { career: this.currentMalla, approved: approvedSiglas, failed: failedSiglas, onHold: onHoldSiglas, timestamp: new Date().toISOString() };
        const jsonState = JSON.stringify(mallaState, null, 2);
        const blob = new Blob([jsonState], { type: "application/json" });
        const url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url, a.download = `estado_malla_${this.currentMalla}_${new Date().toLocaleDateString('es-CL').replace(/\//g, '-')}.json`;
        document.body.appendChild(a), a.click(), document.body.removeChild(a), URL.revokeObjectURL(url)
    }
    downloadMallaImage(format = "png") {
        const svgElement = document.querySelector(".canvas svg");
        if (!svgElement) return;

        // 1. Fondo blanco para el SVG
        const tempRect = d3.select(svgElement).insert("rect", ":first-child")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill", "white")
            .attr("id", "svgBackgroundFix");

        const svgData = new XMLSerializer().serializeToString(svgElement);
        tempRect.remove();

        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();

        img.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const scale = 2; // Alta resolución

            const originalSvgWidth = svgElement.clientWidth;
            const originalSvgHeight = svgElement.clientHeight;
            const footerHeight = 80; // Espacio extra para el texto

            canvas.width = originalSvgWidth * scale;
            canvas.height = (originalSvgHeight + footerHeight) * scale;

            ctx.scale(scale, scale);

            // Fondo blanco general
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

            // Dibujar la malla
            ctx.drawImage(img, 0, 0);

            // --- PIE DE FOTO EN ROJO VIVO ---
            ctx.fillStyle = "#FF0000"; // Rojo vivo
            ctx.font = "bold 16px 'Space Grotesk', sans-serif";
            ctx.textAlign = "center";

            const footerText = "Esta herramienta es meramente ilustrativa y no reemplaza una toma de ramos oficial.";
            // Posicionar el texto centrado horizontalmente y debajo de la malla
            ctx.fillText(footerText, originalSvgWidth / 2, originalSvgHeight + 40);

            const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
            canvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `malla_${this.currentMalla}.${format}`;
                a.click();
                URL.revokeObjectURL(url);
                URL.revokeObjectURL(svgUrl);
            }, mimeType, 0.9);
        };
        img.src = svgUrl;
    }
    deRomanize(t) {
        let e = this.getRnums(), a = this.getAnums(), r = t.replace(/i/g, "M"), s = 0, i = 0, n = e.length;
        for (let t = 1; t < n; ++t) {
            const l = e[t].length;
            for (; r.substr(0, l) === e[t];) {
                if (i++ > 30) return -1;
                s += a[t], r = r.substr(l, r.length - l)
            }
            if (r.length <= 0) break
        }
        return 0 !== r.length && alert(t + " INVALID"), 0 < s && s < 4e6 ? s : -1
    }
    romanize(t) {
        if (t > 3999999 || t < 1) return "";
        let e = this.getRnums(), a = this.getAnums(), r = parseInt(t), s = "", i = 0, l = e.length;
        for (let t = 1; t < l; ++t) {
            for (; r >= parseInt(a[t]);) {
                if (i++ > 30) return -1;
                s += e[t], r -= a[t]
            }
            if (r <= 0) break
        }
        return s
    }
    getRnums() {
        let t = Array();
        return t[1] = "m", t[2] = "cm", t[3] = "d", t[4] = "cd", t[5] = "c", t[6] = "xc", t[7] = "l", t[8] = "xl", t[9] = "x", t[10] = "Mx", t[11] = "v", t[12] = "Mv", t[13] = "M", t[14] = "CM", t[15] = "D", t[16] = "CD", t[17] = "C", t[18] = "XC", t[19] = "L", t[20] = "XL", t[21] = "X", t[22] = "IX", t[23] = "V", t[24] = "IV", t[25] = "I", t
    }
    getAnums() {
        let t = Array();
        return t[1] = 1e6, t[2] = 9e5, t[3] = 5e5, t[4] = 4e5, t[5] = 1e5, t[6] = 9e4, t[7] = 5e4, t[8] = 4e4, t[9] = 1e4, t[10] = 9e3, t[11] = 5e3, t[12] = 4e3, t[13] = 1e3, t[14] = 900, t[15] = 500, t[16] = 400, t[17] = 100, t[18] = 90, t[19] = 50, t[20] = 40, t[21] = 10, t[22] = 9, t[23] = 5, t[24] = 4, t[25] = 1, t
    }
    generateCode() {
        let t = {};
        Object.keys(this.malla).forEach(e => {
            let a = e.includes("s") ? e : "s" + e;
            t[a] = [];
            Object.keys(this.malla[e]).forEach(e => {
                let r = this.ALLSUBJECTS[e], s = [];
                s.push(r.name), s.push(r.sigla), s.push(r.getUSMCredits()), r.USMtoSCT ? s.push(0) : s.push(r.getSCTCredits()), s.push(r.category), s.push([...r.prer]), s.push(r.dictatesIn), t[a].push(s)
            })
        });
        console.log(JSON.stringify(t));
    }
    loadFile(t) {
        let e = document.createElement("input");
        e.type = "file", e.accept = ".json";
        var a = new FileReader;
        a.addEventListener("load", function (t) {
            try {
                const fileContent = JSON.parse(t.target.result);
                if (fileContent.malla) {
                    localStorage.sharedMalla = JSON.stringify(fileContent), location.reload();
                } else if (fileContent.approved) {
                    localStorage.setItem("approvedRamos_" + this.currentMalla, JSON.stringify(fileContent.approved));
                    localStorage.setItem("failedRamos_" + this.currentMalla, JSON.stringify(fileContent.failed));
                    localStorage.setItem("onHoldRamos_" + this.currentMalla, JSON.stringify(fileContent.onHold));
                    location.reload();
                }
            } catch (error) { alert("Error.") }
        }.bind(this));
        e.onchange = t => { a.readAsText(e.files[0]) }, e.click()
    }
    initVisualizer() { if (Object.keys(this.rawMalla).length > 0) this.processData(this.rawMalla) }
    processData(mallaData) {
        Object.values(mallaData).forEach(semesterSubjects => {
            semesterSubjects.forEach(subjectData => {
                let sigla = subjectData[1], prer = [];
                for (let i = 3; i < subjectData.length; i++) { if (Array.isArray(subjectData[i])) { prer = subjectData[i]; break } }
                if (!this.dependencyMap[sigla]) { this.dependencyMap[sigla] = { prer: new Set(prer), unlocks: new Set() } }
                else { prer.forEach(p => this.dependencyMap[sigla].prer.add(p)) }
            });
        });
        Object.keys(this.dependencyMap).forEach(sigla => {
            let subject = this.dependencyMap[sigla];
            subject.prer.forEach(prerSigla => { if (this.dependencyMap[prerSigla]) this.dependencyMap[prerSigla].unlocks.add(sigla) });
        });
    }
    handleMouseOver(sigla) {
        if (!this.dependencyMap[sigla]) return;
        this.dependencyMap[sigla].prer.forEach(p => { let svg = selectById(p); if (!svg.empty()) svg.classed("requires-ramo", true) });
        this.dependencyMap[sigla].unlocks.forEach(u => { let svg = selectById(u); if (!svg.empty()) svg.classed("opens-ramo", true) });
    }
    handleMouseOut(sigla) {
        if (!this.dependencyMap[sigla]) return;
        this.dependencyMap[sigla].prer.forEach(p => { let svg = selectById(p); if (!svg.empty()) svg.classed("requires-ramo", false) });
        this.dependencyMap[sigla].unlocks.forEach(u => { let svg = selectById(u); if (!svg.empty()) svg.classed("opens-ramo", false) });
    }
    startVisualizerListeners() {
        Object.keys(this.dependencyMap).forEach(sigla => {
            const svgGroup = selectById(sigla);
            if (!svgGroup.empty() && svgGroup.node()) {
                const element = svgGroup.node();
                element.addEventListener("mouseenter", () => this.handleMouseOver(sigla));
                element.addEventListener("mouseleave", () => this.handleMouseOut(sigla));
            }
        });
    }
}

let width = 100, height = 100;
class Ramo {
    static get width() { return width }
    static get height() { return height }
    static getDisplayWidth(t) { return width * t }
    static getDisplayHeight(t) { return height * t }
    constructor(t, e, a, r, s = [], i, l, n = 0, o = !1, c = "") {
        this.name = t, this.sigla = e, this.credits = a, this.category = r, this.prer = new Set(s), n ? (this.creditsSCT = n, this.USMtoSCT = !1) : (this.creditsSCT = Math.round(5 * a / 3), this.USMtoSCT = !0), this.dictatesIn = c, this.malla = l, this.isCustom = o, this.beenEdited = !1, this.id = i, this.ramo = null, this.approved = !1, this.failed = !1, this.onHold = !1, this.semester = 0, this.isBlockedByRange = false;
    }
    getSCTCredits() { return this.creditsSCT }
    getUSMCredits() { return this.credits }
    getDisplayCredits() { return this.malla.sct ? this.getSCTCredits() : this.getUSMCredits() }
    draw(t, e, a, r, s) {
        this.ramo = t.append("g").attr("cursor", "pointer").attr("role", "img").classed("subject", !0).attr("id", domIdForSigla(this.sigla));
        let i = this.constructor.getDisplayWidth(r), l = this.constructor.getDisplayHeight(s), n = l / 5, o = this.getDisplayCredits(), c = this.malla.categories[this.category][0];
        this.ramo.append("title").text(this.name);
        this.ramo.append("rect").attr("x", e).attr("y", a).attr("width", i).attr("height", l).attr("fill", c);
        this.ramo.append("rect").attr("x", e).attr("y", a).attr("width", i).attr("height", n).attr("fill", "#6D6E71").classed("bars", !0);
        this.ramo.append("rect").attr("x", e).attr("y", a + l - n).attr("width", i).attr("height", n).attr("fill", "#6D6E71").classed("bars", !0);
        this.ramo.append("rect").attr("x", e + i - 22 * r).attr("y", a + l - n).attr("width", 20 * r).attr("height", n).attr("fill", "white");
        this.ramo.append("text").attr("x", e + i - 22 * r + 20 * r / 2).attr("y", a + l - n / 2).text(o).attr("font-weight", "regular").attr("fill", "black").attr("dominant-baseline", "central").attr("text-anchor", "middle").attr("font-size", 12 * s);
        this.ramo.append("text").attr("x", e + i / 2).attr("y", a + l / 2).attr("dy", 0).text(this.name).attr("class", "ramo-label").attr("fill", () => this.needsWhiteText(c) ? "white" : "#222222").attr("font-size", 13).attr("text-anchor", "middle").attr("dominant-baseline", "central");
        this.ramo.append("text").attr("x", e + 2).attr("y", a + 10).attr("dominant-baseline", "central").text(this.sigla).attr("font-weight", "bold").attr("fill", "white").attr("font-size", r < .85 ? 11 : 12);
        this.drawActions(e, a, i, l);
        this.ramo.append("circle").attr("cx", e + i - 10).attr("cy", a + n / 2).attr("fill", "white").attr("r", 8);
        this.ramo.append("text").attr("x", e + i - 10).attr("y", a + n / 2).attr("dominant-baseline", "central").attr("text-anchor", "middle").attr("fill", "black").attr("font-size", 10).text(this.id);
        this.ramo.on("click", () => this.isBeingClicked());
        this.wrap(i - 5, l / 5 * 3);
    }
    drawActions(t, e, a, r) {
        if (null == this.ramo) return;
        this.ramo.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "white").attr("opacity", "0.001").attr("class", "non-approved");
        this.ramo.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "#333").attr("opacity", "0.001").attr("class", "out-of-range");
        let holdGroup = this.ramo.append("g").attr("class", "on-hold").attr("opacity", 0);
        holdGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "#FFD44040");
        holdGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "none").attr("stroke", "#FFD440").attr("stroke-width", 5);
        let failedGroup = this.ramo.append("g").attr("class", "failed").attr("opacity", 0);
        failedGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "#AA000040");
        failedGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "none").attr("stroke", "#AA0000").attr("stroke-width", 5);
        let approvedGroup = this.ramo.append("g").attr("class", "cross").attr("opacity", 0);
        approvedGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "#00AA0040");
        approvedGroup.append("rect").attr("x", t).attr("y", e).attr("width", a).attr("height", r).attr("fill", "none").attr("stroke", "#00AA00").attr("stroke-width", 5);
    }
    isBeingClicked() {
        if (this.isBlockedByRange && !this.approved && !this.failed) return;
        if (this.approved) { this.deApproveRamo(), this.failRamo() }
        else if (this.failed) { this.cleanFail(), this.holdRamo() }
        else if (this.onHold) { this.cleanHold() }
        else { this.approveRamo() }
        this.malla.verifyPrer(), this.malla.updateStats(), this.malla.updateSelectedCreditsCounter(), this.malla.saveAllStates()
    }
    approveRamo() {
        this.isCustom || selectById(this.sigla).select(".cross").attr("opacity", "1");
        if (!this.approved) { this.malla.approveSubject(this), this.approved = true }
    }
    deApproveRamo(animated = true) {
        if (this.approved) {
            if (!this.isCustom) {
                let sel = selectById(this.sigla).select(".cross");
                if (animated) sel.transition().attr("opacity", "0.01");
                else sel.interrupt().attr("opacity", "0.01");
            }
            this.malla.deApproveSubject(this), this.approved = false;
        }
    }
    failRamo() {
        if (!this.failed) {
            this.isCustom || selectById(this.sigla).select(".failed").attr("opacity", "1");
            this.malla.failSubject(this), this.failed = true;
        }
    }
    cleanFail(animated = true) {
        if (this.failed) {
            if (!this.isCustom) {
                let sel = selectById(this.sigla).select(".failed");
                if (animated) sel.transition().attr("opacity", "0.01");
                else sel.interrupt().attr("opacity", "0.01");
            }
            this.malla.deFailSubject(this), this.failed = false;
        }
    }
    holdRamo() {
        if (!this.onHold) {
            this.isCustom || selectById(this.sigla).select(".on-hold").attr("opacity", "1");
            this.malla.holdSubject(this), this.onHold = true;
        }
    }
    cleanHold(animated = true) {
        if (this.onHold) {
            if (!this.isCustom) {
                let sel = selectById(this.sigla).select(".on-hold");
                if (animated) sel.transition().attr("opacity", "0.01");
                else sel.interrupt().attr("opacity", "0.01");
            }
            this.malla.deHoldSubject(this), this.onHold = false;
        }
    }
    cleanRamo(animated = true) { this.deApproveRamo(animated), this.cleanFail(animated), this.cleanHold(animated) }
    blockByRange() {
        this.isBlockedByRange = true;
        if (!this.approved && !this.failed && !this.onHold) {
            this.ramo.select(".out-of-range").transition().attr("opacity", "0.6");
            this.ramo.attr("cursor", "not-allowed");
        }
    }
    unblockByRange() {
        this.isBlockedByRange = false;
        this.ramo.select(".out-of-range").transition().attr("opacity", "0.001");
        this.ramo.attr("cursor", "pointer");
    }
    verifyPrer() {
        if (this.isCustom) return;
        let t = new Set(this.malla.APPROVED.map(e => e.sigla));
        for (let e of this.prer) { if (!t.has(e)) return void this.ramo.select(".non-approved").transition().attr("opacity", "0.71") }
        this.ramo.select(".non-approved").transition().attr("opacity", "0.0");
    }
    wrap(t, e) {
        let i = this.ramo.select(".ramo-label"), l = i.text().split(/\s+/).reverse(), n = [], c = parseInt(i.attr("font-size"), 10), d = i.text(null).append("tspan").attr("x", i.attr("x")).attr("dominant-baseline", "central").attr("dy", "0em");
        for (let a = l.pop(); a;) {
            n.push(a), d.text(n.join(" "));
            if (d.node().getComputedTextLength() > t) {
                if (n.length === 1) i.attr("font-size", String(--c));
                else { n.pop(), d.text(n.join(" ")), n = [a], d = i.append("tspan").attr("x", i.attr("x")).attr("dominant-baseline", "central").attr("dy", "1.1em").text(a) }
            }
            a = l.pop();
        }
        let h = i.selectAll("tspan"), r = h._groups[0].length, s = i.node().getBoundingClientRect().height;
        while (s > e - 5 && c > 8) { i.attr("font-size", String(--c)), s = i.node().getBoundingClientRect().height }
        if (1 !== r) h.filter((t, e) => 0 === e).attr("dy", -(1.1 * r / 2 - .55) + "em");
    }
    needsWhiteText(t) {
        let e = 0, a = 0, r = 0;
        if (4 === t.length) { e = "0x" + t[1] + t[1], a = "0x" + t[2] + t[2], r = "0x" + t[3] + t[3] }
        else if (7 === t.length) { e = "0x" + t[1] + t[2], a = "0x" + t[3] + t[4], r = "0x" + t[5] + t[6] }
        let s = [e / 255, a / 255, r / 255];
        for (let i in s) s[i] = s[i] <= .03928 ? s[i] / 12.92 : Math.pow((s[i] + .055) / 1.055, 2.4);
        return .2126 * s[0] + .7152 * s[1] + .0722 * s[2] <= .6;
    }
}

