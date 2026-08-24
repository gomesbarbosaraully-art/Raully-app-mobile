/**
 * Image and media compression utilities to prevent mobile browser OOM crashes
 * and ensure all media fits comfortably within Firestore document limits.
 */

export async function compressImage(
  file: File | Blob,
  maxWidth = 1080,
  maxHeight = 1080,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check file size safety
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (!width || !height) {
        width = 800;
        height = 800;
      }

      // Calculate scaled dimensions keeping aspect ratio
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Smooth downscaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw background and image
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        // Free canvas memory
        canvas.width = 1;
        canvas.height = 1;
        resolve(compressedBase64);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Falha ao carregar a imagem para processamento'));
    };

    img.src = objectUrl;
  });
}

export async function compressAvatar(file: File | Blob): Promise<string> {
  return compressImage(file, 256, 256, 0.8);
}

export async function processVideoFile(file: File): Promise<{
  url: string;
  isBase64: boolean;
  sizeMb: number;
}> {
  const sizeMb = file.size / (1024 * 1024);

  // If video is small enough (< 800KB), it can be converted to data URL
  if (sizeMb < 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          url: reader.result as string,
          isBase64: true,
          sizeMb,
        });
      };
      reader.onerror = () => reject(new Error('Erro ao ler vídeo'));
      reader.readAsDataURL(file);
    });
  }

  // For larger video preview without crashing memory, create object URL
  const objectUrl = URL.createObjectURL(file);
  return {
    url: objectUrl,
    isBase64: false,
    sizeMb,
  };
}
