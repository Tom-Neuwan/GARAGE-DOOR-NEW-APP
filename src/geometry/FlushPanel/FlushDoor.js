import * as THREE from 'three';
import { createBackPanel } from '../BackPanel.js';

export function buildFlushDoor({ W, H, baseMaterial, backMaterial }) {
  const group = new THREE.Group();

  const SLAB_THICKNESS = 0.167;
  // We define a simple gap, as the shadow plane creates the visual groove
  const SECTION_GAP = 0.025; 

  let numSections;
  if (H < 8) numSections = 4;
  else if (H <= 10) numSections = 5;
  else numSections = 6;

  const totalGapHeight = (numSections - 1) * SECTION_GAP;
  const sectionHeight = (H - totalGapHeight) / numSections;

  for (let i = 0; i < numSections; i++) {
    const sectionY = (i - (numSections - 1) / 2) * (sectionHeight + SECTION_GAP);

    // ✅ CREATE THE SECTION FROM A SIMPLE, CLEAN BOX
    const frontGeometry = new THREE.BoxGeometry(W, sectionHeight, SLAB_THICKNESS);
    
    const frontSection = new THREE.Mesh(frontGeometry, baseMaterial);
    frontSection.position.y = sectionY;
    // The BoxGeometry is already centered, so no Z translation is needed
    frontSection.castShadow = true;
    frontSection.receiveShadow = true;
    group.add(frontSection);

    // Position the back panel correctly against the centered front section
    const backSection = createBackPanel({ W, sectionHeight, backMaterial });
    const backPanelThickness = 0.05;
    backSection.position.set(0, sectionY, -SLAB_THICKNESS / 2 - backPanelThickness / 2);
    group.add(backSection);

    // The shadow plane creates the dark line between sections
    if (i < numSections - 1) {
      const shadowGeo = new THREE.BoxGeometry(W, SECTION_GAP * 0.95, 0.01);
      const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.65 });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      const gapCenterY = sectionY + (sectionHeight / 2) + (SECTION_GAP / 2);
      // Position the shadow just in front of the main surface
      shadowMesh.position.set(0, gapCenterY, SLAB_THICKNESS / 2 + 0.001);
      group.add(shadowMesh);
    }
  }

  return group;
}