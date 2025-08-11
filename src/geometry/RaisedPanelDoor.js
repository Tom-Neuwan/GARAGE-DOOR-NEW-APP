import * as THREE from 'three';

/**
 * Creates a 3D model of a raised panel garage door.
 * The model consists of a base plane (for grooves) and extruded, beveled panels placed on top.
 * @param {object} options - The configuration options for the door.
 * @param {number} options.width - Total width of the door.
 * @param {number} options.height - Total height of the door.
 * @param {number} options.rows - Number of horizontal rows of panels.
 * @param {number} options.columns - Number of vertical columns of panels.
 * @param {THREE.Material} options.baseMaterial - Material for the main raised panels.
 * @param {THREE.Material} options.grooveMaterial - Material for the recessed grooves between panels.
 * @param {number} options.panelDepth - The extrusion depth of the raised panels.
 * @param {number} options.grooveThickness - The thickness of the grooves separating the panels.
 * @returns {THREE.Group} A Three.js Group containing the complete door model, centered at the origin.
 */
export function createRaisedPanelDoor({
  width,
  height,
  rows,
  columns,
  baseMaterial,
  grooveMaterial,
  panelDepth,
  grooveThickness
}) {

  const doorGroup = new THREE.Group();

  // Base Plane (grooves)
  const baseDepth = 0.05;
  const baseGeometry = new THREE.BoxGeometry(width, height, baseDepth);
  const baseMesh = new THREE.Mesh(baseGeometry, grooveMaterial);
  baseMesh.position.z = -baseDepth / 2;
  doorGroup.add(baseMesh);

  // Panel sizes
  const cellWidth = width / columns;
  const cellHeight = height / rows;

  const panelWidth = cellWidth - grooveThickness;
  const panelHeight = cellHeight - grooveThickness;

  // Panel shape & extrusion (beveled)
  const panelShape = new THREE.Shape();
  panelShape.moveTo(-panelWidth / 2, -panelHeight / 2);
  panelShape.lineTo(panelWidth / 2, -panelHeight / 2);
  panelShape.lineTo(panelWidth / 2, panelHeight / 2);
  panelShape.lineTo(-panelWidth / 2, panelHeight / 2);
  panelShape.lineTo(-panelWidth / 2, -panelHeight / 2);

  const extrudeSettings = {
    steps: 2,
    depth: panelDepth,
    bevelEnabled: true,
    bevelThickness: 0.08,
    bevelSize: 0.06,
    bevelSegments: 3
  };

  const panelGeometry = new THREE.ExtrudeGeometry(panelShape, extrudeSettings);

  // Create and position each panel
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const panelMesh = new THREE.Mesh(panelGeometry, baseMaterial);
      const x = (c - (columns - 1) / 2) * cellWidth;
      const y = (r - (rows - 1) / 2) * cellHeight;
      panelMesh.position.set(x, y, 0);
      doorGroup.add(panelMesh);
    }
  }

  return doorGroup;
}
