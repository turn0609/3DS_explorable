/* ============================================================
   INTERACTIVE VISUALIZATIONS — 3DS Explorable
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initDisparityDemo();
  initBarrierDemo();
  initPixelDemo();
  initSideNav();
});

/* ----------------------------------------------------------
   1. BINOCULAR DISPARITY DEMO
   Shows a simple scene from left-eye, right-eye, or both
   perspectives so the viewer can see the horizontal shift.
   ---------------------------------------------------------- */

function initDisparityDemo() {
  const field = document.getElementById("disparity-field");
  if (!field) return;

  const shapes = [
    { type: "circle", size: 60, color: "#cc1100", x: 8, y: 12 },
    { type: "square", size: 50, color: "#22aa44", x: 72, y: 8 },
    { type: "circle", size: 40, color: "#2266cc", x: 38, y: 55 },
    { type: "diamond", size: 55, color: "#cc8800", x: 82, y: 58 },
    { type: "circle", size: 45, color: "#8833aa", x: 18, y: 72 },
    { type: "square", size: 35, color: "#cc1100", x: 55, y: 30 },
    { type: "diamond", size: 42, color: "#2266cc", x: 5, y: 42 },
    { type: "circle", size: 38, color: "#22aa44", x: 90, y: 35 },
  ];

  shapes.forEach(s => {
    const el = document.createElement("div");
    el.className = "disparity-shape";
    el.style.width = s.size + "px";
    el.style.height = s.size + "px";
    el.style.backgroundColor = s.color;
    el.style.left = s.x + "%";
    el.style.top = s.y + "%";

    if (s.type === "circle") {
      el.style.borderRadius = "50%";
    } else if (s.type === "diamond") {
      el.style.borderRadius = "4px";
      el.style.transform = "rotate(45deg)";
    } else {
      el.style.borderRadius = "4px";
    }

    field.appendChild(el);
  });
}


/* ----------------------------------------------------------
   2. PARALLAX BARRIER DEMO
   Shows a cross-section diagram of light from two sub-pixel
   rows passing through barrier slits to reach each eye.
   ---------------------------------------------------------- */

function initBarrierDemo() {
  const canvas = document.getElementById("barrier-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const slider = document.getElementById("barrier-slider");
  const valueLabel = document.getElementById("barrier-value");

  function draw(openAmount) {
    const W = canvas.width;
    const H = canvas.height;
    // Light canvas background
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, W, H);

    // openAmount=0 means barrier disabled (no barrier visible, all light passes)
    // openAmount=100 means barrier fully enabled (slits direct light)
    const barrierFrac = openAmount / 100;  // 0=no barrier, 1=full barrier
    const numPairs = 5;
    const pxH = 30;           // height of each sub-pixel
    const pxW = 18;           // width of each sub-pixel
    const pairSpacing = 10;   // gap between pixel pairs
    const pairH = pxH * 2;   // total height of one red+blue pair
    const stepH = pairH + pairSpacing;
    const totalH = numPairs * pairH + (numPairs - 1) * pairSpacing;
    const startY = (H - totalH) / 2 + 10;

    const pixelX = 40;        // left edge of pixel column
    const barrierX = 140;     // x position of barrier (closer to pixels)
    const barrierW = 6;       // width of barrier blocks
    const eyeX = W - 40;      // x position of eyes (further right)
    const rightEyeY = H * 0.22;
    const leftEyeY = H * 0.78;

    // --- Labels ---
    ctx.fillStyle = "#222";
    ctx.font = "bold 14px 'Exo 2', sans-serif";
    ctx.fillText("Pixels", pixelX, startY - 18);
    ctx.fillText("Parallax Barrier", barrierX - 30, startY - 18);

    // --- Draw pixel column (vertical, left side) ---
    // Each pair: red on top, blue on bottom, touching with no gap
    const pxCenters = [];
    for (let i = 0; i < numPairs; i++) {
      const y = startY + i * stepH;
      // Left-image pixel (red/salmon)
      ctx.fillStyle = "rgba(180,40,40,0.95)";
      ctx.fillRect(pixelX, y, pxW, pxH);
      // Right-image pixel (blue)
      ctx.fillStyle = "rgba(30,80,180,0.95)";
      ctx.fillRect(pixelX, y + pxH, pxW, pxH);

      pxCenters.push({
        redY: y + pxH / 2,
        blueY: y + pxH + pxH / 2,
        pairCenterY: y + pxH,  // boundary between red and blue
        x: pixelX + pxW
      });
    }

    // --- Compute slit positions from ray geometry ---
    // "Good" rays: red→leftEye, blue→rightEye should pass through.
    // For each pair, find where those good rays cross barrierX,
    // then the slit spans between those two y-values.
    const destEyeX = eyeX - 15;

    function yAtX(x1, y1, x2, y2, targetX) {
      const t = (targetX - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }

    const slitRanges = pxCenters.map(pc => {
      const redGoodY = yAtX(pc.x, pc.redY, destEyeX, leftEyeY, barrierX);
      const blueGoodY = yAtX(pc.x, pc.blueY, destEyeX, rightEyeY, barrierX);
      return {
        top: Math.min(redGoodY, blueGoodY),
        bottom: Math.max(redGoodY, blueGoodY)
      };
    });

    function isInSlit(y) {
      for (const s of slitRanges) {
        if (y >= s.top && y <= s.bottom) return true;
      }
      return false;
    }

    // --- Compute barrier block regions (everywhere NOT a slit) ---
    const topEdge = startY;
    const bottomEdge = startY + totalH;
    const shrink = 3;

    const barrierBlocks = [];
    // Top cap
    barrierBlocks.push({ top: topEdge + shrink, bottom: slitRanges[0].top });
    // Blocks between slits
    for (let i = 0; i < numPairs - 1; i++) {
      barrierBlocks.push({ top: slitRanges[i].bottom + shrink, bottom: slitRanges[i + 1].top - shrink });
    }
    // Bottom cap
    barrierBlocks.push({ top: slitRanges[numPairs - 1].bottom + shrink, bottom: bottomEdge - shrink });

    // --- Draw barrier blocks growing from center ---
    if (barrierFrac > 0.01) {
      ctx.fillStyle = "#1a1a24";
      for (const block of barrierBlocks) {
        const fullH = block.bottom - block.top;
        const centerY = (block.top + block.bottom) / 2;
        const drawH = fullH * barrierFrac;
        if (drawH > 0.5) {
          ctx.fillRect(barrierX, centerY - drawH / 2, barrierW, drawH);
        }
      }
    }

    // --- Draw eyes (right side) ---
    drawEye(ctx, eyeX, rightEyeY, "#1a1a24", "Right");
    drawEye(ctx, eyeX, leftEyeY, "#1a1a24", "Left");

    // --- Light rays ---
    ctx.lineWidth = 1.5;

    for (let i = 0; i < numPairs; i++) {
      const pc = pxCenters[i];

      // RED pixel → Left eye (GOOD — always passes through slit)
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(180,30,30,0.8)";
      ctx.beginPath();
      ctx.moveTo(pc.x, pc.redY);
      ctx.lineTo(destEyeX, leftEyeY);
      ctx.stroke();

      // BLUE pixel → Right eye (GOOD — always passes through slit)
      ctx.strokeStyle = "rgba(20,70,180,0.8)";
      ctx.beginPath();
      ctx.moveTo(pc.x, pc.blueY);
      ctx.lineTo(destEyeX, rightEyeY);
      ctx.stroke();

      // Helper: check if a y-value at the barrier hits a grown block
      function hitsBarrier(rayY) {
        for (const block of barrierBlocks) {
          const fullH = block.bottom - block.top;
          const centerY = (block.top + block.bottom) / 2;
          const drawH = fullH * barrierFrac;
          if (rayY >= centerY - drawH / 2 && rayY <= centerY + drawH / 2) return true;
        }
        return false;
      }

      // RED pixel → Right eye
      const redBadY = yAtX(pc.x, pc.redY, destEyeX, rightEyeY, barrierX);
      if (hitsBarrier(redBadY)) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "rgba(180,30,30,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.x, pc.redY);
        ctx.lineTo(barrierX, redBadY);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(180,30,30,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.x, pc.redY);
        ctx.lineTo(destEyeX, rightEyeY);
        ctx.stroke();
      }

      // BLUE pixel → Left eye
      const blueBadY = yAtX(pc.x, pc.blueY, destEyeX, leftEyeY, barrierX);
      if (hitsBarrier(blueBadY)) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "rgba(20,70,180,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.x, pc.blueY);
        ctx.lineTo(barrierX, blueBadY);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(20,70,180,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.x, pc.blueY);
        ctx.lineTo(destEyeX, leftEyeY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // --- Legend box (bottom right) ---
    const legendX = W - 140;
    const legendY = H - 80;
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(legendX, legendY, 120, 60);
    ctx.fillStyle = "rgba(30,80,180,0.95)";
    ctx.fillRect(legendX + 10, legendY + 10, 16, 16);
    ctx.fillStyle = "#111";
    ctx.font = "bold 13px 'Exo 2', sans-serif";
    ctx.fillText("Right Eye", legendX + 34, legendY + 23);
    ctx.fillStyle = "rgba(180,40,40,0.95)";
    ctx.fillRect(legendX + 10, legendY + 34, 16, 16);
    ctx.fillStyle = "#111";
    ctx.fillText("Left Eye", legendX + 34, legendY + 47);

    // --- Status indicator ---
    if (barrierFrac < 0.1) {
      ctx.fillStyle = "#444";
      ctx.font = "bold 13px 'Exo 2', sans-serif";
      ctx.fillText("BARRIER DISABLED — Both eyes see all pixels", W / 2 - 140, H - 14);
    } else if (barrierFrac > 0.9) {
      ctx.fillStyle = "#991100";
      ctx.font = "bold 13px 'Exo 2', sans-serif";
      ctx.fillText("3D MODE — Barrier directs light to each eye", W / 2 - 135, H - 14);
    } else {
      ctx.fillStyle = "#775500";
      ctx.font = "bold 13px 'Exo 2', sans-serif";
      ctx.fillText("ADJUSTING BARRIER...", W / 2 - 70, H - 14);
    }
  }

  function drawEye(ctx, x, y, color, label) {
    // Eye outline (sideways almond shape pointing left)
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 18, y);
    ctx.quadraticCurveTo(x, y - 12, x + 14, y);
    ctx.quadraticCurveTo(x, y + 12, x - 18, y);
    ctx.stroke();
    // Pupil
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  slider.addEventListener("input", () => {
    const val = parseInt(slider.value);
    valueLabel.textContent = val < 10 ? "OFF" : val + "%";
    draw(val);
  });

  // Start with barrier disabled
  slider.value = 0;
  valueLabel.textContent = "OFF";
  draw(0);
}


/* ----------------------------------------------------------
   3. PIXEL PAIRING DEMO
   Shows how 3DS sub-pixels pair in 2D mode and split in 3D.
   ---------------------------------------------------------- */

function initPixelDemo() {
  const canvas = document.getElementById("pixel-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const PAIRS = 10;
  const subW = 16;        // width of one sub-pixel column
  const pxH = 80;         // height of each pixel block
  const pairGap = 4;      // gap between pairs
  const splitGap = 3;     // gap between sub-pixels in 3D mode
  const sectionGap = 60;  // vertical gap between 2D and 3D sections

  // Generate colors for left-eye and right-eye images
  const leftHues = [];
  const rightHues = [];
  for (let i = 0; i < PAIRS; i++) {
    leftHues.push((i * 32 + 10) % 360);
    rightHues.push((i * 32 + 160) % 360);
  }

  function hslStr(h, s, l) {
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  ctx.fillStyle = "#f5f5f7";
  ctx.fillRect(0, 0, W, H);

  // --- 2D MODE (top half) ---
  const pairW2D = subW * 2;
  const totalW2D = PAIRS * pairW2D + (PAIRS - 1) * pairGap;
  const startX2D = (W - totalW2D) / 2;
  const startY2D = 55;

  // Title
  ctx.fillStyle = "#222";
  ctx.font = "bold 15px 'Exo 2', sans-serif";
  ctx.fillText("2D Mode — Sub-pixels paired (same color)", startX2D, startY2D - 12);

  for (let i = 0; i < PAIRS; i++) {
    const x = startX2D + i * (pairW2D + pairGap);
    const color = hslStr(leftHues[i], 55, 40);

    // Both sub-pixels show the same color
    ctx.fillStyle = color;
    ctx.fillRect(x, startY2D, subW, pxH);
    ctx.fillRect(x + subW, startY2D, subW, pxH);

    // Thin divider to show sub-pixel boundary
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + subW, startY2D);
    ctx.lineTo(x + subW, startY2D + pxH);
    ctx.stroke();

    // Bracket underneath showing pair
    const bracketY = startY2D + pxH + 6;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, bracketY);
    ctx.lineTo(x + 2, bracketY + 5);
    ctx.lineTo(x + pairW2D - 2, bracketY + 5);
    ctx.lineTo(x + pairW2D - 2, bracketY);
    ctx.stroke();

    // Pixel number
    ctx.fillStyle = "#555";
    ctx.font = "bold 10px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${i + 1}`, x + subW, bracketY + 16);
  }

  // Appearance label
  ctx.textAlign = "left";
  ctx.fillStyle = "#666";
  ctx.font = "italic 12px 'Source Sans 3', sans-serif";
  ctx.fillText("Appears as " + PAIRS + " wide pixels (400px apparent width)", startX2D, startY2D + pxH + 36);

  // --- 3D MODE (bottom half) ---
  const startY3D = startY2D + pxH + sectionGap + 40;
  const pairW3D = subW * 2 + splitGap;
  const totalW3D = PAIRS * pairW3D + (PAIRS - 1) * pairGap;
  const startX3D = (W - totalW3D) / 2;

  // Title
  ctx.fillStyle = "#222";
  ctx.font = "bold 15px 'Exo 2', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("3D Mode — Sub-pixels split (different images)", startX3D, startY3D - 12);

  for (let i = 0; i < PAIRS; i++) {
    const x = startX3D + i * (pairW3D + pairGap);
    const leftColor = hslStr(leftHues[i], 55, 40);
    const rightColor = hslStr(rightHues[i], 50, 35);

    // Left-eye sub-pixel
    ctx.fillStyle = leftColor;
    ctx.fillRect(x, startY3D, subW, pxH);

    // Right-eye sub-pixel
    ctx.fillStyle = rightColor;
    ctx.fillRect(x + subW + splitGap, startY3D, subW, pxH);

    // "L" and "R" labels inside sub-pixels
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 10px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("L", x + subW / 2, startY3D + pxH / 2 + 4);
    ctx.fillText("R", x + subW + splitGap + subW / 2, startY3D + pxH / 2 + 4);
  }

  // Appearance label
  ctx.textAlign = "left";
  ctx.fillStyle = "#666";
  ctx.font = "italic 12px 'Source Sans 3', sans-serif";
  ctx.fillText("Each sub-pixel shows a separate image (800px, split between eyes)", startX3D, startY3D + pxH + 20);

  // --- Legend ---
  const legX = W - 170;
  const legY = startY3D + pxH + 40;
  ctx.fillStyle = hslStr(leftHues[0], 55, 40);
  ctx.fillRect(legX, legY, 14, 14);
  ctx.fillStyle = "#222";
  ctx.font = "bold 12px 'Exo 2', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Left Eye Image", legX + 20, legY + 12);

  ctx.fillStyle = hslStr(rightHues[0], 50, 35);
  ctx.fillRect(legX, legY + 22, 14, 14);
  ctx.fillStyle = "#222";
  ctx.fillText("Right Eye Image", legX + 20, legY + 34);
}


/* ----------------------------------------------------------
   4. SIDE NAV — Scroll-tracking stacking navigation
   Sections above the viewport compress into a "passed" stack,
   the current section is highlighted, and upcoming ones dim.
   ---------------------------------------------------------- */

function initSideNav() {
  const chips = document.querySelectorAll(".nav-chip");
  if (!chips.length) return;

  const sectionIds = Array.from(chips).map(c => c.dataset.section);
  const sections = sectionIds.map(id => document.getElementById(id));

  // Smooth scroll on click
  chips.forEach(chip => {
    chip.addEventListener("click", (e) => {
      e.preventDefault();
      const target = document.getElementById(chip.dataset.section);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  function onScroll() {
    const scrollY = window.scrollY + window.innerHeight * 0.35;
    let activeIndex = 0;

    sections.forEach((sec, i) => {
      if (sec && sec.offsetTop <= scrollY) {
        activeIndex = i;
      }
    });

    chips.forEach((chip, i) => {
      chip.classList.remove("passed", "active", "upcoming");
      if (i < activeIndex) {
        chip.classList.add("passed");
      } else if (i === activeIndex) {
        chip.classList.add("active");
      } else {
        chip.classList.add("upcoming");
      }
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}


const stylusCursor = document.querySelector('#stylusCursor');

document.addEventListener('mousemove', (event) => {
  const h = stylusCursor.offsetHeight || 50;
  stylusCursor.style.position = 'fixed';
  stylusCursor.style.left = event.clientX + 'px';
  stylusCursor.style.top  = (event.clientY - h) + 'px';
  stylusCursor.style.pointerEvents = 'none';
});
