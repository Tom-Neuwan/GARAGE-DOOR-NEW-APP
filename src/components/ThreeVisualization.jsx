// src/components/ThreeVisualization.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import SimpleOrbitControls from '../controls/SimpleOrbitControls';

/* -------------------------- tunables (scene units ~ ft) -------------------------- */
const SLAB_THICKNESS = 0.167;        // 2" door thickness in feet
const PANEL_RECESS_DEPTH = 0.133;    // 1.6" total panel area cut from door front
const VCARVE_DEPTH = 0.042;          // V-carve transition depth (0.5")
const GROOVE_WIDTH = 0.021;          // Main groove width between sections
const GROOVE_DEPTH = 0.025;          // Main groove depth

/* ------------------------------ camera utility ------------------------------ */
const fitCameraToObjects = (camera, controls, objects, fitOffset = 1.25) => {
  if (!camera || !controls || !objects || !objects.length) return;
  const box = new THREE.Box3();
  objects.forEach(o => box.expandByObject(o));
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = (maxSize / 2) / Math.tan(fov / 2);
  const newDist = Math.max(dist * fitOffset, 0.1);

  controls.target.copy(center);
  camera.position.copy(center.clone().add(new THREE.Vector3(0, 0, newDist)));
  camera.near = newDist / 100;
  camera.far  = newDist * 100;
  camera.updateProjectionMatrix();

  controls.minDistance = newDist / 4;
  controls.maxDistance = newDist * 4;
  controls.update();
};

/* ----------------------- create door with carved panels ----------------------- */
function buildMilledGarageDoor({ W, H, baseMaterial, grooveMaterial, panelMaterial, textures }) {
  const group = new THREE.Group();
  
  // Calculate sections (4 sections for garage door)
  const sections = 4;
  const sectionHeight = H / sections;
  
  // Create the main door shape with holes for panels
  const doorShape = new THREE.Shape();
  doorShape.moveTo(-W/2, -H/2);
  doorShape.lineTo(W/2, -H/2);
  doorShape.lineTo(W/2, H/2);
  doorShape.lineTo(-W/2, H/2);
  doorShape.lineTo(-W/2, -H/2);
  
  // Add holes for each panel
  const panelPositions = [];
  for (let section = 0; section < sections; section++) {
    const sectionY = (section - (sections - 1) / 2) * sectionHeight;
    
    for (let side = 0; side < 2; side++) {
      const panelWidth = W * 0.4;    // 40% of door width
      const panelHeight = sectionHeight * 0.8;  // 80% of section height
      const panelX = (side === 0 ? -1 : 1) * (W / 4);
      
      panelPositions.push({ x: panelX, y: sectionY, w: panelWidth, h: panelHeight });
      
      // Create hole for this panel
      const hole = new THREE.Path();
      hole.moveTo(panelX - panelWidth/2, sectionY - panelHeight/2);
      hole.lineTo(panelX + panelWidth/2, sectionY - panelHeight/2);
      hole.lineTo(panelX + panelWidth/2, sectionY + panelHeight/2);
      hole.lineTo(panelX - panelWidth/2, sectionY + panelHeight/2);
      hole.lineTo(panelX - panelWidth/2, sectionY - panelHeight/2);
      doorShape.holes.push(hole);
    }
  }
  
  // Create the door frame with holes (this creates the walls around panels)
  const doorFrameGeometry = new THREE.ExtrudeGeometry(doorShape, {
    depth: SLAB_THICKNESS,
    bevelEnabled: false
  });
  doorFrameGeometry.translate(0, 0, -SLAB_THICKNESS);
  
  const doorFrameMesh = new THREE.Mesh(doorFrameGeometry, baseMaterial);
  doorFrameMesh.castShadow = true;
  doorFrameMesh.receiveShadow = true;
  group.add(doorFrameMesh);
  
  // Create FLAT BACK of door (white/light colored)
  const backMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#F8F8F8'), // Light color for back
    map: textures?.color || null,
    normalMap: textures?.normal || null,
    roughnessMap: textures?.rough || null,
    aoMap: textures?.ao || null,
    roughness: 0.8,
    metalness: 0.05,
  });
  
  const backGeometry = new THREE.BoxGeometry(W, H, 0.005);
  const backMesh = new THREE.Mesh(backGeometry, backMaterial);
  backMesh.position.z = -SLAB_THICKNESS - 0.0025;
  backMesh.receiveShadow = true;
  group.add(backMesh);
  
  // Create grooves between sections
  for (let i = 1; i < sections; i++) {
    const grooveY = (i - sections / 2) * sectionHeight + sectionHeight / 2;
    
    const grooveShape = new THREE.Shape();
    grooveShape.moveTo(-W/2 * 0.98, grooveY - GROOVE_WIDTH/2);
    grooveShape.lineTo(W/2 * 0.98, grooveY - GROOVE_WIDTH/2);
    grooveShape.lineTo(W/2 * 0.98, grooveY + GROOVE_WIDTH/2);
    grooveShape.lineTo(-W/2 * 0.98, grooveY + GROOVE_WIDTH/2);
    grooveShape.lineTo(-W/2 * 0.98, grooveY - GROOVE_WIDTH/2);
    
    const grooveGeometry = new THREE.ExtrudeGeometry(grooveShape, {
      depth: GROOVE_DEPTH,
      bevelEnabled: false
    });
    grooveGeometry.translate(0, 0, -GROOVE_DEPTH);
    
    const grooveMesh = new THREE.Mesh(grooveGeometry, grooveMaterial);
    grooveMesh.position.z = -SLAB_THICKNESS + GROOVE_DEPTH;
    grooveMesh.receiveShadow = true;
    group.add(grooveMesh);
  }
  
  // Create center vertical groove
  const centerGrooveShape = new THREE.Shape();
  centerGrooveShape.moveTo(-GROOVE_WIDTH/2, -H/2 * 0.98);
  centerGrooveShape.lineTo(GROOVE_WIDTH/2, -H/2 * 0.98);
  centerGrooveShape.lineTo(GROOVE_WIDTH/2, H/2 * 0.98);
  centerGrooveShape.lineTo(-GROOVE_WIDTH/2, H/2 * 0.98);
  centerGrooveShape.lineTo(-GROOVE_WIDTH/2, -H/2 * 0.98);
  
  const centerGrooveGeometry = new THREE.ExtrudeGeometry(centerGrooveShape, {
    depth: GROOVE_DEPTH,
    bevelEnabled: false
  });
  centerGrooveGeometry.translate(0, 0, -GROOVE_DEPTH);
  
  const centerGrooveMesh = new THREE.Mesh(centerGrooveGeometry, grooveMaterial);
  centerGrooveMesh.position.z = -SLAB_THICKNESS + GROOVE_DEPTH;
  centerGrooveMesh.receiveShadow = true;
  group.add(centerGrooveMesh);
  
 // Create multi-level panels CARVED INTO the door material
panelPositions.forEach(({ x, y, w, h }) => {
    // ALL GEOMETRY MUST BE RECESSED INTO THE DOOR (NEGATIVE Z FROM SURFACE)
    
    // Level 1: Roundover edge transition
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
    
    const roundoverMesh = new THREE.Mesh(roundoverGeometry, panelMaterial);
    roundoverMesh.position.set(x, y, -roundoverDepth);
    roundoverMesh.receiveShadow = true;
    group.add(roundoverMesh);
    
    
    // Level 2: Deep recessed flat area
    const deepWidth = 0.14;
    const deepDepth = 0.042;
    // FIXED: Added the overlap constant to prevent visual seams.
    const overlap = 0.001; 
    
    const deepShape = new THREE.Shape();
    // FIXED: Make the shape slightly larger with the overlap value.
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
    
    const deepMesh = new THREE.Mesh(deepGeometry, grooveMaterial);
    deepMesh.position.set(x, y, -roundoverDepth - deepDepth);
    deepMesh.receiveShadow = true;
    group.add(deepMesh);
    
    // Level 3: Center raised panel
    const raisedHeight = roundoverDepth + deepDepth;
    
    const centerShape = new THREE.Shape();
    centerShape.moveTo(-centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, -centerPanelH/2);
    centerShape.lineTo(centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, centerPanelH/2);
    centerShape.lineTo(-centerPanelW/2, -centerPanelH/2);
    
    const centerGeometry = new THREE.ExtrudeGeometry(centerShape, {
        depth: raisedHeight,
        bevelEnabled: true,
        bevelThickness: 0.010,
        bevelSize: 0.090,
        bevelSegments: 1
    });
    
    // FIXED: This crucial line was missing. It moves the geometry before creating the mesh.
    centerGeometry.translate(0, 0, -raisedHeight);
  
    const centerMesh = new THREE.Mesh(centerGeometry, baseMaterial);
    // This positioning logic is now correct because the geometry has been translated.
    centerMesh.position.set(x, y, -roundoverDepth - deepDepth + raisedHeight);
    centerMesh.castShadow = true;
    centerMesh.receiveShadow = true;
    group.add(centerMesh);
  });
  
  return group;
}

/* -------------------------------- component -------------------------------- */
export default function ThreeVisualization({ config, is3D }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const doorGroupRef = useRef(null);
  const controlsRef = useRef(null);
  const animationIdRef = useRef(null);

  // texture cache
  const tex = useRef(null);
  if (!tex.current) {
    const L = new THREE.TextureLoader();
    const make = (p) => (p ? L.load(p, t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; }) : null);
    tex.current = {
      color: make('/textures/Wood059_2K-JPG_Color.jpg'),
      normal: make('/textures/Wood059_2K-JPG_NormalGL.jpg'),
      rough:  make('/textures/Wood059_2K-JPG_Roughness.jpg'),
      ao:     make('/textures/Wood059_2K-JPG_AmbientOcclusion.jpg'),
    };
  }

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde2e7);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, el.clientWidth / el.clientHeight, 0.01, 1000);
    camera.position.set(0, 2.5, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new SimpleOrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Enhanced lighting to show depth and carved details
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    
    // Strong key light from front-left to show depth
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(-10, 8, 15);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -15;
    keyLight.shadow.camera.right = 15;
    keyLight.shadow.camera.top = 15;
    keyLight.shadow.camera.bottom = -15;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(10, 5, 8);
    scene.add(fillLight);
    
    // Top light to illuminate recessed areas
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
    topLight.position.set(0, 15, 5);
    scene.add(topLight);

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.18 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -5;
    ground.receiveShadow = true;
    scene.add(ground);

    const doorGroup = new THREE.Group();
    scene.add(doorGroup);
    doorGroupRef.current = doorGroup;

    const tick = () => {
      animationIdRef.current = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) {
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        fitCameraToObjects(camera, controls, [doorGroupRef.current]);
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationIdRef.current);
      controls.dispose?.();
      renderer.dispose?.();
      if (renderer.domElement && el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // build / rebuild door
  useEffect(() => {
    const doorGroup = doorGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!doorGroup || !camera || !controls) return;

    // clear
    while (doorGroup.children.length) {
      const obj = doorGroup.children.pop();
      obj.traverse?.(c => {
        if (c.isMesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material?.dispose();
        }
      });
      obj.parent?.remove(obj);
    }

    const { width, height, style, colorIndex } = config || {};
    const W = (width || 192) / 12;  // Convert inches to feet
    const H = (height || 84) / 12;
    
    // Get color from config
    const colors = [
      '#F5F5F5', '#F0EAD6', '#D8CDBA', '#8B4513', '#36454F', '#222222'
    ];
    const doorColor = new THREE.Color(colors[colorIndex] || colors[3]);

    // texture tiling
    if (tex.current.color) {
      const repX = Math.max(1, Math.round(W * 1.5));
      const repY = Math.max(1, Math.round(H * 1.0));
      [tex.current.color, tex.current.normal, tex.current.rough, tex.current.ao].forEach(t => {
        if (!t) return;
        t.repeat.set(repX, repY);
        t.anisotropy = 8;
        t.needsUpdate = true;
      });
    }

    // Materials with proper depth variations
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: doorColor.clone(),
      map: tex.current.color || null,
      normalMap: tex.current.normal || null,
      roughnessMap: tex.current.rough || null,
      aoMap: tex.current.ao || null,
      roughness: 0.8,
      metalness: 0.05,
    });

    const grooveMaterial = new THREE.MeshStandardMaterial({
      color: doorColor.clone().multiplyScalar(0.6),
      map: tex.current.color || null,
      normalMap: tex.current.normal || null,
      roughnessMap: tex.current.rough || null,
      aoMap: tex.current.ao || null,
      roughness: 0.9,
      metalness: 0.05,
    });

    const panelMaterial = new THREE.MeshStandardMaterial({
      color: doorColor.clone().multiplyScalar(0.7),
      map: tex.current.color || null,
      normalMap: tex.current.normal || null,
      roughnessMap: tex.current.rough || null,
      aoMap: tex.current.ao || null,
      roughness: 0.85,
      metalness: 0.05,
    });

    if (style === 'Raised Panel') {
      const door = buildMilledGarageDoor({
        W, H,
        baseMaterial,
        grooveMaterial,
        panelMaterial,
        textures: tex.current
      });
      doorGroup.add(door);
    } else {
      // Simple flat door for other styles
      const simpleGeometry = new THREE.BoxGeometry(W, H, SLAB_THICKNESS);
      simpleGeometry.translate(0, 0, -SLAB_THICKNESS / 2);
      const simpleMesh = new THREE.Mesh(simpleGeometry, baseMaterial);
      simpleMesh.castShadow = true;
      simpleMesh.receiveShadow = true;
      doorGroup.add(simpleMesh);
    }

    // center & fit
    const box = new THREE.Box3().setFromObject(doorGroup);
    const center = box.getCenter(new THREE.Vector3());
    doorGroup.position.sub(center);
    if (typeof controls.reset === 'function') controls.reset();
    fitCameraToObjects(camera, controls, [doorGroup]);
  }, [config, is3D]);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.enabled = !!is3D;
  }, [is3D]);

  const handleZoom = (d) => controlsRef.current?.zoom?.(d);

  return (
    <div className="w-full h-full relative">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={() => handleZoom(5)}
          className="w-10 h-10 bg-white/70 rounded-full text-2xl font-bold flex items-center justify-center shadow-md hover:bg-white"
        >-</button>
        <button
          onClick={() => handleZoom(-5)}
          className="w-10 h-10 bg-white/70 rounded-full text-2xl font-bold flex items-center justify-center shadow-md hover:bg-white"
        >+</button>
      </div>
    </div>
  );
}