"use strict";

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const smoothstep = (start, end, value) => {
  const progress = clamp((value - start) / (end - start));
  return progress * progress * (3 - 2 * progress);
};

const film = document.querySelector(".film");
const canvas = document.querySelector("#film-canvas");
const context = canvas?.getContext("2d", { alpha: false });
const skipIntro = document.querySelector("#skip-intro");
const content = document.querySelector("#conteudo");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const saveData = navigator.connection?.saveData === true;

if (film && canvas && context) {
  const frameCount = Number(film.dataset.frameCount) || 234;
  const frameStart = Number(film.dataset.frameStart) || 0;
  const frameBlobs = new Array(frameCount);
  const fetchPromises = new Array(frameCount);
  const decodePromises = new Array(frameCount);
  const decodedFrames = new Map();
  const maxDecodedFrames = saveData ? 8 : 20;
  let loadedCount = 0;
  let currentFrame = 0;
  let updateQueued = false;

  const frameSource = (index) =>
    `imagens/intro-frames/frame-${String(index + frameStart).padStart(3, "0")}.webp`;

  const updateLoadProgress = () => {
    const progress = `${Math.round((loadedCount / frameCount) * 100)}%`;
    film.style.setProperty("--load-progress", progress);

    const bufferTarget = saveData || reducedMotion.matches ? 1 : Math.min(16, frameCount);

    if (loadedCount >= bufferTarget) {
      film.classList.add("has-buffer");
    }
  };

  const fetchFrame = (index) => {
    const safeIndex = clamp(Math.round(index), 0, frameCount - 1);

    if (frameBlobs[safeIndex]) {
      return Promise.resolve(frameBlobs[safeIndex]);
    }

    if (fetchPromises[safeIndex]) {
      return fetchPromises[safeIndex];
    }

    fetchPromises[safeIndex] = fetch(frameSource(safeIndex), {
      cache: "force-cache"
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar o frame ${safeIndex}`);
        }

        return response.blob();
      })
      .then((blob) => {
        frameBlobs[safeIndex] = blob;
        loadedCount += 1;
        updateLoadProgress();
        return blob;
      });

    return fetchPromises[safeIndex];
  };

  const touchDecodedFrame = (index) => {
    const resource = decodedFrames.get(index);

    if (resource) {
      decodedFrames.delete(index);
      decodedFrames.set(index, resource);
    }

    return resource;
  };

  const trimDecodedFrames = () => {
    while (decodedFrames.size > maxDecodedFrames) {
      let removed = false;

      for (const [index, resource] of decodedFrames) {
        if (Math.abs(index - currentFrame) <= 3) {
          continue;
        }

        resource.release?.();
        decodedFrames.delete(index);
        removed = true;
        break;
      }

      if (!removed) {
        break;
      }
    }
  };

  const decodeFrame = (index) => {
    const safeIndex = clamp(Math.round(index), 0, frameCount - 1);
    const cached = touchDecodedFrame(safeIndex);

    if (cached) {
      return Promise.resolve(cached);
    }

    if (decodePromises[safeIndex]) {
      return decodePromises[safeIndex];
    }

    decodePromises[safeIndex] = fetchFrame(safeIndex)
      .then(async (blob) => {
        let resource;

        if ("createImageBitmap" in window) {
          const bitmap = await createImageBitmap(blob);
          resource = {
            drawable: bitmap,
            width: bitmap.width,
            height: bitmap.height,
            release: () => bitmap.close()
          };
        } else {
          const objectUrl = URL.createObjectURL(blob);
          const image = new Image();
          image.decoding = "async";
          image.src = objectUrl;

          await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = reject;
          });

          resource = {
            drawable: image,
            width: image.naturalWidth,
            height: image.naturalHeight,
            release: () => URL.revokeObjectURL(objectUrl)
          };
        }

        decodedFrames.set(safeIndex, resource);
        trimDecodedFrames();
        return resource;
      })
      .finally(() => {
        decodePromises[safeIndex] = undefined;
      });

    return decodePromises[safeIndex];
  };

  const resizeCanvas = () => {
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const desiredWidth = viewportWidth * pixelRatio;
    const desiredHeight = viewportHeight * pixelRatio;
    const scale = Math.min(1, 1920 / desiredWidth, 1080 / desiredHeight);

    canvas.width = Math.round(desiredWidth * scale);
    canvas.height = Math.round(desiredHeight * scale);
    drawFrame(currentFrame);
  };

  const nearestLoadedFrame = (target) => {
    if (decodedFrames.has(target)) {
      return target;
    }

    for (let distance = 1; distance < frameCount; distance += 1) {
      const before = target - distance;
      const after = target + distance;

      if (before >= 0 && decodedFrames.has(before)) {
        return before;
      }

      if (after < frameCount && decodedFrames.has(after)) {
        return after;
      }
    }

    return -1;
  };

  function drawFrame(index) {
    const availableIndex = nearestLoadedFrame(index);
    const resource = touchDecodedFrame(availableIndex);

    if (!resource) {
      return;
    }

    const canvasRatio = canvas.width / canvas.height;
    const imageRatio = resource.width / resource.height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = resource.width;
    let sourceHeight = resource.height;

    if (imageRatio > canvasRatio) {
      sourceWidth = resource.height * canvasRatio;
      sourceX = (resource.width - sourceWidth) / 2;
    } else {
      sourceHeight = resource.width / canvasRatio;
      sourceY = (resource.height - sourceHeight) / 2;
    }

    context.drawImage(
      resource.drawable,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      canvas.width,
      canvas.height
    );
  }

  const prioritizeFrameWindow = (target) => {
    const radius = saveData ? 2 : 3;

    for (let distance = 0; distance <= radius; distance += 1) {
      [target + distance, target - distance].forEach((index) => {
        if (index >= 0 && index < frameCount) {
          decodeFrame(index)
            .then(() => {
              if (index === currentFrame) {
                drawFrame(currentFrame);
              }
            })
            .catch(() => {});
        }
      });
    }
  };

  const updateFilm = () => {
    updateQueued = false;

    if (reducedMotion.matches) {
      return;
    }

    const rect = film.getBoundingClientRect();
    const scrollableDistance = Math.max(1, film.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollableDistance);
    const targetFrame = Math.round(progress * (frameCount - 1));

    currentFrame = targetFrame;
    drawFrame(currentFrame);
    prioritizeFrameWindow(currentFrame);

    const introOpacity = 1 - smoothstep(0.1, 0.36, progress);
    const cueOpacity = 1 - smoothstep(0.02, 0.18, progress);
    const revealOpacity = smoothstep(0.84, 0.975, progress);
    const canvasOpacity = 1 - smoothstep(0.94, 1, progress);
    const chromeOpacity = 1 - smoothstep(0.72, 0.91, progress);

    film.style.setProperty("--film-intro-opacity", introOpacity.toFixed(3));
    film.style.setProperty("--film-cue-opacity", cueOpacity.toFixed(3));
    film.style.setProperty("--film-reveal-opacity", revealOpacity.toFixed(3));
    film.style.setProperty("--film-canvas-opacity", canvasOpacity.toFixed(3));
    film.style.setProperty("--film-chrome-opacity", chromeOpacity.toFixed(3));
  };

  const requestFilmUpdate = () => {
    if (!updateQueued) {
      updateQueued = true;
      requestAnimationFrame(updateFilm);
    }
  };

  const preloadSequence = async () => {
    if (saveData || reducedMotion.matches) {
      return;
    }

    const batchSize = 10;

    for (let start = 1; start < frameCount; start += batchSize) {
      const batch = [];

      for (let index = start; index < Math.min(frameCount, start + batchSize); index += 1) {
        batch.push(fetchFrame(index).catch(() => null));
      }

      await Promise.all(batch);
      await new Promise((resolve) => {
        if ("requestIdleCallback" in window) {
          window.requestIdleCallback(resolve, { timeout: 500 });
        } else {
          window.setTimeout(resolve, 16);
        }
      });
    }
  };

  decodeFrame(0)
    .then(() => {
      resizeCanvas();
      drawFrame(0);
      film.classList.add("is-ready");
      requestFilmUpdate();
      preloadSequence();
    })
    .catch(() => {
      film.classList.add("has-buffer");
    });

  window.addEventListener("scroll", requestFilmUpdate, { passive: true });
  window.addEventListener("resize", () => {
    resizeCanvas();
    requestFilmUpdate();
  });

  reducedMotion.addEventListener?.("change", requestFilmUpdate);

  window.addEventListener("pagehide", () => {
    decodedFrames.forEach((resource) => resource.release?.());
    decodedFrames.clear();
  });

  skipIntro?.addEventListener("click", () => {
    content?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
  });
}

const readingProgress = document.querySelector(".reading-progress span");

const updateReadingProgress = () => {
  if (!readingProgress) {
    return;
  }

  const scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  const progress = clamp(window.scrollY / scrollRange);
  readingProgress.style.transform = `scaleX(${progress})`;
};

window.addEventListener("scroll", updateReadingProgress, { passive: true });
window.addEventListener("resize", updateReadingProgress);
updateReadingProgress();

const menuToggle = document.querySelector(".menu-toggle");
const mainMenu = document.querySelector(".main-menu");
const menuLabel = menuToggle?.querySelector(".sr-only");

const setMenuState = (isOpen) => {
  menuToggle?.setAttribute("aria-expanded", String(isOpen));
  mainMenu?.classList.toggle("is-open", isOpen);

  if (menuLabel) {
    menuLabel.textContent = isOpen ? "Fechar menu" : "Abrir menu";
  }
};

const closeMenu = () => {
  setMenuState(false);
};

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  setMenuState(willOpen);
});

mainMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", closeMenu);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenu();
  }
});

const revealItems = document.querySelectorAll("[data-reveal]");

if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.08
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
}

const galleryItems = [...document.querySelectorAll("[data-gallery-index]")];
const galleryDialog = document.querySelector("#gallery-dialog");
const lightboxImage = galleryDialog?.querySelector("figure img");
const lightboxCaption = galleryDialog?.querySelector("figcaption");
const lightboxClose = galleryDialog?.querySelector(".lightbox__close");
const lightboxPrevious = galleryDialog?.querySelector(".lightbox__prev");
const lightboxNext = galleryDialog?.querySelector(".lightbox__next");
let activeGalleryIndex = 0;

const showGalleryImage = (index) => {
  if (!lightboxImage || !lightboxCaption || galleryItems.length === 0) {
    return;
  }

  activeGalleryIndex = (index + galleryItems.length) % galleryItems.length;
  const sourceImage = galleryItems[activeGalleryIndex].querySelector("img");
  const title = galleryItems[activeGalleryIndex].querySelector("span")?.textContent || "";

  lightboxImage.src = sourceImage?.currentSrc || sourceImage?.src || "";
  lightboxImage.alt = sourceImage?.alt || "";
  lightboxCaption.textContent = title;
};

galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => {
    if (!galleryDialog) {
      return;
    }

    showGalleryImage(index);
    galleryDialog.showModal();
    lightboxClose?.focus();
  });
});

lightboxClose?.addEventListener("click", () => galleryDialog?.close());
lightboxPrevious?.addEventListener("click", () => showGalleryImage(activeGalleryIndex - 1));
lightboxNext?.addEventListener("click", () => showGalleryImage(activeGalleryIndex + 1));

galleryDialog?.addEventListener("click", (event) => {
  if (event.target === galleryDialog) {
    galleryDialog.close();
  }
});

galleryDialog?.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") {
    showGalleryImage(activeGalleryIndex - 1);
  }

  if (event.key === "ArrowRight") {
    showGalleryImage(activeGalleryIndex + 1);
  }
});
