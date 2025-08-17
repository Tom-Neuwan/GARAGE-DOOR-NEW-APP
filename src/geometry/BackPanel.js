import * as THREE from 'three';

// The exported function is now called createBackPanel again
export function createBackPanel({ W, sectionHeight, backMaterial }) {
  const BACK_PANEL_THICKNESS = 0.05;

  const backGeometry = new THREE.BoxGeometry(W, sectionHeight, BACK_PANEL_THICKNESS);
  const backMesh = new THREE.Mesh(backGeometry, backMaterial);
  
  backMesh.receiveShadow = true;
  
  return backMesh;
}