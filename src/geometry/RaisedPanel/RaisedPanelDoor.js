// src/geometry/RaisedPanelDoor.js
import * as THREE from 'three';
import { createFrontPanel } from './FrontPanel.js';
import { createBackPanel } from '../BackPanel.js';

export function buildRaisedPanelDoor({ W, H, baseMaterial, panelMaterial, grooveMaterial, backMaterial }) {
  const group = new THREE.Group();

  // Create the front of the door from its own file
  const front = createFrontPanel({ W, H, baseMaterial, panelMaterial, grooveMaterial });
  group.add(front);

  // Create the back of the door from its own file
  const back = createBackPanel({ W, H, backMaterial });
  group.add(back);

  return group;
}
