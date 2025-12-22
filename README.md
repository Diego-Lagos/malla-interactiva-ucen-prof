# 🗺️ Malla Interactiva

Visualiza, planifica y gestiona tu avance en la malla curricular de tu carrera de una manera interactiva y amigable. Esta herramienta permite marcar ramos, calcular créditos y visualizar dependencias en tiempo real.

> **⚠️ Aviso Importante:** Esta herramienta es **meramente ilustrativa**. Siempre debes usar la información oficial de tu universidad para la toma de ramos.

---

Pruebalo aqui:👉 **[Malla Interactiva UCEN](https://diego-lagos.github.io/malla-interactiva-ucen/)**

## 🚀 Características Principales

* **Gestión de Estados:** Controla cada asignatura con un sistema de clics (Aprobado ✅, Reprobado ❌, En Curso ⚠️).
* **Visualizador de Dependencias:** Al pasar el ratón, se destacan los **Prerrequisitos** (Rojo/Gris) y los ramos que se **desbloquean** (Verde brillante).
* **Contador de Créditos:** Seguimiento de créditos aprobados y planificación de carga académica con un límite configurable de 30 créditos.
* **Persistencia:** Los datos se guardan en el `localStorage` del navegador para no perder el progreso al cerrar la pestaña.
* **Exportación:** Descarga tu estado en formato `.json` o exporta la malla completa como imagen (`.png`/`.jpg`).

---

## 📁 Estructura del Proyecto

El proyecto se organiza de la siguiente manera para facilitar su mantenimiento:

* **`/assets`**: Imágenes y recursos estáticos del HTML.
* **`/css`**: Hojas de estilo y diseño responsivo.
* **`/data`**: Archivos JSON por carrera (datos y colores).
* **`/js`**: Scripts de lógica central y controladores.
* **`/views`**: Fragmentos genéricos como footers y headers.
* **`index.html`**: Punto de entrada de la aplicación.
* **`serviceWorker.js`**: **Archivo crítico** para el funcionamiento y ciclo de vida de la aplicación.
* **`RUN.BAT`**: Script de ejecución rápida para Windows.

---

## 🛠️ Instalación y Ejecución

### 🌐 Versión Web (Recomendado)

Puedes acceder a la aplicación directamente sin instalar nada a través del siguiente enlace:
👉 **[Malla Interactiva UCEN](https://diego-lagos.github.io/malla-interactiva-ucen/)**

### 💻 Ejecución Local

Al ser una aplicación web estática que consume archivos JSON, requiere un servidor web local para funcionar correctamente.

#### Opción Rápida (Windows)

Simplemente haz doble clic en el archivo **`RUN.BAT`**. Este iniciará un servidor local con Python y abrirá la aplicación en tu navegador automáticamente.

#### Opción Manual

1. **Navega al directorio raíz** del proyecto.
2. **Inicia el servidor web** (ejemplo con Python):
```bash
python -m http.server 8000

```


3. **Accede en tu navegador**: `http://localhost:8000`.

---

## 💡 Configuración de Mallas

Cada carrera requiere dos archivos en `/data`: `data_CARR.json` y `colors_CARR.json` (donde `CARR` es la abreviatura, ej: `INF`).

### 1. Datos de Asignaturas (`data_CARR.json`)

Agrupa los ramos por semestre. Ejemplo de un ramo en el quinto semestre (`s5`):

```json
"s5": [
    ["ESTRUCTURA DE DATOS", "CI-3328", 12, 7, "CI", ["CI-3329"], "A"]
]

```

**Orden de los parámetros:**

1. **Nombre**: Nombre completo del ramo.
2. **Sigla**: Identificador único (formato `sigla-número`, sin espacios).
3. **Créditos USM**: Cantidad entera de créditos locales.
4. **Créditos SCT**: Cantidad entera. Si es `0`, se calcula según el crédito local.
5. **Categoría**: Sigla que vincula con el archivo de colores (ej: `CI`).
6. **Prerrequisitos**: Lista de siglas necesarias (deben existir previamente).
7. **Dictación**: `"P"` (Par), `"I"` (Impar), `"A"` (Ambos) o `""` (Desconocido).

### 2. Definición de Colores (`colors_CARR.json`)

Vincula las categorías con un color hexadecimal:

```json
{
  "CI": ["#00838F", "Ciencias de la Informática"],
  "PC": ["#4CAF50", "Plan Común"]
}

```

---

## 🤝 Agradecimientos

Agradecimiento especial a la comunidad estudiantil por la inspiración y el apoyo continuo para mejorar herramientas de planificación académica.
