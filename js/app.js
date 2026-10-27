/* LABORATORIO PWA: complete las funciones TODO.
  Se entregan interfaz, eventos, validaciones básicas y Service Worker.
  No requiere Firebase ni backend. */
let fotoActual = null;
let ubicacionActual = null;

let facingModeActual = "environment"; // "environment" (trasera) o "user" (frontal)

const $ = (selector) => document.querySelector(selector);
function mensaje(texto) {
  $("#mensaje").textContent = texto;
}
function mostrarConexion() {
  const online = navigator.onLine;
  $("#estadoConexion").textContent = online ? "● En línea" : "● Sin conexión";
}
window.addEventListener("online", mostrarConexion);
window.addEventListener("offline", mostrarConexion);
mostrarConexion();
if ("serviceWorker" in navigator)
  window.addEventListener("load", () =>
    navigator.serviceWorker.register("./sw.js").catch(console.error),
  );



$("#btnFoto").addEventListener("click", tomarFoto);
$("#btnUbicacion").addEventListener("click", obtenerUbicacion);
$("#formVisita").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await guardarVisita();
  } catch (error) {
    mensaje(error.message);
  }
});
$("#listaVisitas").addEventListener("click", async (e) => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;
  const id = Number(boton.dataset.id);
  try {
    if (boton.dataset.accion === "eliminar") await eliminarVisita(id);
    if (boton.dataset.accion === "compartir") await compartirVisita(id);
  } catch (error) {
    mensaje(error.message);
  }
});



// FUNCIONES POR DESARROLLAR
// Helper para escapar HTML y prevenir XSS al renderizar texto del usuario
function escaparHTML(cadena) {
  if (!cadena) return "";
  return cadena
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 1. Tomar fotografía / Abrir selector de archivos
// Variable para almacenar el stream activo de la cámara
let streamCamara = null;

// 1. Activar la cámara del dispositivo y tomar la fotografía
async function tomarFoto() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    mensaje("getUserMedia no es compatible. Usando selector de archivo por defecto.");
    $("#inputFoto").click();
    return;
  }

  try {
    // Solicitar la cámara según el facingMode actual
    streamCamara = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: facingModeActual } }, // O ideal: facingModeActual
      audio: false
    });

    mostrarModalCamara(streamCamara);
  } catch (error) {
    console.warn("Error accediendo con exact facingMode, reintentando con ideal:", error);
    try {
      // Fallback si el dispositivo no soporta exact
      streamCamara = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingModeActual },
        audio: false
      });
      mostrarModalCamara(streamCamara);
    } catch (errFallback) {
      console.warn("No se pudo acceder a la cámara:", errFallback);
      mensaje("No se pudo abrir la cámara directa. Abriendo selector de archivos.");
      $("#inputFoto").click();
    }
  }
}

// Función auxiliar para desplegar la vista previa de la cámara en vivo
function mostrarModalCamara(stream) {
  let modal = document.getElementById("modalCamara");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "modalCamara";
    modal.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85); display: flex; flex-direction: column;
      align-items: center; justify-content: center; z-index: 1000; padding: 1rem;
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="position: relative; max-width: 500px; width: 100%; text-align: center;">
      <video id="videoCamara" autoplay playsinline style="width: 100%; max-height: 60vh; border-radius: 8px; background: #000;"></video>
      <div style="margin-top: 1rem; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
        <button type="button" id="btnCapturarFotograma" class="btn btn-primary">Capturar Foto</button>
        <button type="button" id="btnCambiarCamara" class="btn btn-outline" style="color: #fff; border-color: #fff;">🔄 Cambiar Cámara</button>
        <button type="button" id="btnCancelarCamara" class="btn btn-outline" style="color: #fff; border-color: #fff;">Cancelar</button>
      </div>
    </div>
  `;

  const video = modal.querySelector("#videoCamara");
  video.srcObject = stream;

  // Botón para capturar imagen
  modal.querySelector("#btnCapturarFotograma").addEventListener("click", () => {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const contexto = canvas.getContext("2d");
    contexto.drawImage(video, 0, 0, canvas.width, canvas.height);

    fotoActual = canvas.toDataURL("image/jpeg");

    const preview = $("#previewFoto");
    preview.src = fotoActual;
    preview.hidden = false;
    $("#estadoFoto").textContent = "Fotografía: capturada ✓";

    cerrarModalCamara();
  });

  // Botón para alternar la cámara (Trasera <-> Frontal)
  modal.querySelector("#btnCambiarCamara").addEventListener("click", async () => {
    // Detener el stream actual antes de cambiar
    if (streamCamara) {
      streamCamara.getTracks().forEach((track) => track.stop());
      streamCamara = null;
    }

    // Alternar entre modo "environment" y "user"
    facingModeActual = (facingModeActual === "environment") ? "user" : "environment";

    // Reabrir la cámara con el nuevo modo
    await tomarFoto();
  });

  // Botón para cancelar la captura
  modal.querySelector("#btnCancelarCamara").addEventListener("click", cerrarModalCamara);
}

// Detener el stream de la cámara y remover el modal
function cerrarModalCamara() {
  if (streamCamara) {
    streamCamara.getTracks().forEach((track) => track.stop());
    streamCamara = null;
  }
  const modal = document.getElementById("modalCamara");
  if (modal) {
    modal.remove();
  }
}

// 2. Obtener geolocalización
function obtenerUbicacion() {
  if (!navigator.geolocation) {
    mensaje("La geolocalización no es compatible con este navegador.");
    return;
  }

  $("#estadoUbicacion").textContent = "Ubicación: obteniendo...";

  navigator.geolocation.getCurrentPosition(
    (posicion) => {
      const { latitude, longitude } = posicion.coords;
      ubicacionActual = { latitud: latitude, longitud: longitude };

      $("#coordenadas").textContent = `Latitud: ${latitude.toFixed(5)} | Longitud: ${longitude.toFixed(5)}`;
      $("#estadoUbicacion").textContent = "Ubicación: obtenida ✓";

      const enlaceMapa = $("#enlaceMapa");
      enlaceMapa.href = `https://maps.google.com/?q=${latitude},${longitude}`;
      enlaceMapa.hidden = false;
    },
    (error) => {
      $("#estadoUbicacion").textContent = "Ubicación: error al obtener";
      mensaje("Error al obtener ubicación: " + error.message);
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// 3. Guardar la visita en la base de datos
async function guardarVisita() {
  const descripcionInput = $("#descripcion");
  const descripcion = descripcionInput ? descripcionInput.value.trim() : "";

  if (!descripcion) {
    mensaje("Por favor, ingresa una descripción para la visita.");
    return;
  }

  if (!fotoActual) {
    mensaje("Debes adjuntar o tomar una fotografía antes de guardar.");
    return;
  }

  if (!ubicacionActual) {
    mensaje("Debes obtener la ubicación antes de guardar.");
    return;
  }

  const nuevaVisita = {
    descripcion,
    fotografia: fotoActual,
    coordenadas: ubicacionActual,
    fecha: new Date().toISOString()
  };

  try {
    await guardarEnDB(nuevaVisita);

    // Limpiar formulario y estado actual
    if ($("#formVisita")) $("#formVisita").reset();
    fotoActual = null;
    ubicacionActual = null;

    $("#previewFoto").hidden = true;
    $("#previewFoto").removeAttribute("src");
    $("#enlaceMapa").hidden = true;
    $("#estadoFoto").textContent = "Fotografía: pendiente";
    $("#estadoUbicacion").textContent = "Ubicación: pendiente";
    $("#coordenadas").textContent = "Latitud: — | Longitud: —";

    mensaje("Visita guardada correctamente.");
    await cargarVisitas();
  } catch (error) {
    mensaje("Error al guardar la visita: " + error.message);
  }
}

// 4. Cargar y renderizar las visitas guardadas
async function cargarVisitas() {
  try {
    const visitas = await obtenerVisitasDB();
    const contenedorLista = $("#listaVisitas");
    const contador = $("#contador");

    if (contador) {
      contador.textContent = `${visitas.length} ${visitas.length === 1 ? 'registro' : 'registros'}`;
    }

    if (!visitas || visitas.length === 0) {
      contenedorLista.innerHTML = `
        <div class="empty">
          <span>▤</span>
          <h3>Sin registros todavía</h3>
          <p>Las visitas que guardes aparecerán aquí.</p>
        </div>
      `;
      return;
    }

    contenedorLista.innerHTML = visitas
      .map((visita) => {
        const fechaFormateada = new Date(visita.fecha).toLocaleString();
        const mapaUrl = `https://maps.google.com/?q=${visita.coordenadas.latitud},${visita.coordenadas.longitud}`;

        return `
          <article class="card">
            ${visita.fotografia ? `<img src="${visita.fotografia}" alt="Fotografía de la visita" class="card-img">` : ''}
            <div class="card-body">
              <p class="card-text">${escaparHTML(visita.descripcion)}</p>
              <p class="card-meta">📅 ${fechaFormateada}</p>
              <p class="card-meta">
                📍 <a href="${mapaUrl}" target="_blank" rel="noopener noreferrer">Ver mapa (${visita.coordenadas.latitud.toFixed(4)}, ${visita.coordenadas.longitud.toFixed(4)})</a>
              </p>
              <div class="card-actions">
                <button class="btn btn-outline" data-accion="compartir" data-id="${visita.id}">Compartir</button>
                <button class="btn btn-danger" data-accion="eliminar" data-id="${visita.id}">Eliminar</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    mensaje("Error al cargar visitas: " + error.message);
  }
}

// 5. Eliminar visita por ID
async function eliminarVisita(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar esta visita?")) {
    return;
  }

  try {
    await eliminarDeDB(id);
    mensaje("Visita eliminada correctamente.");
    await cargarVisitas();
  } catch (error) {
    mensaje("Error al eliminar la visita: " + error.message);
  }
}

// 6. Compartir visita mediante la API Web Share
async function compartirVisita(id) {
  try {
    const visitas = await obtenerVisitasDB();
    const visita = visitas.find((item) => String(item.id) === String(id));

    if (!visita) {
      throw new Error("No se encontró la visita especificada.");
    }

    const mapaUrl = `https://maps.google.com/?q=${visita.coordenadas.latitud},${visita.coordenadas.longitud}`;
    const datosCompartir = {
      title: "Registro de Visita",
      text: `${visita.descripcion}\nUbicación: ${mapaUrl}`,
      url: mapaUrl
    };

    // Intenta adjuntar la imagen si la API canShare con archivos es soportada
    if (visita.fotografia && navigator.canShare) {
      try {
        const respuesta = await fetch(visita.fotografia);
        const blob = await respuesta.blob();
        const archivo = new File([blob], "visita.jpg", { type: blob.type });

        if (navigator.canShare({ files: [archivo] })) {
          datosCompartir.files = [archivo];
        }
      } catch (errArchivo) {
        console.warn("No se pudo procesar la imagen para compartir:", errArchivo);
      }
    }

    if (navigator.share) {
      await navigator.share(datosCompartir);
    } else {
      // Fallback si la API Web Share no está disponible
      await navigator.clipboard.writeText(`${datosCompartir.text}`);
      mensaje("El enlace y detalles de la visita se copiaron al portapapeles.");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      mensaje("Error al compartir: " + error.message);
    }
  }
}

// ==========================================
// EVENTOS Y CARGA INICIAL
// ==========================================

// Cargar visitas al abrir la aplicación
document.addEventListener("DOMContentLoaded", () => {
  cargarVisitas().catch((error) => mensaje(error.message));
});