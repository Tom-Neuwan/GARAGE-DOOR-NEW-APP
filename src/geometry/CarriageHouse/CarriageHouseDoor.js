import * as THREE from 'three';
import { createCarriageHouseFront } from './CarriageHouseFront.js';
import { createBackPanel } from '../BackPanel.js';

// Update the function signature to accept the new materials
export function buildCarriageHouseDoor({ W, H, baseMaterial, panelMaterial, grooveMaterial, trimMaterial, backMaterial }) {
  const group = new THREE.Group();

  // Pass all the materials to the front panel builder
  const front = createCarriageHouseFront({ W, H, baseMaterial, panelMaterial, grooveMaterial, trimMaterial });
  group.add(front);

  const back = createBackPanel({ W, H, backMaterial });
  group.add(back);

  return group;
}