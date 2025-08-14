// src/components/ThreeVisualization.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import SimpleOrbitControls from '../controls/SimpleOrbitControls';
import { buildRaisedPanelDoor } from '../geometry/RaisedPanelDoor.js';

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
    
    // --- THIS IS THE FIX ---
    // Adjusting the shadow bias prevents shadows from bleeding through thin geometry.
    keyLight.shadow.bias = -0.0005; 
    
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
    
    const backMaterial = new THREE.MeshStandardMaterial({
        color: 0xf8f8f8, // A light grey or white
    });

    if (style === 'Raised Panel') {
      const door = buildRaisedPanelDoor({
        W, H,
        baseMaterial,
        grooveMaterial,
        panelMaterial,
        backMaterial, // Pass the new material
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