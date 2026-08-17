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
const topbar = document.querySelector(".topbar");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const saveData = navigator.connection?.saveData === true;
const introScrollKeys = new Set(["ArrowDown", "PageDown", "End", " "]);

const scrollToMainMenu = () => {
  const target = topbar || content;

  target?.scrollIntoView({
    behavior: reducedMotion.matches ? "auto" : "smooth",
    block: "start",
    inline: "nearest"
  });
};

let detachIntroAutoplay = () => {};
let cancelIntroAutoplay = () => {};

const heroSealVideo = document.querySelector(".landing-hero__seal-video");

if (heroSealVideo) {
  const restartDelay = Number(heroSealVideo.dataset.restartDelay) || 2000;
  let restartTimer;

  const clearRestartTimer = () => {
    window.clearTimeout(restartTimer);
    restartTimer = undefined;
  };

  const playHeroSealVideo = () => {
    if (reducedMotion.matches || document.hidden) {
      return;
    }

    heroSealVideo.play().catch(() => {});
  };

  const scheduleHeroSealRestart = () => {
    clearRestartTimer();

    if (reducedMotion.matches || document.hidden) {
      return;
    }

    restartTimer = window.setTimeout(() => {
      heroSealVideo.currentTime = 0;
      playHeroSealVideo();
    }, restartDelay);
  };

  heroSealVideo.addEventListener("ended", scheduleHeroSealRestart);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearRestartTimer();
      heroSealVideo.pause();
      return;
    }

    if (heroSealVideo.ended) {
      scheduleHeroSealRestart();
    } else {
      playHeroSealVideo();
    }
  });

  reducedMotion.addEventListener?.("change", () => {
    clearRestartTimer();

    if (reducedMotion.matches) {
      heroSealVideo.pause();
      heroSealVideo.currentTime = 0;
      return;
    }

    heroSealVideo.currentTime = 0;
    playHeroSealVideo();
  });

  playHeroSealVideo();
}

if (film && canvas && context) {
  const frameCount = Number(film.dataset.frameCount) || 234;
  const frameStart = Number(film.dataset.frameStart) || 0;
  const frameRate = Number(film.dataset.frameRate) || 24;
  const frameDuration = 1000 / frameRate;
  const playbackDuration = frameCount * frameDuration;
  const autoplayLookahead = Math.min(frameCount - 1, saveData ? 5 : 12);
  const frameBlobs = new Array(frameCount);
  const fetchPromises = new Array(frameCount);
  const decodePromises = new Array(frameCount);
  const decodedFrames = new Map();
  const maxDecodedFrames = saveData ? 8 : 20;
  let loadedCount = 0;
  let currentFrame = 0;
  let updateQueued = false;
  let isIntroAutoplaying = false;
  let autoplayAnimationFrame = 0;
  let autoplayRunID = 0;
  let resolveAutoplay;

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

  const renderFilm = (progress, targetFrame) => {
    const nextFrame = clamp(Math.round(targetFrame), 0, frameCount - 1);
    const frameChanged = nextFrame !== currentFrame;

    currentFrame = nextFrame;
    drawFrame(currentFrame);

    if (frameChanged) {
      prioritizeFrameWindow(currentFrame);
    }

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

  const updateFilm = () => {
    updateQueued = false;

    if (reducedMotion.matches || isIntroAutoplaying) {
      return;
    }

    const rect = film.getBoundingClientRect();
    const scrollableDistance = Math.max(1, film.offsetHeight - window.innerHeight);
    const progress = clamp(-rect.top / scrollableDistance);
    const targetFrame = Math.round(progress * (frameCount - 1));

    renderFilm(progress, targetFrame);
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

  const preloadAutoplayWindow = (startFrame) => {
    const lastFrame = Math.min(frameCount - 1, startFrame + autoplayLookahead);
    const requests = [];

    for (let index = startFrame; index <= lastFrame; index += 1) {
      requests.push(decodeFrame(index).catch(() => null));
    }

    return Promise.all(requests);
  };

  const initialAutoplayBuffer = preloadAutoplayWindow(0).then(() => {
    film.classList.add("has-buffer");
  });

  const stopIntroAutoplay = () => {
    autoplayRunID += 1;
    cancelAnimationFrame(autoplayAnimationFrame);
    autoplayAnimationFrame = 0;
    isIntroAutoplaying = false;
    document.documentElement.classList.remove("is-intro-autoplaying");

    const settleAutoplay = resolveAutoplay;
    resolveAutoplay = undefined;
    settleAutoplay?.();
    requestFilmUpdate();
  };

  cancelIntroAutoplay = stopIntroAutoplay;

  const playIntroAtFrameRate = async () => {
    const runID = autoplayRunID + 1;
    autoplayRunID = runID;
    isIntroAutoplaying = true;
    document.documentElement.classList.add("is-intro-autoplaying");

    await Promise.all([initialAutoplayBuffer, preloadAutoplayWindow(0)]);

    if (runID !== autoplayRunID || reducedMotion.matches) {
      if (runID === autoplayRunID) {
        stopIntroAutoplay();
      }

      return;
    }

    renderFilm(0, 0);

    const startScrollY = window.scrollY;
    const filmStartScrollY = startScrollY + film.getBoundingClientRect().top;
    const targetScrollY = filmStartScrollY + Math.max(0, film.offsetHeight - window.innerHeight);
    const scrollDistance = targetScrollY - startScrollY;

    return new Promise((resolve) => {
      let playbackStart;
      let previousFrame = -1;
      resolveAutoplay = resolve;

      const playFrame = (timestamp) => {
        if (runID !== autoplayRunID) {
          return;
        }

        playbackStart ??= timestamp;

        const elapsed = timestamp - playbackStart;
        const progress = clamp(elapsed / playbackDuration);
        const targetFrame = Math.min(frameCount - 1, Math.floor(elapsed / frameDuration));

        if (targetFrame !== previousFrame) {
          previousFrame = targetFrame;
          preloadAutoplayWindow(targetFrame);
        }

        window.scrollTo({
          top: startScrollY + scrollDistance * progress,
          behavior: "auto"
        });
        renderFilm(progress, targetFrame);

        if (progress < 1) {
          autoplayAnimationFrame = requestAnimationFrame(playFrame);
          return;
        }

        window.scrollTo({ top: targetScrollY, behavior: "auto" });
        renderFilm(1, frameCount - 1);
        autoplayAnimationFrame = 0;
        isIntroAutoplaying = false;
        document.documentElement.classList.remove("is-intro-autoplaying");
        resolveAutoplay = undefined;
        resolve();
        requestFilmUpdate();
      };

      autoplayAnimationFrame = requestAnimationFrame(playFrame);
    });
  };

  const setupIntroAutoplay = () => {
    if (!content || reducedMotion.matches) {
      return () => {};
    }

    let phase = "armed";
    let touchStartY = null;

    const isAtIntroStart = () => {
      const rect = film.getBoundingClientRect();

      return window.scrollY <= 4 && rect.top >= -4 && rect.bottom > window.innerHeight;
    };

    const preventScroll = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    const cleanup = () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("keydown", handleKeydown);
      window.removeEventListener("scroll", handleScroll);
    };

    const begin = (event) => {
      if (phase !== "armed" || !isAtIntroStart()) {
        return;
      }

      phase = "playing";
      preventScroll(event);

      playIntroAtFrameRate().finally(() => {
        phase = "finished";
      });
    };

    const handleWheel = (event) => {
      if (phase === "playing" && event.deltaY !== 0) {
        preventScroll(event);
        return;
      }

      if (event.deltaY > 0) {
        begin(event);
      }
    };

    const handleTouchStart = (event) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };

    const handleTouchMove = (event) => {
      if (phase === "playing") {
        preventScroll(event);
        return;
      }

      const currentY = event.touches[0]?.clientY;

      if (touchStartY === null || currentY === undefined || touchStartY - currentY < 10) {
        return;
      }

      begin(event);
    };

    const handleKeydown = (event) => {
      if (phase === "playing" && event.key === "Escape") {
        preventScroll(event);
        phase = "finished";
        stopIntroAutoplay();
        return;
      }

      const activeElement = document.activeElement;
      const isTextEntry =
        activeElement?.matches("input, textarea, select, [contenteditable='true']") ||
        (event.key === " " && activeElement?.matches("button, a"));

      if (!introScrollKeys.has(event.key) || isTextEntry) {
        return;
      }

      if (phase === "playing") {
        preventScroll(event);
        return;
      }

      begin(event);
    };

    const handleScroll = () => {
      if (phase !== "finished" || !isAtIntroStart()) {
        return;
      }

      phase = "armed";
      preloadAutoplayWindow(0);
      requestFilmUpdate();
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return cleanup;
  };

  detachIntroAutoplay = setupIntroAutoplay();

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

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) {
      if (isIntroAutoplaying) {
        stopIntroAutoplay();
        scrollToMainMenu();
      }

      detachIntroAutoplay();
    }

    requestFilmUpdate();
  });

  window.addEventListener("pagehide", () => {
    detachIntroAutoplay();
    stopIntroAutoplay();
    decodedFrames.forEach((resource) => resource.release?.());
    decodedFrames.clear();
  });

  skipIntro?.addEventListener("click", () => {
    cancelIntroAutoplay();
    scrollToMainMenu();
  });
}

const readingProgress = document.querySelector(".reading-progress span");
let readingScrollRange = 1;
let readingProgressQueued = false;

const updateReadingProgress = () => {
  readingProgressQueued = false;

  if (!readingProgress) {
    return;
  }

  const progress = clamp(window.scrollY / readingScrollRange);
  readingProgress.style.transform = `scaleX(${progress})`;
};

const requestReadingProgressUpdate = () => {
  if (!readingProgressQueued) {
    readingProgressQueued = true;
    requestAnimationFrame(updateReadingProgress);
  }
};

const refreshReadingScrollRange = () => {
  readingScrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  requestReadingProgressUpdate();
};

window.addEventListener("scroll", requestReadingProgressUpdate, { passive: true });
window.addEventListener("resize", refreshReadingScrollRange);

if ("ResizeObserver" in window) {
  new ResizeObserver(refreshReadingScrollRange).observe(document.body);
}

refreshReadingScrollRange();

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
