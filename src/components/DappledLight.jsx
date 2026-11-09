import { useEffect, useRef } from 'react';
import './DappledLight.css';

// Original implementation of window light and foliage shadows.
// Inspired by the public Dappled Light preview, without React Bits Pro code.
export default function DappledLight() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;
    const light = document.createElement('canvas');
    const shadow = document.createElement('canvas');
    const lightContext = light.getContext('2d');
    const shadowContext = shadow.getContext('2d');
    if (!lightContext || !shadowContext) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let frameId = 0;
    let last = 0;
    let time = 0;
    let alive = true;
    let seed = 41;
    const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const branches = Array.from({ length: 9 }, (_, index) => ({
      x: .34 + random() * .6,
      y: .23 + random() * .82,
      phase: random() * Math.PI * 2,
      startY: -.16 + index * .055,
      leaves: Array.from({ length: 15 }, (_, i) => ({
        t: .2 + (i / 15) * .75,
        side: i % 2 ? 1 : -1,
        size: .025 + random() * .025,
        angle: .65 + random() * .45,
      })),
    }));

    function paintLight() {
      lightContext.clearRect(0, 0, width, height);
      lightContext.save();
      const size = Math.min(width * 1.1, height * 1.25);
      lightContext.translate(width * .76, height * .36);
      lightContext.rotate(-.42);
      lightContext.transform(1, 0, -.28, 1, 0, 0);
      const halo = lightContext.createRadialGradient(0, 0, 0, 0, 0, size * .9);
      halo.addColorStop(0, '#6c263d55');
      halo.addColorStop(1, '#6c263d00');
      lightContext.fillStyle = halo;
      lightContext.fillRect(-size, -size, size * 2, size * 2);
      lightContext.filter = 'blur(24px)';
      const beam = lightContext.createLinearGradient(-size * .45, -size * .45, size * .3, size * .5);
      beam.addColorStop(0, '#b5556a80');
      beam.addColorStop(.6, '#8d304755');
      beam.addColorStop(1, '#52132310');
      lightContext.fillStyle = beam;
      const gap = size * .025;
      for (let row = 0; row < 2; row++) {
        for (let column = 0; column < 2; column++) {
          lightContext.fillRect(-size * .43 + column * (size * .38 + gap), -size * .42 + row * (size * .42 + gap), size * .38, size * .42);
        }
      }
      lightContext.restore();
    }

    function draw() {
      shadowContext.clearRect(0, 0, width, height);
      const unit = Math.min(width, height);
      shadowContext.fillStyle = '#000';
      shadowContext.strokeStyle = '#000';
      shadowContext.lineCap = 'round';
      for (const branch of branches) {
        const sway = Math.sin(time * .42 + branch.phase) * .012;
        const startX = width * 1.08;
        const startY = height * branch.startY;
        const endX = width * (branch.x + sway);
        const endY = height * branch.y;
        const controlX = width * (.85 + sway);
        const controlY = height * (branch.y * .2);
        shadowContext.lineWidth = unit * .003;
        shadowContext.beginPath();
        shadowContext.moveTo(startX, startY);
        shadowContext.quadraticCurveTo(controlX, controlY, endX, endY);
        shadowContext.stroke();
        for (const leaf of branch.leaves) {
          const t = leaf.t;
          const x = (1-t)**2 * startX + 2*(1-t)*t * controlX + t*t * endX;
          const y = (1-t)**2 * startY + 2*(1-t)*t * controlY + t*t * endY;
          const angle = Math.atan2((1-t)*(controlY-startY)+t*(endY-controlY), (1-t)*(controlX-startX)+t*(endX-controlX));
          const flutter = Math.sin(time * .65 + t * 5 + branch.phase) * .045;
          shadowContext.save();
          shadowContext.translate(x, y);
          shadowContext.rotate(angle + leaf.side * leaf.angle + flutter);
          const length = leaf.size * unit * (1.2 - t * .4);
          shadowContext.beginPath();
          shadowContext.moveTo(0, 0);
          shadowContext.bezierCurveTo(length * .45, -length * .38, length * .85, -length * .25, length, 0);
          shadowContext.bezierCurveTo(length * .7, length * .32, length * .25, length * .32, 0, 0);
          shadowContext.fill();
          shadowContext.restore();
        }
      }
      context.clearRect(0, 0, width, height);
      context.globalAlpha = .92 + Math.sin(time * .09) * .06;
      context.drawImage(light, 0, 0, width, height);
      context.globalCompositeOperation = 'destination-out';
      context.globalAlpha = .83;
      context.filter = 'blur(7px)';
      context.drawImage(shadow, 0, 0, width, height);
      context.filter = 'none';
      context.globalCompositeOperation = 'source-over';
      context.globalAlpha = 1;
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
      for (const [surface, ctx] of [[canvas, context], [light, lightContext], [shadow, shadowContext]]) {
        surface.width = Math.max(1, Math.round(width * ratio));
        surface.height = Math.max(1, Math.round(height * ratio));
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      }
      paintLight();
      draw();
    }

    function frame(now) {
      frameId = 0;
      if (!alive || document.hidden || motion.matches) return;
      if (now - last > 1000 / 24) {
        const dt = last ? Math.min((now - last) / 1000, .1) : 0;
        time += dt;
        draw();
        last = now;
      }
      frameId = requestAnimationFrame(frame);
    }

    function sync() {
      cancelAnimationFrame(frameId);
      last = 0;
      if (motion.matches) draw();
      else if (!document.hidden) frameId = requestAnimationFrame(frame);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    sync();
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    return () => {
      alive = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
    };
  }, []);

  return <div className="dappled-light"><canvas ref={canvasRef} aria-hidden="true" /></div>;
}
