import * as THREE from 'three';
import { createCarriageHouseFront } from './CarriageHouseFront.js';
import { createBackPanel } from '../BackPanel.js';

export function buildCarriageHouseDoor({ W, H, baseMaterial, panelMaterial, grooveMaterial, trimMaterial, backMaterial, vGrooveMaterial }) {
  const group = new THREE.Group();

  const SLAB_THICKNESS = 0.167;
  const BEVEL_SIZE = 0.01;
  const SECTION_GAP = (BEVEL_SIZE * 2) + 0.005;

  // Logic to determine the number of sections based on height
  let numSections;
  if (H < 8) {        // For doors UNDER 8' high
    numSections = 4;
  } else if (H < 9) { // For doors 8' to 10' high
    numSections = 5;
  } else {              // For taller doors
    numSections = 6;
  }

  const totalGapHeight = (numSections - 1) * SECTION_GAP;
  const sectionHeight = (H - totalGapHeight) / numSections;

  // Loop to create and assemble each section
  for (let i = 0; i < numSections; i++) {
    const sectionY = (i - (numSections - 1) / 2) * (sectionHeight + SECTION_GAP);

    // Create the front geometry for this section
    const frontSection = createCarriageHouseFront({
      W,
      sectionHeight,
      baseMaterial,
      panelMaterial,
      grooveMaterial,
      trimMaterial,
      totalDoorH: H,
      offsetY: sectionY
    });
    frontSection.position.y = sectionY;
    group.add(frontSection);

    // Create the back panel for this section
    const backSection = createBackPanel({
      W,
      sectionHeight,
      backMaterial
    });
    backSection.position.set(0, sectionY, -SLAB_THICKNESS);
    group.add(backSection);

    // Add a shadow object in the gap *above* the current section
    if (i < numSections - 1) {
      const shadowGeo = new THREE.BoxGeometry(W, SECTION_GAP * 0.9, 0.01);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.65
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);

      const gapCenterY = sectionY + (sectionHeight / 2) + (SECTION_GAP / 2);
      shadowMesh.position.set(0, gapCenterY, -0.01);
      group.add(shadowMesh);
    }
  }

  return group;
}