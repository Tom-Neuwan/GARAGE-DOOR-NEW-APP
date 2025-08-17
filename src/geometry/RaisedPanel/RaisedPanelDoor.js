//raisedPanelDoor.js

import * as THREE from 'three';
import { createFrontPanel } from './FrontPanel.js';
import { createBackPanel } from '../BackPanel.js';

export function buildRaisedPanelDoor({ W, H, baseMaterial, panelMaterial, grooveMaterial, backMaterial, vGrooveMaterial }) {
  const group = new THREE.Group();

  const SLAB_THICKNESS = 0.167;
  const BEVEL_SIZE = 0.01;
  const SECTION_GAP = (BEVEL_SIZE * 2) + 0.005;

  let numSections;
  if (H < 8) { numSections = 4; } 
  else if (H < 9) { numSections = 5; } 
  else { numSections = 6; }

  const totalGapHeight = (numSections - 1) * SECTION_GAP;
  const sectionHeight = (H - totalGapHeight) / numSections;

  for (let i = 0; i < numSections; i++) {
    const sectionY = (i - (numSections - 1) / 2) * (sectionHeight + SECTION_GAP);

    // Front section (no changes here)
    const frontSection = createFrontPanel({
      W,
      sectionHeight,
      baseMaterial,
      panelMaterial,
      grooveMaterial,
      totalDoorH: H,
      offsetY: sectionY
    });
    frontSection.position.y = sectionY;
    group.add(frontSection);

    // Back section (no changes here)
    const backSection = createBackPanel({ 
      W, 
      sectionHeight, 
      backMaterial 
    });
    backSection.position.set(0, sectionY, -SLAB_THICKNESS);
    group.add(backSection);

    // ✅ ADD THIS NEW BLOCK TO CREATE THE SHADOW
    // Add a shadow object in the gap *above* the current section
    if (i < numSections - 1) {
      const shadowGeo = new THREE.BoxGeometry(W, SECTION_GAP * 0.9, 0.01);
      // MeshBasicMaterial is not affected by lights
      const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.75 // Adjust this value to make shadow darker/lighter
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);

      // Position it in the center of the gap and push it back slightly
      // so it sits inside the V-groove.
      const gapCenterY = sectionY + (sectionHeight / 2) + (SECTION_GAP / 2);
      shadowMesh.position.set(0, gapCenterY, -0.01);
      
      group.add(shadowMesh);
    }
  }

  return group;
}