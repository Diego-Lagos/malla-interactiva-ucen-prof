# 🗺️ Malla Interactiva

Visualiza, planifica y gestiona tu avance en la malla curricular de tu carrera de una manera interactiva y amigable.

## 📝 Introducción

Este proyecto es una herramienta web sencilla diseñada para estudiantes que desean tener una **visualización interactiva** de su malla curricular. Permite a los usuarios marcar ramos como aprobados (✅ **Verde**), reprobados (❌ **Rojo**) o pendientes/en curso (⚠️ **Amarillo**), y ver instantáneamente cómo esto afecta a sus prerrequisitos y el total de créditos.

Es especialmente útil para:

* Planificar la toma de ramos para futuros semestres.
* Conocer el porcentaje de avance de la carrera (créditos y asignaturas).
* Visualizar fácilmente las dependencias (prerrequisitos y ramos que desbloquea) al pasar el ratón sobre una asignatura.

> **⚠️ Aviso Importante:** Esta herramienta es **meramente ilustrativa**. Siempre debes usar la información oficial de tu universidad para la toma de ramos.## ⚙️ Como instalar y ejecutar

El proyecto está diseñado para funcionar como una aplicación web estática, por lo que su instalación y ejecución son muy sencillas, solo requiere un servidor web local (como Python).

### Requisitos

* Tener instalado [Python 3](https://www.python.org/downloads/).

### Pasos para la ejecución local

1.  **Descargar el Repositorio:** Clona o descarga este repositorio a tu máquina local.
2.  **Abrir la Terminal:** Navega al directorio raíz del proyecto (donde se encuentran `index.html` y `min1.js`).
3.  **Ejecutar el Servidor Web:** Inicia un servidor web local con Python:

    ```bash
    python -m http.server 8000
    ```
4.  **Abrir en el Navegador:** Abre tu navegador web y navega a la siguiente dirección:

    ```
    http://localhost:8000
    ```

    *El archivo `RUN.BAT` incluido en el repositorio automatiza estos pasos para entornos Windows. Simplemente haz doble clic para iniciar el servidor y abrir el navegador (utiliza Microsoft Edge por defecto, aunque puede ser editado).*## 💡 Funcionamiento

### Interacción Básica

La Malla Interactiva permite al usuario gestionar el estado de cada asignatura con un simple clic:

| Estado | Color | Acción | Descripción |
| :--- | :--- | :--- | :--- |
| **Sin Estado** | Color de Categoría | **Clic 1** | Estado inicial, prerrequisito no cumplido. |
| **Aprobado** | ✅ Borde **Verde** | **Clic 2** | Cuenta para el total de créditos y desbloquea prerrequisitos. |
| **Reprobado** | ❌ Borde **Rojo** | **Clic 3** | Asignatura reprobada, no cuenta como aprobada. |
| **En Curso/Pendiente** | ⚠️ Borde **Amarillo** | **Clic 4** | Marca como planeada. Suma a un contador de créditos en curso. |
| **Sin Estado** | Color de Categoría | **Clic 5** | Regresa al estado inicial. |

### Contador de Créditos en Curso (Amarillos)

* La aplicación incluye un contador de créditos seleccionados (los marcados en **Amarillo**).
* Existe un límite estricto de **30 créditos** (valor configurable en `min1.js` con `this.MAX_SELECTED_CREDITS = 30;`).
* Si se supera este límite, el contador se marca como **excedido** (`.limit-exceeded` en CSS) y se muestra una advertencia.

### Visualizador de Dependencias

Al pasar el ratón sobre cualquier asignatura (ramo):

* Los **Prerrequisitos** de esa asignatura se destacarán en **Rojo/Gris** (`.requires-ramo`).
* Las asignaturas que esa asignatura **desbloquea** se destacarán en **Verde/Brillante** (`.opens-ramo`).

### Gestión de Estado

* **Limpiar aprobados:** El botón "Limpiar aprobados" (`#cleanApprovedButton`) resetea el estado de **TODAS** las asignaturas (aprobadas, reprobadas y en curso) y el contador de créditos.
* **Cargar Malla:** El botón "Cargar Malla" (`#loadfile`) permite cargar un archivo de estado o una nueva malla completa (`.json`).
* **Descargar Estado:** El botón "Descargar Estado" (`#downloadStateButton`) guarda tu progreso actual (listas de aprobados, reprobados y en curso) en un archivo JSON para que puedas restaurarlo más tarde.
* **Descargar Imagen:** El botón "Descargar Imagen" (`#downloadImageButton`) exporta la malla completa como un archivo PNG o JPG, incluyendo un pie de página con información de la carrera y tu estado de avance.## ✨ Extras

* **Soporte Multi-Malla:** El proyecto está preparado para cargar distintas mallas curriculares a través de archivos JSON. El menú de navegación superior se rellena dinámicamente (`carreras.json`).
* **Créditos USM/SCT:** Permite alternar la visualización del total de créditos entre el sistema de créditos local (USM en el código) y el Sistema de Créditos Transferibles (SCT).
* **Persistencia:** La aplicación guarda el estado de aprobación/reprobación/pendiente en el almacenamiento local (localStorage) de tu navegador, permitiéndote cerrar y reabrir la aplicación sin perder tu progreso.
* **Diseño Responsivo:** Utiliza Bootstrap 4 y soporta temas claros/oscuros (`prefers-color-scheme: dark`).## 🤝 Agradecimientos

Agradecimiento especial a la comunidad estudiantil por la inspiración y el apoyo continuo para desarrollar y mejorar herramientas útiles para la planificación académica.







