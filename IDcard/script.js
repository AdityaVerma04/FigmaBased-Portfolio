/* ==========================================================================
   ADITYA VERMA — DUAL 3D HANGING ID CARD SYSTEM (CARD 1 & CARD 2)
   Modular Physics, Independent Spring Dynamics, & 360° Card 2 Flip
   ========================================================================== */

(function () {
  'use strict';

  const REST_CARD_Y = 170;
  const LANYARD_REST_LEN = 146;
  const BASE_STRAP_WIDTH = 40;
  const MAX_PULL_Y = 190;
  const MAX_PULL_X = 140;
  const SPRING_K = 0.055;
  const DAMPING = 0.83;

  function createCardRig(id, anchorOffset, isFlippable = false) {
    const cardAssembly = document.getElementById(`cardAssembly${id}`);
    const metalHardware = document.getElementById(`metalHardware${id}`);
    const cardSheen = document.getElementById(`cardSheen${id}`);
    const cardSheenBack = document.getElementById(`cardSheen${id}Back`);
    const clothBody = document.getElementById(`clothBody${id}`);
    const clothTexture = document.getElementById(`clothTexture${id}`);
    const clothClipPath = document.getElementById(`clothClipPath${id}`);
    const clothCenterLine = document.getElementById(`clothCenterLine${id}`);
    const clothTextPath = document.getElementById(`clothTextPath${id}`);
    const clothRivetGroup = document.getElementById(`clothRivetGroup${id}`);

    if (!cardAssembly || !clothBody) return null;

    // Physics state
    let cardX = 0;
    let cardY = -340;
    let velX = 0;
    let velY = 0;
    let isInitialDrop = true;

    // User drag state
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragTargetX = 0;
    let dragTargetY = 0;
    let dragDistanceTotal = 0;
    let pointerInitialX = 0;
    let pointerInitialY = 0;

    // 3D Tilt state
    let mouseNormX = 0;
    let mouseNormY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let isHovered = false;

    // 360° Flip state (For Card 2)
    let flipAngleY = 0;
    let targetFlipAngleY = 0;

    // ── Hover-Only 3D Tilt & Specular Sheen ──
    cardAssembly.addEventListener('mousemove', (e) => {
      const rect = cardAssembly.getBoundingClientRect();
      mouseNormX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseNormY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      const sheenX = ((e.clientX - rect.left) / rect.width) * 100;
      const sheenY = ((e.clientY - rect.top) / rect.height) * 100;
      const sheenStyle = `radial-gradient(circle at ${sheenX.toFixed(1)}% ${sheenY.toFixed(1)}%, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.05) 40%, transparent 70%)`;

      if (cardSheen) cardSheen.style.background = sheenStyle;
      if (cardSheenBack) cardSheenBack.style.background = sheenStyle;
    });

    cardAssembly.addEventListener('mouseenter', () => {
      isHovered = true;
    });

    cardAssembly.addEventListener('mouseleave', () => {
      isHovered = false;
      if (!isDragging) {
        mouseNormX = 0;
        mouseNormY = 0;
      }
    });

    // ── Drag & Pull Handlers ──
    function onPointerDragMove(clientX, clientY) {
      if (isDragging) {
        const rawDeltaX = clientX - dragStartX;
        const rawDeltaY = clientY - dragStartY;
        dragDistanceTotal += Math.hypot(clientX - pointerInitialX, clientY - pointerInitialY);

        if (rawDeltaY >= 0) {
          dragTargetY = MAX_PULL_Y * (1 - Math.exp(-rawDeltaY / (MAX_PULL_Y * 0.7)));
        } else {
          dragTargetY = -80 * (1 - Math.exp(-Math.abs(rawDeltaY) / 60));
        }

        dragTargetX = MAX_PULL_X * Math.tanh(rawDeltaX / (MAX_PULL_X * 0.7));
      }
    }

    window.addEventListener('mousemove', (e) => {
      if (isDragging) onPointerDragMove(e.clientX, e.clientY);
    });

    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length > 0) {
        onPointerDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    function startDrag(clientX, clientY) {
      isDragging = true;
      dragStartX = clientX - cardX;
      dragStartY = clientY - (cardY - REST_CARD_Y);
      pointerInitialX = clientX;
      pointerInitialY = clientY;
      dragDistanceTotal = 0;
      cardAssembly.style.cursor = 'grabbing';
    }

    cardAssembly.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startDrag(e.clientX, e.clientY);
    });

    cardAssembly.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    function endDrag(clientX, clientY) {
      if (!isDragging) return;
      isDragging = false;
      cardAssembly.style.cursor = 'grab';

      // If user clicked or tapped Card 2 without a big drag, flip it 180°!
      if (isFlippable && dragDistanceTotal < 12) {
        targetFlipAngleY += 180;
      }

      // If user swiped sideways on Card 2, spin it in the direction of the swipe
      if (isFlippable && Math.abs(cardX) > 40) {
        const flipSpin = cardX > 0 ? 180 : -180;
        targetFlipAngleY += flipSpin;
      }

      const deltaFromRestY = cardY - REST_CARD_Y;
      velY = -deltaFromRestY * 0.22;
      velX = -cardX * 0.22;
      dragTargetX = 0;
      dragTargetY = 0;
    }

    window.addEventListener('mouseup', (e) => endDrag(e.clientX, e.clientY));
    window.addEventListener('touchend', (e) => {
      const touch = e.changedTouches && e.changedTouches[0];
      endDrag(touch ? touch.clientX : 0, touch ? touch.clientY : 0);
    });

    // ── Cloth Ribbon Spline Generator (With 3D Ribbon Twist Physics) ──
    function updateClothSpline(anchorX, anchorY, bottomX, bottomY, tiltDeg, rotateY = 0) {
      const dy = bottomY - anchorY;
      const dx = bottomX - anchorX;

      const flipCos = Math.cos((rotateY * Math.PI) / 180);
      const halfWidthTop = BASE_STRAP_WIDTH / 2;
      const halfWidthBottom = (BASE_STRAP_WIDTH / 2) * flipCos;

      const angleRad = (tiltDeg * Math.PI) / 180;
      const cosA = Math.cos(angleRad);
      const sinA = Math.sin(angleRad);

      const barTx = cosA;
      const barTy = sinA;
      const barNx = -sinA;
      const barNy = cosA;

      const topL_x = anchorX - halfWidthTop;
      const topL_y = anchorY;
      const topR_x = anchorX + halfWidthTop;
      const topR_y = anchorY;

      const tuck = 8;
      const botL_x = bottomX - halfWidthBottom * barTx + tuck * barNx;
      const botL_y = bottomY - halfWidthBottom * barTy + tuck * barNy;
      const botR_x = bottomX + halfWidthBottom * barTx + tuck * barNx;
      const botR_y = bottomY + halfWidthBottom * barTy + tuck * barNy;

      let pathD = '';
      let centerD = '';

      const isUntwisted = Math.abs(rotateY % 360) < 3 || Math.abs(Math.abs(rotateY % 360) - 360) < 3;
      const isPureVertical = isUntwisted && (Math.abs(dx) < 3.5 || (!isDragging && Math.abs(cardX) < 1.5));
      const isTensed = dy >= (LANYARD_REST_LEN - 15);

      if (isPureVertical && isTensed) {
        const straightBotL = anchorX - halfWidthBottom;
        const straightBotR = anchorX + halfWidthBottom;

        pathD = `M ${topL_x} ${topL_y} L ${straightBotL} ${bottomY + tuck} L ${straightBotR} ${bottomY + tuck} L ${topR_x} ${topR_y} Z`;
        centerD = `M ${anchorX} ${bottomY + tuck} L ${anchorX} ${anchorY}`;
      } else if (dy < (LANYARD_REST_LEN - 15)) {
        const slack = (LANYARD_REST_LEN - dy) * 0.75;
        const foldDir = dx >= 0 ? 1 : -1;
        const foldX = anchorX + dx * 0.45 + foldDir * slack;
        const foldY = anchorY + dy * 0.55 + slack * 0.5;

        pathD = `
          M ${topL_x} ${topL_y}
          Q ${foldX - halfWidthTop} ${foldY}, ${botL_x} ${botL_y}
          L ${botR_x} ${botR_y}
          Q ${foldX + halfWidthTop} ${foldY}, ${topR_x} ${topR_y}
          Z
        `;
        centerD = `
          M ${bottomX + tuck * barNx} ${bottomY + tuck * barNy}
          Q ${foldX} ${foldY}, ${anchorX} ${anchorY}
        `;
      } else {
        const cpDist = Math.max(30, dy * 0.38);
        const cp1L_x = topL_x;
        const cp1L_y = topL_y + cpDist;
        const cp1R_x = topR_x;
        const cp1R_y = topR_y + cpDist;

        const cp2L_x = botL_x - cpDist * barNx;
        const cp2L_y = botL_y - cpDist * barNy;
        const cp2R_x = botR_x - cpDist * barNx;
        const cp2R_y = botR_y - cpDist * barNy;

        const cp1C_x = anchorX;
        const cp1C_y = anchorY + cpDist;
        const cp2C_x = (bottomX + tuck * barNx) - cpDist * barNx;
        const cp2C_y = (bottomY + tuck * barNy) - cpDist * barNy;

        pathD = `
          M ${topL_x} ${topL_y}
          C ${cp1L_x} ${cp1L_y}, ${cp2L_x} ${cp2L_y}, ${botL_x} ${botL_y}
          L ${botR_x} ${botR_y}
          C ${cp2R_x} ${cp2R_y}, ${cp1R_x} ${cp1R_y}, ${topR_x} ${topR_y}
          Z
        `;
        centerD = `
          M ${bottomX + tuck * barNx} ${bottomY + tuck * barNy}
          C ${cp2C_x} ${cp2C_y}, ${cp1C_x} ${cp1C_y}, ${anchorX} ${anchorY}
        `;
      }

      clothBody.setAttribute('d', pathD);
      if (clothTexture) clothTexture.setAttribute('d', pathD);
      if (clothClipPath) clothClipPath.setAttribute('d', pathD);
      if (clothCenterLine) clothCenterLine.setAttribute('d', centerD);

      if (clothTextPath) {
        clothTextPath.style.opacity = Math.max(0, flipCos);
        // Lock text position firmly at a fixed distance from the bottom clip
        const fixedDistFromBottom = 75; // Fixed 75px above bottom clip
        clothTextPath.setAttribute('startOffset', `${fixedDistFromBottom}px`);
      }

      if (clothRivetGroup) {
        const rivetX = bottomX - 22 * barNx;
        const rivetY = bottomY - 22 * barNy;
        const rivetScale = Math.max(0.1, Math.abs(flipCos));
        clothRivetGroup.setAttribute('transform', `translate(${rivetX.toFixed(1)}, ${rivetY.toFixed(1)}) scale(${rivetScale.toFixed(2)}, 1)`);
      }
    }

    // Update function called per frame
    return function updateFrame() {
      const topAnchorX = window.innerWidth / 2 + anchorOffset;
      const topAnchorY = 0;

      if (isDragging) {
        cardX += (dragTargetX - cardX) * 0.35;
        const targetY = REST_CARD_Y + dragTargetY;
        cardY += (targetY - cardY) * 0.35;
        velX = 0;
        velY = 0;
      } else {
        const forceX = -SPRING_K * cardX;
        velX = (velX + forceX) * DAMPING;
        cardX += velX;

        const deltaY = cardY - REST_CARD_Y;
        let forceY = -SPRING_K * deltaY;

        if (isInitialDrop) {
          forceY = Math.min(forceY, 13);
          velY = (velY + forceY) * 0.86;
          velY = Math.min(velY, 34);
          if (Math.abs(deltaY) < 4 && Math.abs(velY) < 1.5) {
            isInitialDrop = false;
          }
        } else {
          velY = (velY + forceY) * DAMPING;
        }
        cardY += velY;

        if (Math.abs(cardX) < 0.05 && Math.abs(velX) < 0.05) {
          cardX = 0;
          velX = 0;
        }
      }

      // Smooth 360° flip interpolation
      if (isFlippable) {
        flipAngleY += (targetFlipAngleY - flipAngleY) * 0.1;
      }

      const swayZ = cardX * 0.08;

      const pullTiltY = cardX * 0.14;
      const pullTiltX = -(cardY - REST_CARD_Y) * 0.08;
      const targetTiltY = (isHovered ? mouseNormX * 18 : 0) + pullTiltY;
      const targetTiltX = (isHovered ? -mouseNormY * 16 : 0) + pullTiltX;
      currentTiltX += (targetTiltX - currentTiltX) * 0.12;
      currentTiltY += (targetTiltY - currentTiltY) * 0.12;

      const totalRotateY = currentTiltY + flipAngleY;

      // 1. Position and tilt card assembly
      cardAssembly.style.transform = `
        translate3d(${cardX.toFixed(2)}px, ${(cardY - REST_CARD_Y).toFixed(2)}px, 0)
        rotateX(${currentTiltX.toFixed(2)}deg)
        rotateY(${totalRotateY.toFixed(2)}deg)
        rotateZ(${swayZ.toFixed(2)}deg)
      `;

      // 2. Query exact real-time screen position of the metal bar slot
      let clipCenterX = topAnchorX + cardX;
      let clipCenterY = cardY - 28;

      if (metalHardware) {
        const metalRect = metalHardware.getBoundingClientRect();
        if (metalRect.width > 0) {
          clipCenterX = metalRect.left + metalRect.width / 2;
          clipCenterY = metalRect.top + 5;
        }
      }

      // 3. Update dynamic cloth SVG spline with 3D ribbon twist
      updateClothSpline(topAnchorX, topAnchorY, clipCenterX, clipCenterY, swayZ, totalRotateY);
    };
  }

  // Initialize Card 1 (-190px offset) and Card 2 (+190px offset, with 360° flip enabled)
  const updateCard1 = createCardRig('1', -190, false);
  const updateCard2 = createCardRig('2', 190, true);

  function mainLoop() {
    if (updateCard1) updateCard1();
    if (updateCard2) updateCard2();
    requestAnimationFrame(mainLoop);
  }

  requestAnimationFrame(mainLoop);
})();

