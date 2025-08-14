// src/geometry/RaisedPanelDoor.js
import * as THREE from 'three';

export function buildRaisedPanelDoor({ W, H, baseMaterial, panelMaterial, grooveMaterial, backMaterial }) {
  const group = new THREE.Group();

  // --- Part 1 & 2: Your Working Code for the Front ---
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
  for (let section = 0; section < sections; section++) {
    const sectionY = (section - (sections - 1) / 2) * sectionHeight;
    for (let side = 0; side < 2; side++) {
      const panelWidth = W * 0.4;
      const panelHeight = sectionHeight * 0.8;
      const panelX = (side === 0 ? -1 : 1) * (W / 4);
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

    // --- START OF FINAL CHANGE ---

    // Level 3: Center raised panel with a continuous slope (V-Carve)
    const raisedHeight = roundoverDepth + deepDepth;
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, -centerPanelH/2);
    
    // Create the slope using a standard extrusion with a large bevel
    const centerGeometry = new THREE.ExtrudeGeometry(centerShape, {
        depth: 0.001, // Use a minimal depth for the flat top
        bevelEnabled: true,
        bevelThickness: raisedHeight - 0.001, // The bevel makes up almost the entire height
        bevelSize: 0.13, // Adjust this for the desired slope angle
        bevelSegments: 1
    });

    // IMPORTANT: Translate the entire geometry so its front face is at z=0
    centerGeometry.translate(0, 0, -raisedHeight);
    
    const centerMesh = new THREE.Mesh(centerGeometry, baseMaterial);
    
    // Now that the geometry is correctly translated, we can place its origin at z=0.
    centerMesh.position.set(x, y, 0);

    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    group.add(centerMesh);

    // --- END OF FINAL CHANGE ---
  });
  
  const backPanelThickness = 0.01;
  const backGeometry = new THREE.BoxGeometry(W, H, backPanelThickness);
  const backMesh = new THREE.Mesh(backGeometry, backMaterial);
  backMesh.position.z = -SLAB_THICKNESS - (backPanelThickness / 2);
  backMesh.receiveShadow = true;
  group.add(backMesh);

  return group;
}