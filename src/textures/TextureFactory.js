import * as THREE from 'three';

const TextureFactory = {
  createWoodTexture: (color = '#8b5a2b', width = 1024, height = 1024) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const baseColor = new THREE.Color(color);
    ctx.fillStyle = baseColor.getStyle();
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < 400; i++) {
      const darkerColor = baseColor.clone().multiplyScalar(0.85 + Math.random() * 0.1);
      ctx.strokeStyle = `rgba(${darkerColor.r * 255}, ${darkerColor.g * 255}, ${darkerColor.b * 255}, ${Math.random() * 0.15})`;
      ctx.beginPath();
      const x = (Math.random() - 0.5) * width * 0.3;
      const y = i * (height / 400) + (Math.random() - 0.5) * 10;
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + width * 0.4, y, x + width * 0.6, y, x + width * 1.3, y);
      ctx.lineWidth = Math.random() * 2.5 + 1;
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }
};

export default TextureFactory;
