/* ============================================================
   INTERACTIVE VISUALIZATIONS — 3DS Explorable
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  initDisparityDemo();
  initBarrierDemo();
  initLCDDemo();
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
  const cssW = canvas.width;
  const cssH = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const toggle = document.getElementById("barrier-toggle");
  const label3D = document.getElementById("barrier-3d-label");

  function draw(openAmount) {
    const W = cssW;
    const H = cssH;
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, W, H);

    const barrierFrac = openAmount / 100;
    const numPairs = 5;
    const pxW = 30;           // width of each sub-pixel (horizontal now)
    const pxH = 18;           // height of each sub-pixel (vertical now)
    const pairSpacing = 10;   // gap between pixel pairs (horizontal)
    const pairW = pxW * 2;    // total width of one red+blue pair
    const stepW = pairW + pairSpacing;
    const totalW = numPairs * pairW + (numPairs - 1) * pairSpacing;
    const startX = (W - totalW) / 2;

    const pixelY = 40;        // top edge of pixel row
    const barrierY = 140;     // y position of barrier (closer to pixels)
    const barrierH = 6;       // thickness of barrier blocks
    const eyeY = H - 90;      // y position of eyes (near bottom)
    const leftEyeX = W * 0.22;
    const rightEyeX = W * 0.78;
    const destEyeY = eyeY - 15;

    // --- Labels ---
    ctx.font = "bold 14px 'Exo 2', sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#222";
    ctx.fillText("Pixels", startX, pixelY - 8);
    if (barrierFrac > 0.01) {
      ctx.fillStyle = `rgba(34,34,34,${Math.min(1, barrierFrac)})`;
      ctx.fillText("Parallax Barrier", startX, barrierY - 8);
    }

    // --- Draw pixel row (horizontal, top) ---
    // Each pair: blue on left, red on right (CW-rotation of original red-top, blue-bottom)
    const pxCenters = [];
    for (let i = 0; i < numPairs; i++) {
      const x = startX + i * stepW;
      // Right-image pixel (blue) — left half
      ctx.fillStyle = "rgba(30,80,180,0.95)";
      ctx.fillRect(x, pixelY, pxW, pxH);
      // Left-image pixel (red) — right half
      ctx.fillStyle = "rgba(180,40,40,0.95)";
      ctx.fillRect(x + pxW, pixelY, pxW, pxH);

      pxCenters.push({
        blueX: x + pxW / 2,
        redX: x + pxW + pxW / 2,
        y: pixelY + pxH
      });
    }

    // --- Compute slit positions from ray geometry ---
    function xAtY(x1, y1, x2, y2, targetY) {
      const t = (targetY - y1) / (y2 - y1);
      return x1 + t * (x2 - x1);
    }

    const slitRanges = pxCenters.map(pc => {
      const redGoodX = xAtY(pc.redX, pc.y, leftEyeX, destEyeY, barrierY);
      const blueGoodX = xAtY(pc.blueX, pc.y, rightEyeX, destEyeY, barrierY);
      return {
        left: Math.min(redGoodX, blueGoodX),
        right: Math.max(redGoodX, blueGoodX)
      };
    });

    // --- Compute barrier block regions (everywhere NOT a slit) ---
    const leftEdge = startX;
    const rightEdge = startX + totalW;
    const shrink = 3;

    const barrierBlocks = [];
    barrierBlocks.push({ left: leftEdge + shrink, right: slitRanges[0].left });
    for (let i = 0; i < numPairs - 1; i++) {
      barrierBlocks.push({ left: slitRanges[i].right + shrink, right: slitRanges[i + 1].left - shrink });
    }
    barrierBlocks.push({ left: slitRanges[numPairs - 1].right + shrink, right: rightEdge - shrink });

    // --- Draw barrier blocks growing from center ---
    if (barrierFrac > 0.01) {
      ctx.fillStyle = "#1a1a24";
      for (const block of barrierBlocks) {
        const fullW = block.right - block.left;
        const centerX = (block.left + block.right) / 2;
        const drawW = fullW * barrierFrac;
        if (drawW > 0.5) {
          ctx.fillRect(centerX - drawW / 2, barrierY, drawW, barrierH);
        }
      }
    }

    // --- Draw eyes (bottom) ---
    drawEye(ctx, leftEyeX, eyeY, "#1a1a24");
    drawEye(ctx, rightEyeX, eyeY, "#1a1a24");

    // Eye labels
    ctx.fillStyle = "#222";
    ctx.font = "bold 13px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Left Eye", leftEyeX, eyeY + 32);
    ctx.fillText("Right Eye", rightEyeX, eyeY + 32);
    ctx.textAlign = "left";

    // --- Light rays ---
    ctx.lineWidth = 1.5;

    for (let i = 0; i < numPairs; i++) {
      const pc = pxCenters[i];

      // RED pixel → Left eye (GOOD — always passes through slit)
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = "rgba(180,30,30,0.8)";
      ctx.beginPath();
      ctx.moveTo(pc.redX, pc.y);
      ctx.lineTo(leftEyeX, destEyeY);
      ctx.stroke();

      // BLUE pixel → Right eye (GOOD — always passes through slit)
      ctx.strokeStyle = "rgba(20,70,180,0.8)";
      ctx.beginPath();
      ctx.moveTo(pc.blueX, pc.y);
      ctx.lineTo(rightEyeX, destEyeY);
      ctx.stroke();

      // Helper: check if an x-value at the barrier hits a grown block
      function hitsBarrier(rayX) {
        for (const block of barrierBlocks) {
          const fullW = block.right - block.left;
          const centerX = (block.left + block.right) / 2;
          const drawW = fullW * barrierFrac;
          if (rayX >= centerX - drawW / 2 && rayX <= centerX + drawW / 2) return true;
        }
        return false;
      }

      // RED pixel → Right eye (BAD)
      const redBadX = xAtY(pc.redX, pc.y, rightEyeX, destEyeY, barrierY);
      if (hitsBarrier(redBadX)) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "rgba(180,30,30,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.redX, pc.y);
        ctx.lineTo(redBadX, barrierY);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(180,30,30,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.redX, pc.y);
        ctx.lineTo(rightEyeX, destEyeY);
        ctx.stroke();
      }

      // BLUE pixel → Left eye (BAD)
      const blueBadX = xAtY(pc.blueX, pc.y, leftEyeX, destEyeY, barrierY);
      if (hitsBarrier(blueBadX)) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = "rgba(20,70,180,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.blueX, pc.y);
        ctx.lineTo(blueBadX, barrierY);
        ctx.stroke();
      } else {
        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = "rgba(20,70,180,0.55)";
        ctx.beginPath();
        ctx.moveTo(pc.blueX, pc.y);
        ctx.lineTo(leftEyeX, destEyeY);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // --- Status indicator ---
    ctx.textAlign = "center";
    ctx.font = "bold 13px 'Exo 2', sans-serif";
    if (barrierFrac < 0.5) {
      ctx.fillStyle = "#444";
      ctx.fillText("Parallax barrier is disabled. Both eyes see all pixels.", W / 2, H - 12);
    } else {
      ctx.fillStyle = "#991100";
      ctx.fillText("3D Mode is enabled. Parallax barrier directs light to each eye.", W / 2, H - 12);
    }
    ctx.textAlign = "left";
  }

  function drawEye(ctx, x, y, color) {
    // Simple eye: black almond outline, pupil, a few eyelashes
    const eyeW = 20;
    const eyeUp = 14;
    const eyeDown = 10;

    // Almond outline
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - eyeW, y);
    ctx.quadraticCurveTo(x, y - eyeUp, x + eyeW, y);
    ctx.quadraticCurveTo(x, y + eyeDown, x - eyeW, y);
    ctx.stroke();

    // Pupil — slightly above center to suggest looking up
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y - 1, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function updateLabels(on) {
    label3D.classList.toggle("on", on);
  }

  let currentValue = 0;
  let targetValue = 0;
  let animFrame = null;

  function animate() {
    const diff = targetValue - currentValue;
    if (Math.abs(diff) < 0.5) {
      currentValue = targetValue;
      draw(currentValue);
      animFrame = null;
      return;
    }
    currentValue += diff * 0.18;
    draw(currentValue);
    animFrame = requestAnimationFrame(animate);
  }

  toggle.addEventListener("click", () => {
    const on = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", on ? "true" : "false");
    updateLabels(on);
    targetValue = on ? 100 : 0;
    if (!animFrame) animFrame = requestAnimationFrame(animate);
  });

  // Start with barrier disabled
  toggle.setAttribute("aria-checked", "false");
  updateLabels(false);
  draw(0);
}


/* ----------------------------------------------------------
   2.5 LIQUID CRYSTAL DEMO
   Toggle voltage to align LC molecules and turn the cell from
   transparent to opaque (the parallax barrier effect).
   ---------------------------------------------------------- */

function initLCDDemo() {
  const canvas = document.getElementById("lcd-canvas");
  if (!canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const toggle = document.getElementById("lcd-toggle");
  const labelOn = document.getElementById("lcd-on-label");
  if (!toggle || !labelOn) return;

  // Cell layout
  const cellX = 60;
  const cellY = 60;
  const cellW = 340;
  const cellH = 130;
  const cols = 14;
  const rows = 5;
  const moleculeLen = 14;

  // Pre-compute random-ish "off" angles per molecule
  const offAngles = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      offAngles.push(20 + ((c * 3 + r * 7) % 5) * 9); // 20, 29, 38, 47, 56 deg
    }
  }

  let value = 0;        // 0 = off (transparent), 1 = on (opaque)
  let target = 0;
  let animFrame = null;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function draw() {
    // Background
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = "#222";
    ctx.font = "bold 16px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Liquid Crystal Cells", W / 2, 30);

    // Cell base fill (light, transparent-looking)
    ctx.fillStyle = "#f1f1f4";
    ctx.fillRect(cellX, cellY, cellW, cellH);

    // Stripes — every other column darkens when voltage is on (full barrier pattern)
    const stripeW = cellW / cols;
    const targetCol = 6;            // the highlighted stripe whose circuit is shown
    const targetCenterX = cellX + (targetCol + 0.5) * stripeW;

    for (let c = 0; c < cols; c++) {
      if (c % 2 === 0) {
        ctx.fillStyle = `rgba(15,15,18,${value})`;
        ctx.fillRect(cellX + c * stripeW, cellY, stripeW, cellH);
      }
    }

    // Cell border
    ctx.strokeStyle = "rgba(60,60,80,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(cellX, cellY, cellW, cellH);

    // Highlight the target stripe with a subtle green outline when voltage is on
    if (value > 0.05) {
      ctx.strokeStyle = `rgba(60,210,90,${value * 0.9})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(cellX + targetCol * stripeW, cellY, stripeW, cellH);
    }

    // Molecules
    let i = 0;
    ctx.lineCap = "round";
    ctx.lineWidth = 2.6;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const mx = cellX + (c + 0.5) * stripeW;
        const my = cellY + (r + 0.5) * (cellH / rows);
        const isBarrier = (c % 2 === 0);
        const offAng = offAngles[i++];
        const angle = isBarrier ? lerp(offAng, 90, value) : offAng;
        const angleRad = (angle * Math.PI) / 180;
        const dx = (moleculeLen / 2) * Math.cos(angleRad);
        const dy = (moleculeLen / 2) * Math.sin(angleRad);

        let r1, g1, b1;
        if (isBarrier) {
          r1 = Math.round(lerp(70, 230, value));
          g1 = Math.round(lerp(70, 230, value));
          b1 = Math.round(lerp(95, 240, value));
        } else {
          r1 = 70; g1 = 70; b1 = 95;
        }
        ctx.strokeStyle = `rgba(${r1},${g1},${b1},0.7)`;

        ctx.beginPath();
        ctx.moveTo(mx - dx, my - dy);
        ctx.lineTo(mx + dx, my + dy);
        ctx.stroke();
      }
    }
    ctx.lineCap = "butt";

    // Voltage source: + and − terminals connected to the single target stripe
    const vY = cellY + cellH + 36;
    const wireOn = value > 0.5;
    const terminalFill = wireOn ? "#22aa44" : "#888";
    const wireColor = wireOn ? `rgba(40,200,75,${0.55 + value * 0.45})` : "#bbb";

    // Plus terminal (left of stripe)
    const plusX = targetCenterX - 38;
    const minusX = targetCenterX + 10;
    ctx.fillStyle = terminalFill;
    ctx.fillRect(plusX, vY - 10, 28, 20);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+", plusX + 14, vY + 5);

    // Minus terminal (right of stripe)
    ctx.fillStyle = terminalFill;
    ctx.fillRect(minusX, vY - 10, 28, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("−", minusX + 14, vY + 5);

    // Wires from each terminal up and into the same stripe
    ctx.strokeStyle = wireColor;
    ctx.lineWidth = 2;
    const meetY = cellY + cellH + 12;
    const stripeLeftX = targetCenterX - 4;
    const stripeRightX = targetCenterX + 4;
    // + wire: terminal top → up → bend right → into stripe bottom
    ctx.beginPath();
    ctx.moveTo(plusX + 14, vY - 10);
    ctx.lineTo(plusX + 14, meetY);
    ctx.lineTo(stripeLeftX, meetY);
    ctx.lineTo(stripeLeftX, cellY + cellH);
    ctx.stroke();
    // − wire: terminal top → up → bend left → into stripe bottom
    ctx.beginPath();
    ctx.moveTo(minusX + 14, vY - 10);
    ctx.lineTo(minusX + 14, meetY);
    ctx.lineTo(stripeRightX, meetY);
    ctx.lineTo(stripeRightX, cellY + cellH);
    ctx.stroke();

    // Status text
    ctx.fillStyle = "#555";
    ctx.font = "italic 12px 'Source Sans 3', sans-serif";
    ctx.textAlign = "center";
    if (value > 0.5) {
      ctx.fillText("Current flows through each stripe, aligning the molecules and blocking light.", W / 2, H - 12);
    } else {
      ctx.fillText("No current means the molecules are tilted, making the cells transparent.", W / 2, H - 12);
    }
    ctx.textAlign = "left";
  }

  function animate() {
    const diff = target - value;
    if (Math.abs(diff) < 0.005) {
      value = target;
      draw();
      animFrame = null;
      return;
    }
    value += diff * 0.18;
    draw();
    animFrame = requestAnimationFrame(animate);
  }

  toggle.addEventListener("click", () => {
    const on = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", on ? "true" : "false");
    labelOn.classList.toggle("on", on);
    target = on ? 1 : 0;
    if (!animFrame) animFrame = requestAnimationFrame(animate);
  });

  toggle.setAttribute("aria-checked", "false");
  labelOn.classList.remove("on");
  draw();
}


/* ----------------------------------------------------------
   3. PIXEL PAIRING DEMO
   Shows how 3DS sub-pixels pair in 2D mode and split in 3D.
   ---------------------------------------------------------- */

function initPixelDemo() {
  const canvas = document.getElementById("pixel-canvas");
  if (!canvas) return;
  const W = canvas.width;
  const H = canvas.height;
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  const toggle = document.getElementById("pixel-toggle");
  const label3D = document.getElementById("pixel-3d-label");
  if (!toggle || !label3D) return;

  const COLS = 8;
  const ROWS = 3;
  const subW = 20;
  const subGap = 3;         // gap between sub-pixels within a pair
  const pxH = subW * 2;     // pair width (without gap) determines square height
  const pairW = subW * 2 + subGap;
  const pairGap = 10;
  const rowGap = 12;
  const totalW = COLS * pairW + (COLS - 1) * pairGap;
  const totalH = ROWS * pxH + (ROWS - 1) * rowGap;
  const startX = (W - totalW) / 2;
  const startY = 75;

  // 3DS-style RGB + black palette
  const palette = ["#e6353f", "#2eb44a", "#3a6cf0"];
  const maskColor = "#050507";

  function colorFor(c, r, is3D, side) {
    const baseIdx = (c * 3 + r * 5) % palette.length;
    if (!is3D) return palette[baseIdx];
    if (side === "L") return palette[baseIdx];
    // 3D mode: R sub-pixel offset to represent different (parallax-shifted) image
    return palette[(baseIdx + 1) % palette.length];
  }

  function draw(is3D) {
    ctx.fillStyle = "#f5f5f7";
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = "#222";
    ctx.font = "bold 17px 'Exo 2', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(is3D ? "3D Mode" : "2D Mode", W / 2, 28);

    // Subtitle
    ctx.fillStyle = "#555";
    ctx.font = "13px 'Source Sans 3', sans-serif";
    if (is3D) {
      ctx.fillText("Each pair splits and the left and right sub-pixels show different images.", W / 2, 50);
    } else {
      ctx.fillText("Each pair of sub-pixels shows the same color, acting as one pixel.", W / 2, 50);
    }

    // Dark screen mask behind the grid (gives gaps a real-screen look)
    const maskPad = 4;
    ctx.fillStyle = maskColor;
    ctx.fillRect(startX - maskPad, startY - maskPad, totalW + maskPad * 2, totalH + maskPad * 2);

    // Pixel grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = startX + c * (pairW + pairGap);
        const y = startY + r * (pxH + rowGap);
        const isFirst = (r === 0 && c === 0);

        if (is3D) {
          ctx.fillStyle = colorFor(c, r, true, "L");
          ctx.fillRect(x, y, subW, pxH);
          ctx.fillStyle = colorFor(c, r, true, "R");
          ctx.fillRect(x + subW + subGap, y, subW, pxH);

          if (isFirst) {
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.font = "bold 14px 'Exo 2', sans-serif";
            ctx.fillText("L", x + subW / 2, y + pxH / 2 + 5);
            ctx.fillText("R", x + subW + subGap + subW / 2, y + pxH / 2 + 5);
          }
        } else {
          // Both sub-pixels show the same color, with the dark gap showing through
          const color = colorFor(c, r, false);
          ctx.fillStyle = color;
          ctx.fillRect(x, y, subW, pxH);
          ctx.fillRect(x + subW + subGap, y, subW, pxH);

          if (isFirst) {
            ctx.fillStyle = "rgba(255,255,255,0.95)";
            ctx.font = "bold 14px 'Exo 2', sans-serif";
            ctx.fillText("1 px", x + pairW / 2, y + pxH / 2 + 5);
          }
        }
      }
    }

    // Bottom annotation
    ctx.fillStyle = "#555";
    ctx.font = "italic 12px 'Source Sans 3', sans-serif";
    ctx.textAlign = "center";
    if (is3D) {
      ctx.fillText("Each eye sees only its own sub-pixels, around 400 pixels per eye.", W / 2, H - 18);
    } else {
      ctx.fillText("800 sub-pixels paired into 400 effective pixels.", W / 2, H - 18);
    }
    ctx.textAlign = "left";
  }

  toggle.addEventListener("click", () => {
    const on = toggle.getAttribute("aria-checked") !== "true";
    toggle.setAttribute("aria-checked", on ? "true" : "false");
    label3D.classList.toggle("on", on);
    draw(on);
  });

  // Start in 2D mode
  toggle.setAttribute("aria-checked", "false");
  label3D.classList.remove("on");
  draw(false);
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
