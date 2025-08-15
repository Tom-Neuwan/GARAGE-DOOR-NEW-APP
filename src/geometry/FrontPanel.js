// src/geometry/FrontPanel.js
import * as THREE from 'three';

export function createFrontPanel({ W, H, baseMaterial, panelMaterial, grooveMaterial }) {
  const group = new THREE.Group();

  const SLAB_THICKNESS = 0.167;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-W/2, -H/2);
  doorShape.lineTo(W/2, -H/2);
  doorShape.lineTo(W/2, H/2);
  doorShape.lineTo(-W/2, H/2);
  doorShape.lineTo(-W/2, -H/2);

  const panelPositions = [];
  const sections = 4;
  const sectionHeight = H / sections;
  
  // --- START OF PROPORTION FIX ---
  // Determine number of columns based on your specific rules
  let columns;
  if (W <= 10) {          // For doors up to 10' wide
    columns = 2;
  } else if (W <= 14) {   // For doors between 10' and 14'
    columns = 3;
  } else {                // For doors wider than 14'
    columns = 4;
  }

  for (let section = 0; section < sections; section++) {
    const sectionY = (section - (sections - 1) / 2) * sectionHeight;
    for (let c = 0; c < columns; c++) {
      // THIS IS THE KEY CHANGE:
      // Calculate panel width based on the width of its own "cell", not the total door width.
      const cellWidth = W / columns;
      const panelWidth = cellWidth * 0.8; // Panel is 80% of its cell width. This keeps it proportional.
      const panelHeight = sectionHeight * 0.8;
      
      const panelX = (c - (columns - 1) / 2) * cellWidth;

      panelPositions.push({ x: panelX, y: sectionY, w: panelWidth, h: panelHeight });
      const hole = new THREE.Path();
      hole.moveTo(panelX - panelWidth/2, sectionY - panelHeight/2);
      hole.lineTo(panelX + panelWidth/2, sectionY - panelHeight/2);
      hole.lineTo(panelX + panelWidth/2, sectionY + panelHeight/2);
      hole.lineTo(panelX - panelWidth/2, sectionY + panelHeight/2);
      hole.lineTo(panelX - panelWidth/2, sectionY - panelHeight/2);
      doorShape.holes.push(hole);
    }
  }
  // --- END OF PROPORTION FIX ---

  const doorFrameGeometry = new THREE.ExtrudeGeometry(doorShape, {
    depth: SLAB_THICKNESS,
    bevelEnabled: false,
  });
  doorFrameGeometry.translate(0, 0, -SLAB_THICKNESS);
  const doorFrameMesh = new THREE.Mesh(doorFrameGeometry, baseMaterial);
  doorFrameMesh.castShadow = true;
  doorFrameMesh.receiveShadow = true;
  group.add(doorFrameMesh);

  panelPositions.forEach(({ x, y, w, h }) => {
    // Level 1: Roundover edge
    const roundoverRadius = 0.050;
    const roundoverDepth = 0.05;
    const roundoverShape = new THREE.Shape();
    roundoverShape.moveTo(-w/2, -h/2);
    roundoverShape.lineTo(w/2, -h/2);
    roundoverShape.lineTo(w/2, h/2);
    roundoverShape.lineTo(-w/2, h/2);
    roundoverShape.lineTo(-w/2, -h/2);
    const level1InnerW = w - (roundoverRadius * 2);
    const level1InnerH = h - (roundoverRadius * 2);
    const roundoverHole = new THREE.Path();
    roundoverHole.moveTo(-level1InnerW/2, -level1InnerH/2);
    roundoverHole.lineTo(level1InnerW/2, -level1InnerH/2);
    roundoverHole.lineTo(level1InnerW/2, level1InnerH/2);
    roundoverHole.lineTo(-level1InnerW/2, level1InnerH/2);
    roundoverHole.lineTo(-level1InnerW/2, -level1InnerH/2);
    roundoverShape.holes.push(roundoverHole);
    const roundoverGeometry = new THREE.ExtrudeGeometry(roundoverShape, {
    depth: roundoverDepth, bevelEnabled: true, bevelThickness: roundoverRadius * 0.5,
    bevelSize: roundoverRadius * 0.4, bevelSegments: 6
    });
    roundoverGeometry.translate(0, 0, -roundoverDepth);
    const roundoverMesh = new THREE.Mesh(roundoverGeometry, panelMaterial);
    roundoverMesh.position.set(x, y, -roundoverDepth);
    roundoverMesh.receiveShadow = true;
    group.add(roundoverMesh);

    // Level 2: Deep recessed flat area
    const deepWidth = 0.14;
    const deepDepth = 0.042;
    const overlap = 0.001;
    const deepShape = new THREE.Shape();
    deepShape.moveTo(-(level1InnerW/2 + overlap), -(level1InnerH/2 + overlap));
    deepShape.lineTo( (level1InnerW/2 + overlap), -(level1InnerH/2 + overlap));
    deepShape.lineTo( (level1InnerW/2 + overlap),  (level1InnerH/2 + overlap));
    deepShape.lineTo(-(level1InnerW/2 + overlap),  (level1InnerH/2 + overlap));
    deepShape.lineTo(-(level1InnerW/2 + overlap), -(level1InnerH/2 + overlap));
    const centerPanelW = level1InnerW - (deepWidth * 2);
    const centerPanelH = level1InnerH - (deepWidth * 2);
    const deepHole = new THREE.Path();
    deepHole.moveTo(-centerPanelW/2, -centerPanelH/2);
    deepHole.lineTo(centerPanelW/2, -centerPanelH/2);
    deepHole.lineTo(centerPanelW/2, centerPanelH/2);
    deepHole.lineTo(-centerPanelW/2, centerPanelH/2);
    deepHole.lineTo(-centerPanelW/2, -centerPanelH/2);
    deepShape.holes.push(deepHole);
    const deepGeometry = new THREE.ExtrudeGeometry(deepShape, {
        depth: deepDepth, bevelEnabled: true, bevelThickness: 0.012,
        bevelSize: 0.010, bevelSegments: 4
      });
    deepGeometry.translate(0, 0, -deepDepth);
    const deepMesh = new THREE.Mesh(deepGeometry, grooveMaterial);
    deepMesh.position.set(x, y, -roundoverDepth - deepDepth);
    deepMesh.receiveShadow = true;
    group.add(deepMesh);

    // Level 3: Center raised panel
    const raisedHeight = roundoverDepth + deepDepth;
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, -centerPanelH/2);
    const centerGeometry = new THREE.ExtrudeGeometry(centerShape, {
        depth: raisedHeight, bevelEnabled: true, bevelThickness: 0.010,
        bevelSize: 0.080, bevelSegments: 1
    });
    centerGeometry.translate(0, 0, -raisedHeight);
    const centerMesh = new THREE.Mesh(centerGeometry, baseMaterial);
    centerMesh.position.set(x, y, -roundoverDepth - deepDepth + raisedHeight);
    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    group.add(centerMesh);
  });
  
  return group;
}
