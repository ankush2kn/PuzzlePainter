import {
  CUBE_FACE,
  CUBE_FACE_IDS,
  cubeFaceOrigin,
  type CubeFaceId,
} from "@/lib/papercraft";

// A live 3D model of the paper cube. Each face is a unit square hinged to its
// neighbour exactly as on the printed net, so "folding" is just turning the
// hinges 90° — the flat state is the page, the folded state is the cube.
// three.js is imported on demand so it never lands in the main bundle.

export interface CubePreview {
  /** Re-reads the page (paint under lines) into the face textures. */
  update: (paint: HTMLCanvasElement, lines: HTMLCanvasElement) => void;
  setFolded: (folded: boolean) => void;
  destroy: () => void;
}

const TEXTURE_PX = 256;
const FOLD_SECONDS = 1.1;
const REST_TILT = 0.5;

/** Rejects if cancelled, or if WebGL (or the three.js chunk) isn't available. */
export async function createCubePreview(
  canvas: HTMLCanvasElement,
  options: {
    folded: boolean;
    reducedMotion: boolean;
    /** Checked once three.js has loaded, before a WebGL context is taken. */
    isCancelled: () => boolean;
  },
): Promise<CubePreview> {
  const THREE = await import("three");
  if (options.isCancelled()) throw new Error("cancelled");

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);

  const faceCanvases = {} as Record<CubeFaceId, HTMLCanvasElement>;
  const textures = {} as Record<CubeFaceId, import("three").CanvasTexture>;
  const plane = new THREE.PlaneGeometry(1, 1);
  const materials: import("three").Material[] = [];
  const faceMesh = (face: CubeFaceId) => {
    const c = document.createElement("canvas");
    c.width = TEXTURE_PX;
    c.height = TEXTURE_PX;
    const fctx = c.getContext("2d");
    if (fctx) {
      fctx.fillStyle = "#ffffff";
      fctx.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
    }
    faceCanvases[face] = c;
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    textures[face] = texture;
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
    });
    materials.push(material);
    return new THREE.Mesh(plane, material);
  };

  // spin: the user's/auto rotation about the model's centre.
  // net: shifts the model so that centre stays put while it folds.
  const spin = new THREE.Group();
  const net = new THREE.Group();
  scene.add(spin);
  spin.add(net);
  net.add(faceMesh("front"));

  /** A face hanging off `parent` at `at`, extending one unit along `dir`. */
  const hinged = (
    parent: import("three").Object3D,
    face: CubeFaceId,
    at: [number, number],
    dir: [number, number],
  ) => {
    const hinge = new THREE.Group();
    hinge.position.set(at[0], at[1], 0);
    const mesh = faceMesh(face);
    mesh.position.set(dir[0] / 2, dir[1] / 2, 0);
    hinge.add(mesh);
    parent.add(hinge);
    return hinge;
  };
  const top = hinged(net, "top", [0, 0.5], [0, 1]);
  const bottom = hinged(net, "bottom", [0, -0.5], [0, -1]);
  const right = hinged(net, "right", [0.5, 0], [1, 0]);
  const left = hinged(net, "left", [-0.5, 0], [-1, 0]);
  const back = hinged(bottom, "back", [0, -1], [0, -1]);

  let folded = options.folded;
  let fold = folded ? 1 : 0; // 0 flat … 1 cube
  let rotX = folded ? REST_TILT : 0;
  let rotY = folded ? -0.6 : 0;
  let dragging: { pointerId: number; x: number; y: number } | null = null;
  let touched = false; // once the child has spun it, stop auto-spinning
  let dirty = true;
  let last = 0;
  let frame = 0;

  const pose = () => {
    const e = fold * fold * (3 - 2 * fold);
    const quarter = (Math.PI / 2) * e;
    top.rotation.x = -quarter;
    bottom.rotation.x = quarter;
    back.rotation.x = quarter;
    right.rotation.y = quarter;
    left.rotation.y = -quarter;
    // Flat, the cross is centred half a face below the front face; folded,
    // the cube's centre is half a face behind it.
    net.position.set(0, 0.5 * (1 - e), 0.5 * e);
    camera.position.set(0, 0, 7.4 - 3.8 * e);
    spin.rotation.set(rotX, rotY, 0);
  };

  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };

  const tick = (now: number) => {
    frame = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = folded ? 1 : 0;
    if (fold !== target) {
      const step = options.reducedMotion ? 1 : dt / FOLD_SECONDS;
      fold = target > fold ? Math.min(1, fold + step) : Math.max(0, fold - step);
      dirty = true;
    }
    if (folded) {
      if (!dragging && !touched && !options.reducedMotion) {
        rotY += dt * 0.6;
        rotX += (REST_TILT - rotX) * Math.min(1, dt * 4);
        dirty = true;
      }
    } else if (Math.abs(rotX) > 0.001 || Math.abs(rotY) > 0.001) {
      // Lay the net flat, facing the viewer, by the shorter way round.
      rotY = Math.atan2(Math.sin(rotY), Math.cos(rotY));
      const ease = options.reducedMotion ? 1 : Math.min(1, dt * 6);
      rotX -= rotX * ease;
      rotY -= rotY * ease;
      dirty = true;
    }
    if (!dirty) return;
    dirty = false;
    pose();
    renderer.render(scene, camera);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (dragging || !folded) return;
    canvas.setPointerCapture(e.pointerId);
    dragging = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    touched = true;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== dragging.pointerId) return;
    rotY += (e.clientX - dragging.x) * 0.012;
    rotX = Math.max(-1.4, Math.min(1.4, rotX + (e.clientY - dragging.y) * 0.012));
    dragging.x = e.clientX;
    dragging.y = e.clientY;
    dirty = true;
  };
  const onPointerUp = (e: PointerEvent) => {
    if (dragging && e.pointerId === dragging.pointerId) dragging = null;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  frame = requestAnimationFrame(tick);

  return {
    update: (paint, lines) => {
      for (const face of CUBE_FACE_IDS) {
        const fctx = faceCanvases[face].getContext("2d");
        if (!fctx) continue;
        const { x, y } = cubeFaceOrigin(face);
        fctx.fillStyle = "#ffffff";
        fctx.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
        for (const layer of [paint, lines]) {
          fctx.drawImage(layer, x, y, CUBE_FACE, CUBE_FACE, 0, 0, TEXTURE_PX, TEXTURE_PX);
        }
        textures[face].needsUpdate = true;
      }
      dirty = true;
    },
    setFolded: (next) => {
      folded = next;
      // Folding up again resumes the gentle spin.
      if (next) touched = false;
      dirty = true;
    },
    destroy: () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      plane.dispose();
      for (const m of materials) m.dispose();
      for (const face of CUBE_FACE_IDS) textures[face].dispose();
      renderer.dispose();
    },
  };
}
