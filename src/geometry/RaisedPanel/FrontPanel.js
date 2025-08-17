//frontPanel.js
import * as THREE from 'three';

// Helper function to fix UV mapping for extruded geometries to match door coordinates
const fixUVMapping = (geometry, width, height, offsetX, offsetY, doorWidth, doorHeight) => {
  const uvAttribute = geometry.attributes.uv;
  if (!uvAttribute) return;
  
  const uvArray = uvAttribute.array;
  const positionAttribute = geometry.attributes.position;
  const positionArray = positionAttribute.array;
  
  // Recalculate UVs based on world position relative to the whole door
  for (let i = 0; i < uvArray.length; i += 2) {
    const vertexIndex = i / 2;
    const localX = positionArray[vertexIndex * 3];
    const localY = positionArray[vertexIndex * 3 + 1];
    
    // Convert local coordinates to world coordinates relative to door
    const worldX = localX + offsetX;
    const worldY = localY + offsetY;
    
    // Map world coordinates to door-relative UV coordinates
    uvArray[i] = (worldX + doorWidth/2) / doorWidth;     // U coordinate
    uvArray[i + 1] = (worldY + doorHeight/2) / doorHeight; // V coordinate
  }
  
  uvAttribute.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};

export function createFrontPanel({ W, sectionHeight, baseMaterial, panelMaterial, grooveMaterial, vGrooveMaterial, totalDoorH, offsetY }) {
  const group = new THREE.Group();

  const SLAB_THICKNESS = 0.167;
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-W/2, -sectionHeight/2);
  doorShape.lineTo(W/2, -sectionHeight/2);
  doorShape.lineTo(W/2, sectionHeight/2);
  doorShape.lineTo(-W/2, sectionHeight/2);
  doorShape.lineTo(-W/2, -sectionHeight/2);

  const panelPositions = [];
  
  let columns;
  if (W <= 10) { columns = 2; } 
  else if (W <= 14) { columns = 3; } 
  else { columns = 4; }

  for (let c = 0; c < columns; c++) {
    const cellWidth = W / columns;
    const panelWidth = cellWidth * 0.8;
    const panelHeight = sectionHeight * 0.8;
    
    const panelX = (c - (columns - 1) / 2) * cellWidth;
    const panelY = 0; // Panels are centered in their section

    panelPositions.push({ x: panelX, y: panelY, w: panelWidth, h: panelHeight });
    const hole = new THREE.Path();
    hole.moveTo(panelX - panelWidth/2, panelY - panelHeight/2);
    hole.lineTo(panelX + panelWidth/2, panelY - panelHeight/2);
    hole.lineTo(panelX + panelWidth/2, panelY + panelHeight/2);
    hole.lineTo(panelX - panelWidth/2, panelY + panelHeight/2);
    hole.lineTo(panelX - panelWidth/2, panelY - panelHeight/2);
    doorShape.holes.push(hole);
  }

  const doorFrameGeometry = new THREE.ExtrudeGeometry(doorShape, {
    depth: SLAB_THICKNESS,
    // ✅ Enable the bevel and add these settings
    bevelEnabled: true,
    bevelThickness: 0.01,  // How deep the bevel goes
    bevelSize: 0.007,      // How far from the edge the bevel extends
    bevelSegments: 1,      // 1 segment creates a sharp V-groove
    UVGenerator: {
      generateTopUV: function(geometry, vertices, indexA, indexB, indexC) {
        const a_x = vertices[indexA * 3];
        const a_y = vertices[indexA * 3 + 1];
        const b_x = vertices[indexB * 3];
        const b_y = vertices[indexB * 3 + 1];
        const c_x = vertices[indexC * 3];
        const c_y = vertices[indexC * 3 + 1];

        return [
          new THREE.Vector2((a_x + W/2) / W, (a_y + offsetY + totalDoorH/2) / totalDoorH),
          new THREE.Vector2((b_x + W/2) / W, (b_y + offsetY + totalDoorH/2) / totalDoorH),
          new THREE.Vector2((c_x + W/2) / W, (c_y + offsetY + totalDoorH/2) / totalDoorH)
        ];
      },
      generateSideWallUV: function() {
        return [ new THREE.Vector2(0, 0), new THREE.Vector2(1, 0), new THREE.Vector2(1, 1), new THREE.Vector2(0, 1) ];
      }
    }
  });
  
  doorFrameGeometry.translate(0, 0, -SLAB_THICKNESS);
  const doorFrameMesh = new THREE.Mesh(doorFrameGeometry, baseMaterial);
  doorFrameMesh.castShadow = true;
  doorFrameMesh.receiveShadow = true;
  group.add(doorFrameMesh);

  panelPositions.forEach(({ x, y, w, h }) => {
    const panelWorldY = offsetY + y;
    
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
      depth: roundoverDepth,
      bevelEnabled: true,
      bevelThickness: roundoverRadius * 0.5,
      bevelSize: roundoverRadius * 0.4,
      bevelSegments: 6
    });
    
    roundoverGeometry.translate(0, 0, -roundoverDepth);
    fixUVMapping(roundoverGeometry, w, h, x, panelWorldY, W, totalDoorH);
    
    const roundoverMesh = new THREE.Mesh(roundoverGeometry, baseMaterial);
    roundoverMesh.position.set(x, y, -roundoverDepth);
    roundoverMesh.receiveShadow = true;
    group.add(roundoverMesh);

    // Level 2: Deep recessed flat area
    const deepWidth = 0.2;
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
      depth: deepDepth,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.010,
      bevelSegments: 4
    });
    
    deepGeometry.translate(0, 0, -deepDepth);
    fixUVMapping(deepGeometry, level1InnerW, level1InnerH, x, panelWorldY, W, totalDoorH);
    
    const deepMesh = new THREE.Mesh(deepGeometry, baseMaterial);
    deepMesh.position.set(x, y, -roundoverDepth - deepDepth);
    deepMesh.receiveShadow = true;
    group.add(deepMesh);

    // Level 3: Center raised panel with continuous V-carve slope
    const raisedHeight = roundoverDepth + deepDepth;
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, -centerPanelH/2);
    
    const centerGeometry = new THREE.ExtrudeGeometry(centerShape, {
        depth: 0.001,
        bevelEnabled: true,
        bevelThickness: raisedHeight - 0.001,
        bevelSize: 0.13,
        bevelSegments: 1
    });
    
    centerGeometry.translate(0, 0, -raisedHeight);
    fixUVMapping(centerGeometry, centerPanelW, centerPanelH, x, panelWorldY, W, totalDoorH);
    
    const centerMesh = new THREE.Mesh(centerGeometry, baseMaterial);
    centerMesh.position.set(x, y, 0);
    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    group.add(centerMesh);
  });
  
  return group;
}