import { useEffect, useRef } from 'react';

export default function AudioSpectrum({ audioRef }) {
  const canvasRef = useRef(null);
  const graphRef = useRef(null);
  const disposeRef = useRef(null);

  useEffect(() => {
    window.clearTimeout(disposeRef.current);
    const audio = audioRef.current;
    const canvas = canvasRef.current;
    const paint = canvas.getContext('2d');
    if (!audio || !paint) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let mounted = true;
    let frameId = 0;
    let width = 0;
    let height = 0;
    let last = 0;
    let visible = true;
    let levels = new Float32Array(0);

    // Live: reads the analyser. Otherwise: lets the last bars fall back smoothly.
    function draw(active = false) {
      paint.clearRect(0, 0, width, height);
      const graph = graphRef.current;
      const live = active && graph?.analyser;
      if (live) graph.analyser.getByteFrequencyData(graph.data);
      const count = Math.max(20, Math.min(80, Math.floor(width / 7)));
      if (levels.length !== count) levels = new Float32Array(count);
      const step = width / count;
      const gradient = paint.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, '#630009');
      gradient.addColorStop(.55, '#a4081c');
      gradient.addColorStop(1, '#d51830');
      paint.fillStyle = gradient;
      let peak = 0;
      for (let i = 0; i < count; i++) {
        let amplitude = 0;
        if (live) {
          const binHz = graph.context.sampleRate / graph.analyser.fftSize;
          const low = Math.max(1, Math.floor((45 * (9000 / 45) ** (i / count)) / binHz));
          const high = Math.min(graph.data.length, Math.max(low + 1, Math.ceil((45 * (9000 / 45) ** ((i + 1) / count)) / binHz)));
          for (let bin = low; bin < high; bin++) amplitude += graph.data[bin];
          amplitude = amplitude / Math.max(1, high - low) / 255;
        } else {
          amplitude = levels[i] * .86;
        }
        levels[i] = amplitude;
        peak = Math.max(peak, amplitude);
        const barHeight = Math.max(1, amplitude ** 1.5 * height * .88);
        paint.fillRect(i * step + 1, height - barHeight, Math.max(1, step - 2), barHeight);
      }
      return peak;
    }

    function frame(now) {
      frameId = 0;
      if (!mounted || document.hidden || !visible || motion.matches) return;
      const live = !audio.paused && Boolean(graphRef.current?.analyser);
      if (now - last >= 1000 / 30) {
        last = now;
        // Once paused bars have settled, stop the loop until playback resumes.
        if (draw(live) < .004 && !live) { levels.fill(0); draw(false); return; }
      }
      frameId = requestAnimationFrame(frame);
    }

    function sync() {
      cancelAnimationFrame(frameId);
      frameId = 0;
      last = 0;
      if (mounted && !document.hidden && visible && !motion.matches) {
        frameId = requestAnimationFrame(frame);
      } else {
        levels.fill(0);
        draw(false);
      }
    }

    async function initialize() {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext || !mounted || !audio.currentSrc) return;
      try {
        if (!graphRef.current) graphRef.current = { context: new AudioContext() };
        const graph = graphRef.current;
        if (graph.context.state === 'suspended') await graph.context.resume();
        if (!mounted || graph.context.state !== 'running') return;
        // Connect only after resume succeeds: blocked autoplay must not mute native audio.
        if (!graph.source) {
          graph.analyser = graph.context.createAnalyser();
          graph.analyser.fftSize = 2048;
          graph.analyser.smoothingTimeConstant = .85;
          graph.data = new Uint8Array(graph.analyser.frequencyBinCount);
          graph.source = graph.context.createMediaElementSource(audio);
          graph.source.connect(graph.analyser);
          graph.analyser.connect(graph.context.destination);
        }
        sync();
      } catch {
        // The native player remains usable when visualization is unavailable.
      }
    }

    function resize() {
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      paint.setTransform(ratio, 0, 0, ratio, 0, 0);
      sync();
    }

    function gesture(event) {
      if (event.type === 'keydown' && (event.repeat || !['Enter', ' '].includes(event.key))) return;
      void initialize();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    const intersection = new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); sync(); });
    intersection.observe(canvas);
    audio.addEventListener('play', initialize);
    audio.addEventListener('pause', sync);
    audio.addEventListener('ended', sync);
    document.addEventListener('pointerdown', gesture, { passive: true });
    document.addEventListener('keydown', gesture);
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', sync);
    resize();
    if (!audio.paused) void initialize();

    return () => {
      mounted = false;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      intersection.disconnect();
      audio.removeEventListener('play', initialize);
      audio.removeEventListener('pause', sync);
      audio.removeEventListener('ended', sync);
      document.removeEventListener('pointerdown', gesture);
      document.removeEventListener('keydown', gesture);
      document.removeEventListener('visibilitychange', sync);
      motion.removeEventListener('change', sync);
      // A short deferral preserves the one-source-per-element graph in React Strict Mode.
      disposeRef.current = window.setTimeout(() => {
        const graph = graphRef.current;
        graph?.source?.disconnect();
        graph?.analyser?.disconnect();
        if (graph && graph.context.state !== 'closed') void graph.context.close().catch(() => {});
        graphRef.current = null;
      }, 0);
    };
  }, [audioRef]);

  return <canvas ref={canvasRef} className="audio-spectrum" aria-hidden="true" />;
}
