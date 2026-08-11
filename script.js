(() => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const editor = document.getElementById("editor");
  const previewImg = document.getElementById("previewImg");
  const originalMeta = document.getElementById("originalMeta");
  const outputMeta = document.getElementById("outputMeta");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const lockRatio = document.getElementById("lockRatio");
  const fitModeRadios = document.querySelectorAll('input[name="fitMode"]');
  const fillColorRow = document.getElementById("fillColorRow");
  const fillColorInput = document.getElementById("fillColorInput");
  const formatSelect = document.getElementById("formatSelect");
  const qualityRow = document.getElementById("qualityRow");
  const qualityInput = document.getElementById("qualityInput");
  const qualityValue = document.getElementById("qualityValue");
  const resetBtn = document.getElementById("resetBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const workCanvas = document.getElementById("workCanvas");
  const quickButtons = document.querySelectorAll(".quick-buttons button");

  let originalImage = null;
  let originalName = "image";
  let aspectRatio = 1;

  function resetEditor() {
    originalImage = null;
    fileInput.value = "";
    editor.hidden = true;
    dropZone.hidden = false;
    previewImg.src = "";
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) return;

    originalName = file.name.replace(/\.[^.]+$/, "") || "image";
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        originalImage = img;
        aspectRatio = img.naturalWidth / img.naturalHeight;

        previewImg.src = e.target.result;
        widthInput.value = img.naturalWidth;
        heightInput.value = img.naturalHeight;
        originalMeta.textContent = `원본: ${img.naturalWidth} × ${img.naturalHeight}px`;
        updateOutputMeta();

        dropZone.hidden = true;
        editor.hidden = false;
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function updateOutputMeta() {
    const w = parseInt(widthInput.value, 10) || 0;
    const h = parseInt(heightInput.value, 10) || 0;
    outputMeta.textContent = `결과: ${w} × ${h}px`;
    downloadBtn.disabled = !(w > 0 && h > 0);
  }

  // --- upload interactions ---
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => handleFile(e.target.files[0]));

  ["dragenter", "dragover"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    })
  );
  dropZone.addEventListener("drop", (e) => {
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  // --- size inputs ---
  widthInput.addEventListener("input", () => {
    if (lockRatio.checked && aspectRatio) {
      const w = parseInt(widthInput.value, 10);
      if (w > 0) heightInput.value = Math.round(w / aspectRatio);
    }
    updateOutputMeta();
  });

  heightInput.addEventListener("input", () => {
    if (lockRatio.checked && aspectRatio) {
      const h = parseInt(heightInput.value, 10);
      if (h > 0) widthInput.value = Math.round(h * aspectRatio);
    }
    updateOutputMeta();
  });

  function getFitMode() {
    return Array.from(fitModeRadios).find((r) => r.checked)?.value || "stretch";
  }

  function syncFitModeAvailability() {
    fitModeRadios.forEach((r) => (r.disabled = lockRatio.checked));
    fillColorRow.hidden = lockRatio.checked || getFitMode() !== "pad";
  }
  lockRatio.addEventListener("change", syncFitModeAvailability);
  fitModeRadios.forEach((r) => r.addEventListener("change", syncFitModeAvailability));
  syncFitModeAvailability();

  quickButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      widthInput.value = btn.dataset.w;
      heightInput.value = btn.dataset.h;
      updateOutputMeta();
    });
  });

  function syncQualityVisibility() {
    qualityRow.style.display = formatSelect.value === "image/png" ? "none" : "";
  }
  formatSelect.addEventListener("change", syncQualityVisibility);
  syncQualityVisibility();

  qualityInput.addEventListener("input", () => {
    qualityValue.textContent = qualityInput.value;
  });

  // --- reset / download ---
  resetBtn.addEventListener("click", resetEditor);

  downloadBtn.addEventListener("click", () => {
    if (!originalImage) return;
    const w = parseInt(widthInput.value, 10);
    const h = parseInt(heightInput.value, 10);
    if (!(w > 0 && h > 0)) return;

    workCanvas.width = w;
    workCanvas.height = h;
    const ctx = workCanvas.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const mode = lockRatio.checked ? "stretch" : getFitMode();

    if (mode === "crop") {
      const scale = Math.max(w / originalImage.naturalWidth, h / originalImage.naturalHeight);
      const dw = originalImage.naturalWidth * scale;
      const dh = originalImage.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(originalImage, dx, dy, dw, dh);
    } else if (mode === "pad") {
      ctx.fillStyle = fillColorInput.value;
      ctx.fillRect(0, 0, w, h);

      const scale = Math.min(w / originalImage.naturalWidth, h / originalImage.naturalHeight);
      const dw = originalImage.naturalWidth * scale;
      const dh = originalImage.naturalHeight * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(originalImage, dx, dy, dw, dh);
    } else {
      ctx.drawImage(originalImage, 0, 0, w, h);
    }

    const mime = formatSelect.value;
    const quality = mime === "image/png" ? undefined : qualityInput.value / 100;
    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";

    workCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${originalName}_${w}x${h}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      mime,
      quality
    );
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
})();
