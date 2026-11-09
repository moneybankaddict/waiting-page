import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import GradientText from './components/GradientText';
import DappledLight from './components/DappledLight';
import AudioSpectrum from './components/AudioSpectrum';
import musicLibrary from 'virtual:music-library';
import { readAudioMetadata } from './audioMetadata';
import { useTypewriterTitle } from './useTypewriterTitle';
import { Button } from '@animate-ui/react/primitives/buttons/button';
import { ReducedMotionConfig, blur, scale, transition, useTempoTransition } from '@animate-ui/react/utils/motion';
import { AnimatePresence, motion } from 'motion/react';
import './styles.css';

// Le premier morceau de public/music est détecté automatiquement par Vite.
const DEFAULT_TRACK = musicLibrary[0];
const GREETINGS = [
  { text: 'hello', kaomoji: '(⌐■_■)' },
  { text: 'hi', kaomoji: '(｡◕‿◕｡)' },
  { text: 'hey', kaomoji: '( ˙꒳˙ )' },
  { text: 'heya', kaomoji: '(ﾉ◕ヮ◕)ﾉ' },
  { text: 'yo', kaomoji: '( •̀ᴗ•́ )' },
  { text: 'hey there', kaomoji: '( ´ ▽ ` )' },
  { text: 'wassup', kaomoji: '(＾▽＾)' },
  { text: 'sup', kaomoji: '(¬‿¬)' },
  { text: 'heyyy', kaomoji: '(づ｡◕‿◕)づ' },
  { text: 'hiya', kaomoji: '(ᵔᴥᵔ)' },
  { text: "what's up", kaomoji: '(｡•̀ᴗ-)✧' },
  { text: 'howdy', kaomoji: '(─‿‿─)' },
  { text: 'heyyo', kaomoji: '( ˘͈ ᵕ ˘͈ )' },
  { text: 'yoo', kaomoji: '(ง •̀_•́)ง' },
  { text: 'hiya pal', kaomoji: '(ﾉ´ヮ`)ﾉ' },
  { text: 'hiii', kaomoji: '(♡˙︶˙♡)' },
];
const GREETING_INTERVAL = 3000;

function RotatingGreeting() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex(current => (current + 1) % GREETINGS.length);
    }, GREETING_INTERVAL);
    return () => window.clearInterval(timer);
  }, []);

  const greeting = GREETINGS[index];

  return <h1 className="greeting">
    <span key={index} className="greeting-line" style={{ '--greeting-duration': `${GREETING_INTERVAL}ms` }}>
      <span className="greeting-word">
        <GradientText colors={['#b45566', '#f0d8dd', '#cb7b8b']} animationSpeed={6} showBorder={false}>
          {greeting.text}
        </GradientText>
      </span>
      <span className="kaomoji">{greeting.kaomoji}</span>
    </span>
  </h1>;
}

function Icon({ name }) {
  return <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'play' && <path d="M8.75 6.32v11.36a.75.75 0 0 0 1.14.64l9.02-5.68a.75.75 0 0 0 0-1.28L9.89 5.68a.75.75 0 0 0-1.14.64Z" fill="currentColor" stroke="none" />}
    {name === 'pause' && <><rect x="7.75" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" stroke="none" /><rect x="13.75" y="6" width="2.5" height="12" rx="1.25" fill="currentColor" stroke="none" /></>}
    {name.startsWith('volume') && <path d="M11 5 6 9H3v6h3l5 4Z" fill="currentColor" />}
    {name === 'volume-low' && <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5" />}
    {name === 'volume-high' && <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 6.5a7.8 7.8 0 0 1 0 11" />}
    {name === 'volume-mute' && <path d="m16 9.5 5 5m0-5-5 5" />}
    {name === 'music' && <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="2" /><ellipse cx="17" cy="16" rx="3" ry="2" /></>}
  </svg>;
}

function volumeIcon(volume, muted) {
  if (muted || volume === 0) return 'volume-mute';
  return volume < .5 ? 'volume-low' : 'volume-high';
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
}

function PlaybackIcon({ playing }) {
  const swap = useTempoTransition(transition.swap);
  return <span className="playback-icon" aria-hidden="true">
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span key={playing ? 'pause' : 'play'}
        initial={{ opacity: 0, scale: scale.icon, filter: blur.icon }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', transition: swap }}
        exit={{ opacity: 0, scale: scale.icon, filter: blur.icon, transition: swap }}>
        <Icon name={playing ? 'pause' : 'play'} />
      </motion.span>
    </AnimatePresence>
  </span>;
}

function AudioPlayer({ audioRef }) {
  const source = DEFAULT_TRACK?.url || '';
  const name = DEFAULT_TRACK?.name || 'Aucun morceau';
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume] = useState(0.5);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [metadata, setMetadata] = useState(null);
  const trackMetadata = metadata?.source === source ? metadata : null;
  const title = trackMetadata?.title || name;
  const artist = trackMetadata?.artist || 'Artiste inconnu';

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    let cancelled = false;
    let coverUrl = '';

    async function loadMetadata() {
      try {
        const response = await fetch(source, { signal: controller.signal });
        if (!response.ok) return;
        const tags = await readAudioMetadata(await response.blob());
        if (cancelled) return;
        if (tags.cover) coverUrl = URL.createObjectURL(tags.cover);
        setMetadata({ source, title: tags.title, artist: tags.artist, coverUrl });
      } catch {
        // Missing or malformed tags should never interrupt playback.
      }
    }

    void loadMetadata();
    return () => {
      cancelled = true;
      controller.abort();
      if (coverUrl) URL.revokeObjectURL(coverUrl);
    };
  }, [source]);

  useEffect(() => { audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { audioRef.current.muted = muted; }, [muted]);
  async function togglePlayback() {
    if (!source) return;
    if (!audioRef.current.paused) return audioRef.current.pause();
    try { await audioRef.current.play(); setError(''); }
    catch { setError('La lecture est indisponible pour le moment.'); }
  }

  const progress = duration ? Math.min(100, time / duration * 100) : 0;

  return <aside className="audio-dock" aria-label="Lecteur audio" data-playing={playing || undefined}>
    <audio ref={audioRef} src={source || undefined} preload="auto" loop
      onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onTimeUpdate={event => setTime(event.currentTarget.currentTime)}
      onLoadedMetadata={event => setDuration(event.currentTarget.duration)}
      onError={() => { setPlaying(false); setError('Ce fichier audio ne peut pas être lu.'); }} />
    <div className="player">
      <AudioSpectrum audioRef={audioRef} />
      <div className="player-main">
        <div className="track-cover">
          <Icon name="music" />
          {trackMetadata?.coverUrl && <img key={trackMetadata.coverUrl} src={trackMetadata.coverUrl} alt={`Pochette de ${title}`} onError={event => { event.currentTarget.style.display = 'none'; }} />}
        </div>
        <div className="track">
          <p className="track-name" title={title}>{title}</p>
          <p className="track-artist" title={source ? artist : undefined}>{source ? artist : '—'}</p>
        </div>
        <button type="button" className="mute-button" onClick={() => setMuted(current => !current)} aria-label={muted ? 'Réactiver le son' : 'Couper le son'} aria-pressed={muted} title={muted ? 'Réactiver le son' : 'Couper le son'}>
          <Icon name={volumeIcon(volume, muted)} />
        </button>
        <Button className="play-button" onClick={togglePlayback} disabled={!source} aria-label={playing ? 'Mettre en pause' : 'Lire la musique'} title={playing ? 'Pause' : 'Lecture'}>
          <PlaybackIcon playing={playing} />
        </Button>
      </div>
      <div className="track-progress">
        <input type="range" className="seek" aria-label="Position dans la musique" min="0" max={Number.isFinite(duration) ? duration : 0} step="0.1" value={time} disabled={!Number.isFinite(duration) || !duration}
          style={{ '--progress': `${progress}%` }}
          onChange={event => { const next = Number(event.target.value); audioRef.current.currentTime = next; setTime(next); }} />
        <span className="time"><span>{formatTime(time)}</span><span className="time-sep">/</span><span>{formatTime(duration)}</span></span>
      </div>
    </div>
    <span className="audio-error" role="status">{error}</span>
  </aside>;
}

// Lecture tentée dès l'ouverture. Si le navigateur bloque le son,
// un écran « click to enter » débloque la musique et lance l'entrée du site.
function App() {
  useTypewriterTitle('twilight');
  const audioRef = useRef(null);
  const [stage, setStage] = useState('idle');

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio?.getAttribute('src')) { setStage('enter'); return; }
    let active = true;
    const fallback = window.setTimeout(() => { if (active) setStage(current => current === 'idle' ? 'gate' : current); }, 2500);
    audio.play().then(
      () => { if (active) setStage('enter'); },
      cause => { if (active) setStage(current => current === 'idle' ? (cause?.name === 'NotAllowedError' ? 'gate' : 'enter') : current); },
    );
    return () => { active = false; window.clearTimeout(fallback); };
  }, []);

  const enter = useCallback(() => {
    setStage('enter');
    audioRef.current?.play().catch(() => {});
  }, []);

  useEffect(() => {
    if (stage !== 'gate') return;
    function onKey(event) {
      if (event.repeat || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      enter();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [stage, enter]);

  return <main className="waiting-page" data-stage={stage}>
    <div className="background" aria-hidden="true">
      <DappledLight />
    </div>
    <div className="greeting-stage">{stage === 'enter' && <RotatingGreeting />}</div>
    <ReducedMotionConfig><AudioPlayer audioRef={audioRef} /></ReducedMotionConfig>
    <button type="button" className="intro" onClick={enter} tabIndex={stage === 'gate' ? 0 : -1} aria-hidden={stage !== 'gate'} aria-label="Click to enter">
      <span className="intro-label">click to enter</span>
      <span className="intro-kaomoji" aria-hidden="true">(ﾉ◕ヮ◕)ﾉ</span>
    </button>
  </main>;
}

createRoot(document.getElementById('root')).render(<App />);
