/* =========================================
   1. MENÚ RESPONSIVE Y DESPLEGABLES
========================================= */
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("site-nav");
const dropdowns = document.querySelectorAll(".nav-dropdown");

if (menuToggle && nav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    menuToggle.textContent = isOpen ? "×" : "☰";
  });
}

dropdowns.forEach((dropdown) => {
  const button = dropdown.querySelector(".dropdown-toggle");
  if (!button) return;

  button.addEventListener("click", () => {
    const wasOpen = dropdown.classList.contains("open");

    dropdowns.forEach((item) => {
      item.classList.remove("open");
      const toggle = item.querySelector(".dropdown-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    });

    if (!wasOpen) {
      dropdown.classList.add("open");
      button.setAttribute("aria-expanded", "true");
    }
  });
});

document.querySelectorAll(".nav a").forEach((link) => {
  link.addEventListener("click", () => {
    nav?.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    if (menuToggle) {
      menuToggle.setAttribute("aria-label", "Abrir menú");
      menuToggle.textContent = "☰";
    }
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("open");
      dropdown.querySelector(".dropdown-toggle")?.setAttribute("aria-expanded", "false");
    });
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".nav-dropdown")) {
    dropdowns.forEach((dropdown) => {
      dropdown.classList.remove("open");
      dropdown.querySelector(".dropdown-toggle")?.setAttribute("aria-expanded", "false");
    });
  }
});

/* =========================================
   2. AÑO AUTOMÁTICO EN EL PIE DE PÁGINA
========================================= */
const yearElement = document.getElementById("current-year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

/* =========================================
   3. GALERÍA: ABRIR Y CERRAR FOTOS
========================================= */
const galleryItems = document.querySelectorAll(".gallery-item");
const galleryModal = document.getElementById("gallery-modal");
const galleryModalImage = document.getElementById("gallery-modal-image");
const galleryModalTitle = document.getElementById("gallery-modal-title");
const galleryModalDescription = document.getElementById("gallery-modal-description");
const galleryClose = document.getElementById("gallery-close");
let lastGalleryTrigger = null;

function openGalleryPhoto(item) {
  if (!galleryModal || !galleryModalImage || !galleryModalTitle) return;

  const imagePath = item.dataset.image;
  const imageTitle = item.dataset.title || "Fotografía de la escuela";
  const imageDescription = item.dataset.description || "";

  lastGalleryTrigger = item;
  galleryModalImage.src = imagePath;
  galleryModalImage.alt = item.querySelector("img")?.alt || imageTitle;
  galleryModalTitle.textContent = imageTitle;
  if (galleryModalDescription) galleryModalDescription.textContent = imageDescription;

  galleryModal.hidden = false;
  document.body.style.overflow = "hidden";
  galleryClose?.focus();
}

function closeGalleryPhoto() {
  if (!galleryModal) return;
  galleryModal.hidden = true;
  galleryModalImage?.removeAttribute("src");
  document.body.style.overflow = "";
  lastGalleryTrigger?.focus();
}

galleryItems.forEach((item) => {
  item.addEventListener("click", () => openGalleryPhoto(item));
});

galleryClose?.addEventListener("click", closeGalleryPhoto);

galleryModal?.addEventListener("click", (event) => {
  if (event.target === galleryModal) closeGalleryPhoto();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && galleryModal && !galleryModal.hidden) {
    closeGalleryPhoto();
  }
});

/* =========================================
   4. CABINA FOTOGRÁFICA: RECORTE DE PERSONA
   MediaPipe Selfie Segmentation detecta a la persona
   y compone la silueta sobre una foto de la escuela.
========================================= */
const boothVideo = document.getElementById("booth-video");
const boothCanvas = document.getElementById("booth-canvas");
const boothLiveCanvas = document.getElementById("booth-live-canvas");
const boothPhoto = document.getElementById("booth-photo");
const boothPlaceholder = document.getElementById("booth-placeholder");
const boothStatus = document.getElementById("booth-status");
const boothStart = document.getElementById("booth-start");
const boothCapture = document.getElementById("booth-capture");
const boothRetake = document.getElementById("booth-retake");
const boothDownload = document.getElementById("booth-download");
const boothStop = document.getElementById("booth-stop");
const backgroundButtons = document.querySelectorAll("[data-background]");

let boothStream = null;
let boothPhotoUrl = null;
let selectedBackgroundPath = "img/informatica-aula.jpg";
let selectedBackgroundImage = null;
let selfieSegmentation = null;
let segmentationLoopActive = false;
let segmentationBusy = false;
let segmentationReady = false;

function setBoothStatus(message) {
  if (boothStatus) boothStatus.textContent = message;
}

function loadBoothBackground(path) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${path}. Revisá que la foto exista en la carpeta img.`));
    image.src = path;
  });
}

function drawCover(context, image, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

function composeSegmentedPhoto(results) {
  if (!boothLiveCanvas || !results.segmentationMask || !results.image) return;

  const width = results.image.videoWidth || results.image.width;
  const height = results.image.videoHeight || results.image.height;
  if (!width || !height) return;

  if (boothLiveCanvas.width !== width || boothLiveCanvas.height !== height) {
    boothLiveCanvas.width = width;
    boothLiveCanvas.height = height;
  }

  const context = boothLiveCanvas.getContext("2d", { alpha: true });
  context.save();
  // Efecto espejo para que la vista previa se sienta como un espejo.
  context.translate(width, 0);
  context.scale(-1, 1);
  context.clearRect(0, 0, width, height);

  // Primero dibuja a la persona y conserva únicamente los píxeles de su máscara.
  context.drawImage(results.image, 0, 0, width, height);
  context.globalCompositeOperation = "destination-in";
  context.drawImage(results.segmentationMask, 0, 0, width, height);

  // El fondo escolar queda detrás de la silueta recortada.
  context.globalCompositeOperation = "destination-over";
  if (selectedBackgroundImage) {
    drawCover(context, selectedBackgroundImage, width, height);
  } else {
    // Fondo de emergencia para que la cabina siga funcionando si aún falta la foto escolar.
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#dceafa");
    gradient.addColorStop(1, "#789cc5");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

async function setupSegmentation() {
  if (segmentationReady) return;

  if (typeof window.SelfieSegmentation !== "function") {
    throw new Error(
      "No se cargó el recortador de personas. Revisá la conexión a internet y recargá la página con Ctrl + F5."
    );
  }

  selfieSegmentation = new window.SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`
  });

  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: false
  });

  selfieSegmentation.onResults((results) => {
    try {
      composeSegmentedPhoto(results);
    } catch (error) {
      console.error("Error al dibujar la vista previa:", error);
      setBoothStatus("Hubo un problema al mostrar la foto. Probá recargar la página.");
    }
  });

  // Inicializar el modelo antes de pedir acceso a la cámara.
  if (typeof selfieSegmentation.initialize === "function") {
    await selfieSegmentation.initialize();
  }
  segmentationReady = true;
}

async function runSegmentationLoop() {
  if (!segmentationLoopActive || !boothVideo || !selfieSegmentation || segmentationBusy) return;
  if (boothVideo.readyState >= 2) {
    segmentationBusy = true;
    try {
      await selfieSegmentation.send({ image: boothVideo });
    } catch (error) {
      console.error("Error al recortar la persona:", error);
      setBoothStatus("Se interrumpió el recorte. Probá apagar y volver a activar la cámara.");
    } finally {
      segmentationBusy = false;
    }
  }
  if (segmentationLoopActive) requestAnimationFrame(runSegmentationLoop);
}

async function startBoothCamera() {
  if (!boothStart || !boothVideo || !boothLiveCanvas || !boothCapture || !boothStop) {
    console.error("Faltan elementos HTML de la cabina fotográfica.");
    setBoothStatus("Falta una parte de la cabina en index.html. Reemplazá los archivos por la versión corregida.");
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setBoothStatus("No se puede acceder a la cámara desde esta dirección. Abrí la página con Live Server (localhost) o mediante HTTPS.");
    return;
  }

  boothStart.disabled = true;
  setBoothStatus("Cargando el recorte de persona y el fondo escolar...");

  try {
    try {
      selectedBackgroundImage = await loadBoothBackground(selectedBackgroundPath);
    } catch (backgroundError) {
      selectedBackgroundImage = null;
      console.warn(backgroundError.message);
    }
    await setupSegmentation();
    boothStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });

    boothVideo.srcObject = boothStream;
    boothVideo.hidden = true;
    boothPhoto.hidden = true;
    boothLiveCanvas.hidden = false;
    boothPlaceholder.hidden = true;
    await boothVideo.play();

    boothCapture.disabled = false;
    boothStop.disabled = false;
    boothRetake.hidden = true;
    boothDownload.hidden = true;
    segmentationLoopActive = true;
    requestAnimationFrame(runSegmentationLoop);
    setBoothStatus(selectedBackgroundImage
      ? "¡Listo! La persona se recorta automáticamente. Parate frente a la cámara y esperá un segundo a que se enfoque."
      : "La cámara está lista. Por ahora se usa un fondo azul porque falta la foto escolar en la carpeta img.");
  } catch (error) {
    console.error("No se pudo iniciar la cabina:", error);
    if (boothStream) boothStream.getTracks().forEach((track) => track.stop());
    boothStream = null;
    boothStart.disabled = false;
    let message = error.message || "No pudimos activar la cabina.";
    if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      message = "Falta el permiso de cámara. Permití el acceso desde los permisos del navegador.";
    } else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      message = "No encontramos una cámara disponible en este dispositivo.";
    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      message = "La cámara podría estar siendo utilizada por otra aplicación.";
    }
    setBoothStatus(message);
  }
}

function captureBoothPhoto() {
  if (!boothCanvas || !boothPhoto || !boothDownload || !boothRetake || !boothCapture) {
    setBoothStatus("Falta una parte de la cabina en index.html. Reemplazá los archivos por la versión corregida.");
    return;
  }

  if (!boothStream || !boothLiveCanvas || !boothLiveCanvas.width) {
    setBoothStatus("Esperá un momento hasta que el recorte de la persona esté listo.");
    return;
  }

  boothCanvas.width = boothLiveCanvas.width;
  boothCanvas.height = boothLiveCanvas.height;
  boothCanvas.getContext("2d").drawImage(boothLiveCanvas, 0, 0);
  boothCanvas.toBlob((blob) => {
    if (!blob) {
      setBoothStatus("No pudimos crear la foto. Probá otra vez.");
      return;
    }
    if (boothPhotoUrl) URL.revokeObjectURL(boothPhotoUrl);
    boothPhotoUrl = URL.createObjectURL(blob);
    boothPhoto.src = boothPhotoUrl;
    boothPhoto.hidden = false;
    boothLiveCanvas.hidden = true;
    boothDownload.href = boothPhotoUrl;
    boothDownload.download = "mi-foto-feria.png";
    boothDownload.hidden = false;
    boothRetake.hidden = false;
    boothCapture.disabled = true;
    setBoothStatus("¡Foto lista con el fondo reemplazado! Podés descargarla o volver a sacar otra.");
  }, "image/png");
}

function retakeBoothPhoto() {
  if (!boothStream) {
    startBoothCamera();
    return;
  }
  boothPhoto.hidden = true;
  boothLiveCanvas.hidden = false;
  boothRetake.hidden = true;
  boothDownload.hidden = true;
  boothCapture.disabled = false;
  setBoothStatus("¡Listo! Prepará otra pose.");
}

async function chooseBoothBackground(button) {
  const path = button.dataset.background;
  if (!path) return;

  // Actualiza la selección del botón aunque todavía falte agregar la foto real.
  selectedBackgroundPath = path;
  backgroundButtons.forEach((item) =>
    item.setAttribute("aria-pressed", String(item === button))
  );

  setBoothStatus("Cargando el fondo del salón...");
  try {
    const image = await loadBoothBackground(path);
    selectedBackgroundImage = image;
    // Si ya había una foto tomada, vuelve a la cámara para sacar otra con el fondo nuevo.
    if (boothStream && boothPhoto && !boothPhoto.hidden) {
      boothPhoto.hidden = true;
      boothLiveCanvas.hidden = false;
      boothRetake.hidden = true;
      boothDownload.hidden = true;
      boothCapture.disabled = false;
    }
    setBoothStatus(boothStream
      ? "¡Fondo cambiado! Ya podés sacar la foto con el nuevo fondo."
      : "¡Fondo seleccionado! Activá la cámara para probarlo.");
  } catch (error) {
    selectedBackgroundImage = null;
    setBoothStatus(`Elegiste este fondo, pero falta el archivo ${path}. Guardá la foto en la carpeta img y volvé a probar.`);
    console.warn(error.message);
  }
}

function stopBoothCamera() {
  segmentationLoopActive = false;
  if (boothStream) boothStream.getTracks().forEach((track) => track.stop());
  boothStream = null;
  if (boothVideo) boothVideo.srcObject = null;
  if (boothVideo) boothVideo.hidden = true;
  if (boothLiveCanvas) boothLiveCanvas.hidden = true;
  if (boothPhoto) boothPhoto.hidden = true;
  if (boothPlaceholder) boothPlaceholder.hidden = false;
  if (boothCapture) boothCapture.disabled = true;
  if (boothStop) boothStop.disabled = true;
  if (boothStart) boothStart.disabled = false;
  if (boothRetake) boothRetake.hidden = true;
  if (boothDownload) boothDownload.hidden = true;
  setBoothStatus("Cámara apagada.");
}

boothStart?.addEventListener("click", startBoothCamera);
boothCapture?.addEventListener("click", captureBoothPhoto);
boothRetake?.addEventListener("click", retakeBoothPhoto);
boothStop?.addEventListener("click", stopBoothCamera);
backgroundButtons.forEach((button) => button.addEventListener("click", () => chooseBoothBackground(button)));

// Atajo de teclado: Enter saca la foto mientras la cabina está activa.
// Se evita interceptarlo cuando se está usando un botón u otro control del sitio.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
  if (boothStream && boothCapture && !boothCapture.disabled) {
    event.preventDefault();
    captureBoothPhoto();
  }
});

window.addEventListener("pagehide", stopBoothCamera);

/* =========================================
   5. IMÁGENES QUE TODAVÍA NO EXISTEN
   Muestra un aviso amable en lugar de dejar
   un espacio visual extraño si falta una foto.
========================================= */
document.querySelectorAll(".gallery-item img").forEach((image) => {
  image.addEventListener("error", () => {
    image.alt = "Foto pendiente de agregar: " + (image.alt || "imagen de la escuela");
    image.style.objectFit = "contain";
    image.style.padding = "24px";
    image.style.minHeight = "180px";
    image.style.color = "#153B68";
    image.style.background = "linear-gradient(135deg, #e8f1fb, #d5e5f6)";
  });
});
