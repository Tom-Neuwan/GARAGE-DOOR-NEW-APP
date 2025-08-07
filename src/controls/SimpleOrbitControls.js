import * as THREE from 'three';

export default class SimpleOrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3(0, 4, 0);

    this.minDistance = 10;
    this.maxDistance = 50;

    this.spherical = new THREE.Spherical(25);
    this.spherical.setFromVector3(camera.position.clone().sub(this.target));

    this.isMouseDown = false;
    this.lon = 0;
    this.lat = 0;

    this.previousMouseX = 0;
    this.previousMouseY = 0;

    this.enabled = false;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onMouseWheel = this.onMouseWheel.bind(this);

    this.domElement.addEventListener('mousedown', this.onMouseDown);
    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseup', this.onMouseUp);
    this.domElement.addEventListener('wheel', this.onMouseWheel);
  }

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

  zoom(delta) {
    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius + delta,
      this.minDistance,
      this.maxDistance
    );
  }

  onMouseWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    this.zoom(event.deltaY * 0.05);
  }

  resetView() {
    this.lat = 0;
    this.lon = 0;
    this.spherical.phi = Math.PI / 2;
    this.spherical.theta = 0;
  }

  update() {
    this.lat = Math.max(-85, Math.min(85, this.lat));
    const targetPhi = THREE.MathUtils.degToRad(90 - this.lat);
    const targetTheta = THREE.MathUtils.degToRad(this.lon);

    const dampingFactor = 0.1;
    this.spherical.phi += (targetPhi - this.spherical.phi) * dampingFactor;
    this.spherical.theta += (targetTheta - this.spherical.theta) * dampingFactor;

    this.spherical.radius = THREE.MathUtils.clamp(
      this.spherical.radius,
      this.minDistance,
      this.maxDistance
    );

    const offset = new THREE.Vector3();
    offset.setFromSpherical(this.spherical);

    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  dispose() {
    this.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseup', this.onMouseUp);
    this.domElement.removeEventListener('wheel', this.onMouseWheel);
  }
}