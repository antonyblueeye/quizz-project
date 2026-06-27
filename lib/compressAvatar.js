const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_STORED_LENGTH = 28_000;
const MAX_EDGE = 160;

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Не удалось прочитать изображение"));
    };
    img.src = url;
  });
}

function drawToCanvas(img, edge) {
  const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен");
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function canvasToJpeg(canvas, quality) {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Resize and compress any reasonable photo to a small JPEG data URL for storage/socket.
 */
export async function compressAvatarFile(file) {
  if (!file?.type?.startsWith("image/")) {
    throw new Error("Выберите изображение (JPG, PNG, WebP)");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("Файл слишком большой (макс. 15 МБ)");
  }

  const img = await loadImageFromFile(file);
  let edge = MAX_EDGE;
  let canvas = drawToCanvas(img, edge);
  let quality = 0.88;
  let dataUrl = canvasToJpeg(canvas, quality);

  while (dataUrl.length > MAX_STORED_LENGTH && quality > 0.4) {
    quality -= 0.07;
    dataUrl = canvasToJpeg(canvas, quality);
  }

  while (dataUrl.length > MAX_STORED_LENGTH && edge > 64) {
    edge -= 24;
    canvas = drawToCanvas(img, edge);
    quality = 0.82;
    dataUrl = canvasToJpeg(canvas, quality);
    while (dataUrl.length > MAX_STORED_LENGTH && quality > 0.4) {
      quality -= 0.07;
      dataUrl = canvasToJpeg(canvas, quality);
    }
  }

  if (dataUrl.length > MAX_STORED_LENGTH) {
    throw new Error("Не удалось сжать фото — попробуйте другое изображение");
  }

  return dataUrl;
}
