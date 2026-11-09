import { useEffect } from 'react';

export function useTypewriterTitle(text) {
  useEffect(() => {
    const previousTitle = document.title;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const letters = Array.from(text);
    let timer;
    let length = 0;
    let deleting = false;

    function tick() {
      length += deleting ? -1 : 1;
      document.title = letters.slice(0, length).join('') + (length === letters.length ? '' : '▏');
      let delay = deleting ? 90 : 160;
      if (length === letters.length) {
        deleting = true;
        delay = 1800;
      } else if (length === 0) {
        deleting = false;
        delay = 500;
      }
      timer = window.setTimeout(tick, delay);
    }

    function sync() {
      window.clearTimeout(timer);
      document.title = text;
      if (motion.matches || !letters.length) return;
      length = 0;
      deleting = false;
      timer = window.setTimeout(tick, 350);
    }

    sync();
    motion.addEventListener('change', sync);
    return () => {
      window.clearTimeout(timer);
      motion.removeEventListener('change', sync);
      document.title = previousTitle;
    };
  }, [text]);
}
