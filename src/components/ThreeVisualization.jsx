import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import SimpleOrbitControls from '../controls/SimpleOrbitControls';
import TextureFactory from '../textures/TextureFactory';
import { PANEL_HEIGHT_INCHES, DOOR_COLORS } from '../constants/doorConstants';

const fitCameraToObjects = (camera, controls, objects, fitOffset = 1.2) => {
    if (!camera || !controls || !objects || objects.length === 0) return 0;
    
    const box = new THREE.Box3();
    for (const obj of objects) {
        box.expandByObject(obj);
    }

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    if (size.x === 0 && size.y === 0 && size.z === 0) return 0;

    const maxSize = Math.max(size.x, size.y);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);

    controls.target.copy(center);

    const direction = controls.target.clone().sub(camera.position).normalize().multiplyScalar(distance);
    camera.position.copy(controls.target).sub(direction);
    
    controls.minDistance = distance / 2;
    controls.maxDistance = distance * 2;
    controls.spherical.radius = distance;
    controls.update();

    return distance;
};


export default function ThreeVisualization({ config, is3D }) {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const doorGroupRef = useRef(null);
    const controlsRef = useRef(null);
    const animationIdRef = useRef(null);

    useEffect(() => {
        const currentMount = mountRef.current;
        if (!currentMount) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xdde2e7);
        scene.fog = new THREE.Fog(0xdde2e7, 40, 100);
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.set(0, 5, 25);
        cameraRef.current = camera;

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        currentMount.appendChild(renderer.domElement);
        rendererRef.current = renderer;
        
        const controls = new SimpleOrbitControls(camera, renderer.domElement);
        controlsRef.current = controls;

        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemiLight.position.set(0, 20, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(-15, 20, 15);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.left = -20;
        dirLight.shadow.camera.right = 20;
        dirLight.shadow.camera.top = 20;
        dirLight.shadow.camera.bottom = -20;
        scene.add(dirLight);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.ShadowMaterial({ opacity: 0.25 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        const doorGroup = new THREE.Group();
        scene.add(doorGroup);
        doorGroupRef.current = doorGroup;
        
        const animate = () => {
            animationIdRef.current = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0];
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
                renderer.setSize(width, height);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                fitCameraToObjects(camera, controls, [doorGroupRef.current]);
            }
        });
        resizeObserver.observe(currentMount);

        return () => {
            resizeObserver.disconnect();
            if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
            if (controlsRef.current) controlsRef.current.dispose();
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            if (rendererRef.current) rendererRef.current.dispose();
        };
    }, []);

    useEffect(() => {
        const doorGroup = doorGroupRef.current;
        const controls = controlsRef.current;
        const camera = cameraRef.current;
        if (!doorGroup || !controls || !camera) return;

        controls.enabled = is3D;
        if (!is3D) {
            controls.resetView(); // A new helper method in SimpleOrbitControls might be cleaner
        }

        while (doorGroup.children.length > 0) {
            const obj = doorGroup.children[0];
            doorGroup.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => {
                        if (m.map) m.map.dispose();
                        m.dispose();
                    });
                } else {
                    if (obj.material.map) obj.material.map.dispose();
                    obj.material.dispose();
                }
            }
        }

        const { width, height, style, colorIndex, windowStyle, hardwareStyle } = config;
        const doorWidth = width / 12;
        const doorHeight = height / 12;
        const panelCount = Math.round(height / PANEL_HEIGHT_INCHES);
        const panelH = doorHeight / panelCount;

        const doorColor = DOOR_COLORS[colorIndex].value;
        const isWood = DOOR_COLORS[colorIndex].name === 'Wood Grain';
        const baseMaterial = new THREE.MeshStandardMaterial({
            color: isWood ? 0xffffff : doorColor,
            map: isWood ? TextureFactory.createWoodTexture(doorColor) : null,
            roughness: isWood ? 0.8 : 0.6,
            metalness: isWood ? 0.0 : 0.2,
        });

        const windowMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.1,
            metalness: 0.8,
            transparent: true,
            opacity: 0.8,
        });

        // Door building logic... (same as before)
        for (let i = 0; i < panelCount; i++) {
            const y = (i - (panelCount - 1) / 2) * panelH;
            const panelGeometry = new THREE.BoxGeometry(doorWidth, panelH * 0.98, 0.2);
            const panelMesh = new THREE.Mesh(panelGeometry, baseMaterial);
            panelMesh.position.set(0, y, 0);
            panelMesh.castShadow = true;
            panelMesh.receiveShadow = true;
            doorGroup.add(panelMesh);
            if (style === 'Raised Panel') {
                const center = new THREE.Mesh(new THREE.BoxGeometry(doorWidth - 0.6, panelH - 0.6, 0.1), baseMaterial);
                center.position.set(0, y, 0.15);
                doorGroup.add(center);
            }
            if (style === 'Carriage House' || style === 'Modern Steel') {
                const overlayMat = baseMaterial.clone();
                overlayMat.color.multiplyScalar(isWood ? 0.85 : 1);
                const railH = style === 'Modern Steel' ? 0.05 : 0.3;
                const stileW = style === 'Modern Steel' ? doorWidth : 0.3;
                const topRail = new THREE.Mesh(new THREE.BoxGeometry(stileW, railH, 0.1), overlayMat);
                topRail.position.set(0, y + panelH / 2 - railH / 2, 0.15);
                doorGroup.add(topRail);
                const bottomRail = new THREE.Mesh(new THREE.BoxGeometry(stileW, railH, 0.1), overlayMat);
                bottomRail.position.set(0, y - panelH / 2 + railH / 2, 0.15);
                doorGroup.add(bottomRail);
                if (style === 'Carriage House') {
                    const leftStile = new THREE.Mesh(new THREE.BoxGeometry(stileW, panelH, 0.1), overlayMat);
                    leftStile.position.set(-doorWidth / 2 + stileW / 2, y, 0.15);
                    doorGroup.add(leftStile);
                    const rightStile = new THREE.Mesh(new THREE.BoxGeometry(stileW, panelH, 0.1), overlayMat);
                    rightStile.position.set(doorWidth / 2 - stileW / 2, y, 0.15);
                    doorGroup.add(rightStile);
                }
            }
            if (i < panelCount - 1) {
                const lineGeo = new THREE.BoxGeometry(doorWidth, 0.02, 0.21);
                const lineMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 });
                const line = new THREE.Mesh(lineGeo, lineMat);
                line.position.set(0, y + panelH / 2, 0);
                doorGroup.add(line);
            }
            if (windowStyle !== 'None') {
                const hasWindows = (windowStyle.includes('Top Row') && i === panelCount - 1) || (windowStyle === 'Side Verticals');
                if (hasWindows) {
                    const numWindows = windowStyle === 'Top Row (8)' ? 8 : 4;
                    const windowW = doorWidth / (numWindows * 1.5);
                    const windowH = panelH * 0.6;
                    for (let j = 0; j < numWindows; j++) {
                        if (windowStyle === 'Side Verticals' && (j > 0 && j < numWindows - 1)) continue;
                        const spacing = doorWidth / numWindows;
                        const winX = (j - (numWindows - 1) / 2) * spacing;
                        const glass = new THREE.Mesh(new THREE.BoxGeometry(windowW - 0.05, windowH - 0.05, 0.05), windowMaterial);
                        glass.position.set(winX, y, 0.2);
                        doorGroup.add(glass);
                    }
                }
            }
        }
        if (hardwareStyle === 'Handles & Hinges' && style === 'Carriage House') {
            const hardwareMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.4, metalness: 0.8 });
            for (let i = 0; i < panelCount; i += Math.max(1, panelCount - 1)) {
                const y = (i - (panelCount - 1) / 2) * panelH;
                const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.5, 0.05), hardwareMat);
                hinge.position.set(-doorWidth / 2 - 0.15, y, 0.2);
                const hinge2 = hinge.clone();
                hinge2.position.x = doorWidth / 2 + 0.15;
                doorGroup.add(hinge, hinge2);
            }
            const handle = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 16, 100), hardwareMat);
            handle.position.set(0, 0, 0.25);
            doorGroup.add(handle);
        }

        const box = new THREE.Box3().setFromObject(doorGroup);
        const center = box.getCenter(new THREE.Vector3());
        doorGroup.position.sub(center);

        fitCameraToObjects(camera, controls, [doorGroup]);

    }, [config, is3D]);

    const handleZoom = (delta) => {
        if (!controlsRef.current) return;
        controlsRef.current.zoom(delta);
    };

    return (
        <div className="w-full h-full relative">
            <div ref={mountRef} className="w-full h-full" />
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
                <button onClick={() => handleZoom(5)} className="w-10 h-10 bg-white/70 rounded-full text-2xl font-bold flex items-center justify-center shadow-md hover:bg-white transition-colors">-</button>
                <button onClick={() => handleZoom(-5)} className="w-10 h-10 bg-white/70 rounded-full text-2xl font-bold flex items-center justify-center shadow-md hover:bg-white transition-colors">+</button>
            </div>
        </div>
    );
}