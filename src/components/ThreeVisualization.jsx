// src/components/ThreeVisualization.jsx
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import SimpleOrbitControls from '../controls/SimpleOrbitControls';
import { buildRaisedPanelDoor } from '../geometry/RaisedPanelDoor.js';

/* -------------------------- tunables (scene units ~ ft) -------------------------- */
const SLAB_THICKNESS = 0.167;        // 2" door thickness in feet

/* ------------------------------ texture utility ------------------------------ */
const createWoodTexture = (color = '#8b5a2b', width = 512, height = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Base color
  const baseColor = new THREE.Color(color);
  ctx.fillStyle = baseColor.getStyle();
  ctx.fillRect(0, 0, width, height);
  
  // Wood grain lines
  for (let i = 0; i < 200; i++) {
    const darkerColor = baseColor.clone().multiplyScalar(0.7 + Math.random() * 0.2);
    ctx.strokeStyle = `rgba(${Math.floor(darkerColor.r * 255)}, ${Math.floor(darkerColor.g * 255)}, ${Math.floor(darkerColor.b * 255)}, ${Math.random() * 0.3 + 0.1})`;
    ctx.beginPath();
    
    const y = (i / 200) * height + (Math.random() - 0.5) * 20;
    const x1 = Math.random() * width * 0.1;
    const x2 = width - Math.random() * width * 0.1;
    
    ctx.moveTo(x1, y);
    ctx.bezierCurveTo(
      x1 + width * 0.3, y + (Math.random() - 0.5) * 5,
      x1 + width * 0.7, y + (Math.random() - 0.5) * 5,
      x2, y
    );
    ctx.lineWidth = Math.random() * 1.5 + 0.5;
    ctx.stroke();
  }
  
  // Add some vertical grain variation
  for (let i = 0; i < 50; i++) {
    const lighterColor = baseColor.clone().multiplyScalar(1.1 + Math.random() * 0.1);
    ctx.fillStyle = `rgba(${Math.floor(lighterColor.r * 255)}, ${Math.floor(lighterColor.g * 255)}, ${Math.floor(lighterColor.b * 255)}, ${Math.random() * 0.1 + 0.05})`;
    
    const x = Math.random() * width;
    const y = Math.random() * height;
    const w = Math.random() * 30 + 10;
    const h = Math.random() * 100 + 50;
    
    ctx.fillRect(x, y, w, h);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  
  return texture;
};

const createNormalMap = (width = 512, height = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Base normal (neutral blue)
  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, width, height);
  
  // Add some noise for wood texture normal variations
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 40;
    data[i] = Math.max(0, Math.min(255, 128 + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, 128 + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, 255));         // B (keep blue high)
    data[i + 3] = 255; // A
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 16;
  
  return texture;
};

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

  // texture cache with corrected paths and fallbacks
  const texturesRef = useRef(null);
  
  useEffect(() => {
    if (!texturesRef.current) {
      const L = new THREE.TextureLoader();
      
      // Function to load texture with error handling
      const loadTextureWithFallback = (url, fallbackTexture) => {
        return new Promise((resolve) => {
          L.load(
            url,
            (texture) => {
              texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
              texture.anisotropy = 16;
              console.log(`Successfully loaded texture: ${url}`);
              resolve(texture);
            },
            undefined, // onProgress
            (error) => {
              console.warn(`Failed to load texture: ${url}, using fallback`);
              resolve(fallbackTexture);
            }
          );
        });
      };

      // Create fallback textures
      const fallbackColor = createWoodTexture('#8B4513');
      const fallbackNormal = createNormalMap();

      // Load textures with correct nested folder paths
      Promise.all([
        loadTextureWithFallback('/textures/Wood059_2K-JPG/Wood059_2K-JPG_Color.jpg', fallbackColor),
        loadTextureWithFallback('/textures/Wood059_2K-JPG/Wood059_2K-JPG_NormalGL.jpg', fallbackNormal),
        loadTextureWithFallback('/textures/Wood059_2K-JPG/Wood059_2K-JPG_Roughness.jpg', null),
        loadTextureWithFallback('/textures/Wood059_2K-JPG/Wood059_2K-JPG_AmbientOcclusion.jpg', null),
        loadTextureWithFallback('/textures/Wood060_2K-JPG/Wood060_2K-JPG_Color.jpg', fallbackColor),
        loadTextureWithFallback('/textures/Wood060_2K-JPG/Wood060_2K-JPG_NormalGL.jpg', fallbackNormal),
        loadTextureWithFallback('/textures/Wood060_2K-JPG/Wood060_2K-JPG_Roughness.jpg', null),
        loadTextureWithFallback('/textures/Wood060_2K-JPG/Wood060_2K-JPG_AmbientOcclusion.jpg', null),
      ]).then(([
        wood059Color, wood059Normal, wood059Rough, wood059AO,
        wood060Color, wood060Normal, wood060Rough, wood060AO
      ]) => {
        texturesRef.current = {
          wood059: {
            color: wood059Color,
            normal: wood059Normal,
            rough: wood059Rough,
            ao: wood059AO,
          },
          wood060: {
            color: wood060Color,
            normal: wood060Normal,
            rough: wood060Rough,
            ao: wood060AO,
          }
        };
        
        // Trigger a re-render when textures are loaded
        if (doorGroupRef.current) {
          // Force update by clearing and rebuilding the door
          const event = new CustomEvent('texturesLoaded');
          window.dispatchEvent(event);
        }
      });
    }
  }, []);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdde2e7);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, el.clientWidth / el.clientHeight, 0.01, 1000);
    camera.position.set(0, 2.5, 15); 
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

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    
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
    keyLight.shadow.bias = -0.0005; 
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
    fillLight.position.set(10, 5, 8);
    scene.add(fillLight);
    
    const topLight = new THREE.DirectionalLight(0xffffff, 0.6);
    topLight.position.set(0, 15, 5);
    scene.add(topLight);

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

    // Listen for texture loading completion
    const handleTexturesLoaded = () => {
      // Re-trigger door building when textures are loaded
      const event = new CustomEvent('rebuildDoor');
      window.dispatchEvent(event);
    };
    window.addEventListener('texturesLoaded', handleTexturesLoaded);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(animationIdRef.current);
      controls.dispose?.();
      renderer.dispose?.();
      window.removeEventListener('texturesLoaded', handleTexturesLoaded);
      if (renderer.domElement && el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // build / rebuild door
  const rebuildDoor = React.useCallback(() => {
    const doorGroup = doorGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!doorGroup || !camera || !controls) return;

    // Clear previous door
    while (doorGroup.children.length) {
      const obj = doorGroup.children.pop();
      obj.traverse?.(c => {
        if (c.isMesh) {
          c.geometry?.dispose();
          if (Array.isArray(c.material)) {
            c.material.forEach(m => {
              m.map?.dispose();
              m.normalMap?.dispose();
              m.roughnessMap?.dispose();
              m.aoMap?.dispose();
              m.dispose();
            });
          } else {
            c.material.map?.dispose();
            c.material.normalMap?.dispose();
            c.material.roughnessMap?.dispose();
            c.material.aoMap?.dispose();
            c.material.dispose();
          }
        }
      });
      obj.parent?.remove(obj);
    }

    const { width, height, style, colorIndex } = config || {};
    const W = (width || 192) / 12;
    const H = (height || 84) / 12;
    
    const colors = [
      '#F5F5F5', '#F0EAD6', '#D8CDBA', '#8B4513', '#63473d', '#36454F', '#222222'
    ];
    const selectedColorValue = colors[colorIndex] || colors[3];
    const isWoodGrain = colorIndex === 3;
    const isDarkWoodGrain = colorIndex === 4;
    const useTextures = isWoodGrain || isDarkWoodGrain;

    let activeTextures = null;
    if (texturesRef.current) {
      if (isWoodGrain) {
        activeTextures = texturesRef.current.wood059;
      } else if (isDarkWoodGrain) {
        activeTextures = texturesRef.current.wood060;
      }
    }

    // If textures not loaded yet, use procedural fallback
    if (useTextures && !activeTextures) {
      const fallbackColor = createWoodTexture(selectedColorValue);
      const fallbackNormal = createNormalMap();
      activeTextures = {
        color: fallbackColor,
        normal: fallbackNormal,
        rough: null,
        ao: null
      };
    }

    // Texture scaling - use consistent scaling for all parts
    if (useTextures && activeTextures) {
      const textureScaleFactor = 3; // Slightly larger scale for better grain visibility
      const repX = W / textureScaleFactor;
      const repY = H / textureScaleFactor;

      Object.values(activeTextures).forEach(t => {
        if (!t) return;
        t.repeat.set(repX, repY);
        t.anisotropy = rendererRef.current ? rendererRef.current.capabilities.getMaxAnisotropy() : 8;
        t.needsUpdate = true;
      });
    }

    // Create materials - ALL use identical texture settings for consistency
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: useTextures ? 0xffffff : new THREE.Color(selectedColorValue),
      map: useTextures && activeTextures ? activeTextures.color : null,
      normalMap: useTextures && activeTextures ? activeTextures.normal : null,
      roughnessMap: useTextures && activeTextures ? activeTextures.rough : null,
      aoMap: useTextures && activeTextures ? activeTextures.ao : null,
      roughness: useTextures ? 0.9 : 0.8,
      metalness: 0.05,
    });

    // For raised panels, use identical texture settings but vary only roughness slightly
    let grooveMaterial, panelMaterial;
    
    if (style === 'Raised Panel') {
      grooveMaterial = new THREE.MeshStandardMaterial({
        color: useTextures ? 0xffffff : new THREE.Color(selectedColorValue).multiplyScalar(0.6),
        map: useTextures && activeTextures ? activeTextures.color : null,
        normalMap: useTextures && activeTextures ? activeTextures.normal : null,
        roughnessMap: useTextures && activeTextures ? activeTextures.rough : null,
        aoMap: useTextures && activeTextures ? activeTextures.ao : null,
        roughness: useTextures ? 0.95 : 0.9, // Very subtle difference
        metalness: 0.05,
      });

      panelMaterial = new THREE.MeshStandardMaterial({
        color: useTextures ? 0xffffff : new THREE.Color(selectedColorValue).multiplyScalar(0.7),
        map: useTextures && activeTextures ? activeTextures.color : null,
        normalMap: useTextures && activeTextures ? activeTextures.normal : null,
        roughnessMap: useTextures && activeTextures ? activeTextures.rough : null,
        aoMap: useTextures && activeTextures ? activeTextures.ao : null,
        roughness: useTextures ? 0.92 : 0.85, // Very subtle difference
        metalness: 0.05,
      });
    } else {
      grooveMaterial = baseMaterial;
      panelMaterial = baseMaterial;
    }

    const backMaterial = new THREE.MeshStandardMaterial({
      color: 0xf8f8f8,
    });

    if (style === 'Raised Panel') {
      const door = buildRaisedPanelDoor({
        W, H,
        baseMaterial,
        grooveMaterial,
        panelMaterial,
        backMaterial,
      });
      doorGroup.add(door);
    } else {
      const simpleGeometry = new THREE.BoxGeometry(W, H, SLAB_THICKNESS);
      const simpleMesh = new THREE.Mesh(simpleGeometry, baseMaterial);
      simpleMesh.castShadow = true;
      simpleMesh.receiveShadow = true;
      doorGroup.add(simpleMesh);
    }

    const box = new THREE.Box3().setFromObject(doorGroup);
    const center = box.getCenter(new THREE.Vector3());
    doorGroup.position.sub(center);
    if (typeof controls.reset === 'function') controls.reset();
    fitCameraToObjects(camera, controls, [doorGroup]);
  }, [config]);

  useEffect(() => {
    rebuildDoor();
  }, [config, is3D, rebuildDoor]);

  useEffect(() => {
    const handleRebuild = () => rebuildDoor();
    window.addEventListener('rebuildDoor', handleRebuild);
    return () => window.removeEventListener('rebuildDoor', handleRebuild);
  }, [rebuildDoor]);

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