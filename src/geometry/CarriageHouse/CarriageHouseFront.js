import * as THREE from 'three';

const fixUVMapping = (geometry, width, height, offsetX, offsetY, doorWidth, doorHeight) => {
  const uvAttribute = geometry.attributes.uv;
  if (!uvAttribute) return;
  const uvArray = uvAttribute.array;
  const positionAttribute = geometry.attributes.position;
  const positionArray = positionAttribute.array;
  for (let i = 0; i < uvArray.length; i += 2) {
    const vertexIndex = i / 2;
    const localX = positionArray[vertexIndex * 3];
    const localY = positionArray[vertexIndex * 3 + 1];
    const worldX = localX + offsetX;
    const worldY = localY + offsetY;
    uvArray[i] = (worldX + doorWidth / 2) / doorWidth;
    uvArray[i + 1] = (worldY + doorHeight / 2) / doorHeight;
  }
  uvAttribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};

export function createCarriageHouseFront({ W, H, baseMaterial, panelMaterial, grooveMaterial }) {
  const group = new THREE.Group();

  // --- Base geometry is copied from your working FrontPanel.js ---
  const SLAB_THICKNESS = 0.167;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-W / 2, -H / 2);
  doorShape.lineTo(W / 2, -H / 2);
  doorShape.lineTo(W / 2, H / 2);
  doorShape.lineTo(-W / 2, H / 2);
  doorShape.lineTo(-W / 2, -H / 2);

  const panelPositions = [];
  const sections = 4;
  const sectionHeight = H / sections;
  let columns;
  if (W <= 10) { columns = 2; }
  else if (W <= 14) { columns = 3; }
  else { columns = 4; }

  for (let section = 0; section < sections; section++) {
    const sectionY = (section - (sections - 1) / 2) * sectionHeight;
    for (let c = 0; c < columns; c++) {
      const cellWidth = W / columns;
      const panelWidth = cellWidth * 0.8;
      const panelHeight = sectionHeight * 0.8;
      const panelX = (c - (columns - 1) / 2) * cellWidth;
      panelPositions.push({ x: panelX, y: sectionY, w: panelWidth, h: panelHeight });
      const hole = new THREE.Path();
      hole.moveTo(panelX - panelWidth / 2, sectionY - panelHeight / 2);
      hole.lineTo(panelX + panelWidth / 2, sectionY - panelHeight / 2);
      hole.lineTo(panelX + panelWidth / 2, sectionY + panelHeight / 2);
      hole.lineTo(panelX - panelWidth / 2, sectionY + panelHeight / 2);
      hole.lineTo(panelX - panelWidth / 2, sectionY - panelHeight / 2);
      doorShape.holes.push(hole);
    }
  }

  const doorFrameGeometry = new THREE.ExtrudeGeometry(doorShape, { depth: SLAB_THICKNESS, bevelEnabled: false });
  doorFrameGeometry.translate(0, 0, -SLAB_THICKNESS);
  const doorFrameMesh = new THREE.Mesh(doorFrameGeometry, baseMaterial);
  doorFrameMesh.castShadow = true;
  doorFrameMesh.receiveShadow = true;
  group.add(doorFrameMesh);

  panelPositions.forEach(({ x, y, w, h }) => {
    // --- The complex, multi-part panel geometry ---
    const roundoverRadius = 0.050;
    const roundoverDepth = 0.05;
    const level1InnerW = w - (roundoverRadius * 2);
    const level1InnerH = h - (roundoverRadius * 2);
    
    const roundoverShape = new THREE.Shape();
    roundoverShape.moveTo(-w / 2, -h / 2);
    roundoverShape.lineTo(w / 2, -h / 2);
    roundoverShape.lineTo(w / 2, h / 2);
    roundoverShape.lineTo(-w / 2, h / 2);
    roundoverShape.lineTo(-w / 2, -h / 2);
    const roundoverHole = new THREE.Path();
    roundoverHole.moveTo(-level1InnerW / 2, -level1InnerH / 2);
    roundoverHole.lineTo(level1InnerW / 2, -level1InnerH / 2);
    roundoverHole.lineTo(level1InnerW / 2, level1InnerH / 2);
    roundoverHole.lineTo(-level1InnerW / 2, level1InnerH / 2);
    roundoverHole.lineTo(-level1InnerW / 2, -level1InnerH / 2);
    roundoverShape.holes.push(roundoverHole);
    const roundoverGeometry = new THREE.ExtrudeGeometry(roundoverShape, { depth: roundoverDepth, bevelEnabled: true, bevelThickness: roundoverRadius * 0.5, bevelSize: roundoverRadius * 0.4, bevelSegments: 6 });
    roundoverGeometry.translate(0, 0, -roundoverDepth);
    fixUVMapping(roundoverGeometry, w, h, x, y, W, H);
    const roundoverMesh = new THREE.Mesh(roundoverGeometry, panelMaterial);
    roundoverMesh.position.set(x, y, -roundoverDepth);
    roundoverMesh.receiveShadow = true;
    group.add(roundoverMesh);

    const deepWidth = 0.2;
    const deepDepth = 0.042;
    const centerPanelW = level1InnerW - (deepWidth * 2);
    const centerPanelH = level1InnerH - (deepWidth * 2);
    const deepShape = new THREE.Shape();
    deepShape.moveTo(-level1InnerW / 2, -level1InnerH / 2);
    deepShape.lineTo(level1InnerW / 2, -level1InnerH / 2);
    deepShape.lineTo(level1InnerW / 2, level1InnerH / 2);
    deepShape.lineTo(-level1InnerW / 2, level1InnerH / 2);
    deepShape.lineTo(-level1InnerW / 2, -level1InnerH / 2);
    const deepHole = new THREE.Path();
    deepHole.moveTo(-centerPanelW / 2, -centerPanelH / 2);
    deepHole.lineTo(centerPanelW / 2, -centerPanelH / 2);
    deepHole.lineTo(centerPanelW / 2, centerPanelH / 2);
    deepHole.lineTo(-centerPanelW / 2, centerPanelH / 2);
    deepHole.lineTo(-centerPanelW / 2, -centerPanelH / 2);
    deepShape.holes.push(deepHole);
    const deepGeometry = new THREE.ExtrudeGeometry(deepShape, { depth: deepDepth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.010, bevelSegments: 4 });
    deepGeometry.translate(0, 0, -deepDepth);
    fixUVMapping(deepGeometry, level1InnerW, level1InnerH, x, y, W, H);
    const deepMesh = new THREE.Mesh(deepGeometry, grooveMaterial);
    deepMesh.position.set(x, y, -roundoverDepth - deepDepth);
    deepMesh.receiveShadow = true;
    group.add(deepMesh);

    const raisedHeight = roundoverDepth + deepDepth;
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-centerPanelW / 2, -centerPanelH / 2);
    centerShape.lineTo(centerPanelW / 2, -centerPanelH / 2);
    centerShape.lineTo(centerPanelW / 2, centerPanelH / 2);
    centerShape.lineTo(-centerPanelW / 2, centerPanelH / 2);
    centerShape.lineTo(-centerPanelW / 2, -centerPanelH / 2);
    const centerGeometry = new THREE.ExtrudeGeometry(centerShape, { depth: 0.001, bevelEnabled: true, bevelThickness: raisedHeight - 0.001, bevelSize: 0.13, bevelSegments: 1 });
    centerGeometry.translate(0, 0, -raisedHeight);
    fixUVMapping(centerGeometry, centerPanelW, centerPanelH, x, y, W, H);
    const centerMesh = new THREE.Mesh(centerGeometry, baseMaterial);
    centerMesh.position.set(x, y, 0);
    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    group.add(centerMesh);

    // --- Create 11 shallow rectangular grooves that cut INTO the panel surface ---
    const numGrooves = 11;
    const grooveSpacing = centerPanelW / (numGrooves + 1);
    const grooveWidth = 0.015;
    const grooveHeight = centerPanelH * 0.95; // Make slightly shorter to fit within the panel
    const grooveDepth = 0.01;                 // A very shallow cut (1% of depth)

    const grooveGeometry = new THREE.BoxGeometry(grooveWidth, grooveHeight, grooveDepth);

    for (let i = 1; i <= numGrooves; i++) {
      const grooveMesh = new THREE.Mesh(grooveGeometry, grooveMaterial);

      const grooveX = x - centerPanelW / 2 + (i * grooveSpacing);
      
      // Position the groove to be half-way INSIDE the panel's front face (z=0)
      const grooveZ = -grooveDepth / 2 + 0.0001; // Tiny offset to prevent visual glitches

      grooveMesh.position.set(grooveX, y, grooveZ);
      grooveMesh.receiveShadow = true;
      group.add(grooveMesh);
    }
  });
  
  return group;
}