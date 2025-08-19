import * as THREE from 'three';
import { createBackPanel } from '../BackPanel.js';

export function buildFlushDoor({ W, H, baseMaterial, backMaterial }) {
  const group = new THREE.Group();
  const SLAB_THICKNESS = 0.167;
  
  // ✅ 1. INCREASE THE GAP SIZE
  const SECTION_GAP = 0.02; // Was 0.01, now wider for a bolder look
  
  let numSections;
  if (H < 8) numSections = 4;
  else if (H <= 10) numSections = 5;
  else numSections = 6;
  
  const totalGapHeight = (numSections - 1) * SECTION_GAP;
  const sectionHeight = (H - totalGapHeight) / numSections;
  
  for (let i = 0; i < numSections; i++) {
    const sectionY = (i - (numSections - 1) / 2) * (sectionHeight + SECTION_GAP);
    
    const frontGeometry = new THREE.BoxGeometry(W, sectionHeight, SLAB_THICKNESS);
    frontGeometry.computeBoundingBox();
    frontGeometry.setAttribute('uv2', new THREE.BufferAttribute(frontGeometry.attributes.uv.array, 2));
    
    const frontSection = new THREE.Mesh(frontGeometry, baseMaterial);
    frontSection.position.y = sectionY;
    frontSection.castShadow = true;
    frontSection.receiveShadow = true;
    group.add(frontSection);
    
    const backSection = createBackPanel({ W, sectionHeight, backMaterial });
    const backPanelThickness = 0.05;
    backSection.position.set(0, sectionY, -SLAB_THICKNESS / 2 - backPanelThickness / 2);
    group.add(backSection);
    
    // ✅ 2. ADD THE SHADOW PLANE BACK
    // This creates the dark, bold line in the gap
    if (i < numSections - 1) {
      const shadowGeo = new THREE.BoxGeometry(W, SECTION_GAP * 0.95, 0.01);
      const shadowMat = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.7 // You can adjust this value for darkness
      });
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      const gapCenterY = sectionY + (sectionHeight / 2) + (SECTION_GAP / 2);
      // Position the shadow just in front of the main surface
      shadowMesh.position.set(0, gapCenterY, SLAB_THICKNESS / 2 + 0.001);
      group.add(shadowMesh);
    }
  }
  
  return group;
}