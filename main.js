const scene = document.querySelector(".scene");
const viewport = scene.querySelector(".cat0");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let framePending = false;
let layers = [];

function measureLayers() {
  layers = Array.from(viewport.children).flatMap((element) => {
    const value = getComputedStyle(element).getPropertyValue("--depth").trim();
    if (value === "") {
      return [];
    }

    const depth = Number(value);
    if (!Number.isFinite(depth) || depth <= 0) {
      throw new Error(`Invalid --depth for .${element.className}: ${value}`);
    }

    return [{ element, depth }];
  });
}

function updateZoom() {
  const bounds = scene.getBoundingClientRect();
  const scrollDistance = bounds.height - viewport.clientHeight;
  const progress = reducedMotion.matches || scrollDistance <= 0
    ? 0
    : Math.min(1, Math.max(0, -bounds.top / scrollDistance));

  viewport.style.setProperty("--placement-progress", Math.min(1, progress / 0.25));
  viewport.style.setProperty("--tree-progress", Math.max(0, (progress - 0.25) / 0.75));

  // Reach the birds first, then travel more slowly toward the tree plane.
  const camera = progress <= 0.4
    ? (progress / 0.4) * 5
    : 5 + ((progress - 0.4) / 0.6) * 3.28;

  for (const { element, depth } of layers) {
    const distance = depth - camera;
    // Clip at the near plane instead of dividing by zero or fading layers.
    const passed = distance <= 0.02;
    element.style.setProperty(
      "--projection",
      passed ? 1 : depth / distance
    );
    element.style.setProperty(
      "--layer-visibility",
      passed ? "hidden" : "visible"
    );
  }
  framePending = false;
}

function scheduleZoom() {
  if (!framePending) {
    framePending = true;
    window.requestAnimationFrame(updateZoom);
  }
}

window.addEventListener("scroll", scheduleZoom, { passive: true });
window.addEventListener("resize", () => {
  measureLayers();
  scheduleZoom();
});
reducedMotion.addEventListener("change", scheduleZoom);
measureLayers();
updateZoom();
