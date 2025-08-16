// src/geometry/BackPanel.js
import * as THREE from 'three';

export function createBackPanel({ W, H, backMaterial }) {
  const SLAB_THICKNESS = 0.167; // This must match the thickness in FrontPanel.js

  // Create a solid flat back that covers all holes
  const backShape = new THREE.Shape();
  backShape.moveTo(-W/2, -H/2);
  backShape.lineTo(W/2, -H/2);
  backShape.lineTo(W/2, H/2);
  backShape.lineTo(-W/2, H/2);
  backShape.lineTo(-W/2, -H/2);

  // No holes in the back shape - completely flat
  const backPanelThickness = 0.015;
  const backGeometry = new THREE.ExtrudeGeometry(backShape, {
    depth: backPanelThickness,
    bevelEnabled: false
  });
  backGeometry.translate(0, 0, -backPanelThickness);

  const backMesh = new THREE.Mesh(backGeometry, backMaterial);
  backMesh.position.z = -SLAB_THICKNESS - (backPanelThickness / 2);
  backMesh.receiveShadow = true;
  
  return backMesh;
}
