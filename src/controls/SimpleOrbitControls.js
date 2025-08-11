// src/controls/SimpleOrbitControls.js
import * as THREE from 'three';

export default class SimpleOrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 4, 0);

    // zoom limits
    this.minDistance = 10;
    this.maxDistance = 50;

    // spherical state
    this.spherical = new THREE.Spherical(25);
    this.spherical.setFromVector3(camera.position.clone().sub(this.target));

    // input state
    this.isMouseDown = false;
    this.lon = 0;
    this.lat = 0;
    this.previousMouseX = 0;
    this.previousMouseY = 0;

    // external enable switch
    this.enabled = false;

    // bindings
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);
    this.onContextMenu = (e) => e.preventDefault();

    // listeners
    this.domElement.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('mouseleave', this.onMouseLeave);
    this.domElement.addEventListener('wheel', this.onMouseWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  // --- public helpers --------------------------------------------------------

  /** Re-sync internal spherical + target after external camera/target changes. */
  syncFrom(camera = this.camera, target = this.target) {
    this.target.copy(target);
    this.spherical.setFromVector3(camera.position.clone().sub(this.target));
    // derive lon/lat so mouse deltas keep feeling continuous
    const phiDeg = THREE.MathUtils.radToDeg(this.spherical.phi);
    const thetaDeg = THREE.MathUtils.radToDeg(this.spherical.theta);
    this.lat = 90 - phiDeg;
    this.lon = thetaDeg;
  }

  resetView() {
    this.lat = 0;
    this.lon = 0;
    this.spherical.phi = Math.PI / 2;
    this.spherical.theta = 0;
  }

  setZoomLimits(min, max) {
    this.minDistance = min;
    this.maxDistance = max;
    this.spherical.radius = THREE.MathUtils.clamp(this.spherical.radius, min, max);
  }

  zoom(delta) {
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius + delta,
      this.minDistance,
      this.maxDistance
    );
  }

  // --- events ----------------------------------------------------------------

  onMouseDown(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.isMouseDown = true;
    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseMove(event) {
    if (!this.enabled || !this.isMouseDown) return;

    const deltaX = event.clientX - this.previousMouseX;
    const deltaY = event.clientY - this.previousMouseY;

    const sensitivity = 0.4;
    this.lon -= deltaX * sensitivity;
    this.lat -= deltaY * sensitivity;

    this.previousMouseX = event.clientX;
    this.previousMouseY = event.clientY;
  }

  onMouseUp() {
    this.isMouseDown = false;
  }

  onMouseLeave() {
    this.isMouseDown = false;
  }

  onMouseWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    // smoother wheel zoom
    this.zoom(event.deltaY * 0.02);
  }

  // --- lifecycle -------------------------------------------------------------

  update() {
    // clamp pitch
    this.lat = Math.max(-85, Math.min(85, this.lat));
    const targetPhi = THREE.MathUtils.degToRad(90 - this.lat);
    const targetTheta = THREE.MathUtils.degToRad(this.lon);

    // damping
    const dampingFactor = 0.1;
    this.spherical.phi += (targetPhi - this.spherical.phi) * dampingFactor;
    this.spherical.theta += (targetTheta - this.spherical.theta) * dampingFactor;

    // clamp distance
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance
    );

    // apply
    const offset = new THREE.Vector3();
    offset.setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
    this.domElement.removeEventListener('contextmenu', this.onContextMenu);
  }
}
