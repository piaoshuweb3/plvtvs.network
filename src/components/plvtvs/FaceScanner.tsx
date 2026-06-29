'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAudioEngine } from '@/lib/plvtvs/audioEngine';

// ============================================================
// FaceScanner — real biometric face mesh capture via MediaPipe
//
// Loads MediaPipe FaceLandmarker via dynamic script injection (not
// ESM import) to avoid Turbopack's dynamic-import bundling issue
// with @mediapipe/tasks-vision's vision_bundle.mjs.
//
// - Requests webcam permission (cyberpunk-styled prompt)
// - Renders <video> stream + canvas overlay with face mesh
// - Tracks 468 facial landmarks; draws cyan wireframe + scan line
// - Computes a "bio-hash" from landmark positions → drives pixel avatar
// - Falls back to "matrix fingerprint" mode if user denies camera
// ============================================================

// Type definitions for the dynamically-loaded MediaPipe global
interface MediaPipeWindow extends Window {
  FaceLandmarker?: {
    createFromOptions: (
      vision: unknown,
      options: {
        baseOptions: { modelAssetPath: string; delegate: string };
        runningMode: string;
        numFaces: number;
        minFaceDetectionConfidence: number;
        minFacePresenceConfidence: number;
        minTrackingConfidence: number;
      }
    ) => Promise<FaceLandmarkerInstance>;
  };
  FilesetResolver?: {
    forVisionTasks: (wasmPath: string) => Promise<unknown>;
  };
}

interface FaceLandmarkerInstance {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { faceLandmarks: { x: number; y: number; z: number }[][] };
  close: () => void;
}

interface FaceScannerProps {
  active: boolean;
  onFaceHash: (hash: string) => void;
  onProgress: (pct: number) => void;
}

const MP_SCRIPT_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.mjs';
const MP_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MP_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Singleton loader — only inject script once even if component re-mounts
let mpLoadPromise: Promise<boolean> | null = null;
async function loadMediaPipe(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const mpWindow = window as unknown as MediaPipeWindow;
  if (mpWindow.FaceLandmarker && mpWindow.FilesetResolver) return true;
  if (mpLoadPromise) return mpLoadPromise;

  mpLoadPromise = (async () => {
    try {
      // Use dynamic import() with explicit URL — bypasses Turbopack's
      // static analysis by passing a fully-qualified URL string.
      const mod = await import(/* @vite-ignore */ /* webpackIgnore: true */ MP_SCRIPT_URL);
      // MediaPipe's ESM bundle exports FaceLandmarker + FilesetResolver
      // to window when loaded as a script
      mpWindow.FaceLandmarker = mod.FaceLandmarker || mpWindow.FaceLandmarker;
      mpWindow.FilesetResolver = mod.FilesetResolver || mpWindow.FilesetResolver;
      return !!(mpWindow.FaceLandmarker && mpWindow.FilesetResolver);
    } catch (e) {
      console.warn('[FaceScanner] MediaPipe script load failed:', e);
      return false;
    } finally {
      mpLoadPromise = null;
    }
  })();
  return mpLoadPromise;
}

export default function FaceScanner({ active, onFaceHash, onProgress }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarkerInstance | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'scanning' | 'denied' | 'fallback' | 'done'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Refs to avoid stale closure in render loop
  const statusRef = useRef(status);
  statusRef.current = status;
  const activeRef = useRef(active);
  activeRef.current = active;
  const onFaceHashRef = useRef(onFaceHash);
  onFaceHashRef.current = onFaceHash;
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  // ============================================================
  // Compute a deterministic bio-hash from facial landmark positions
  // ============================================================
  const computeBioHash = useCallback((landmarks: { x: number; y: number; z: number }[]): string => {
    const keyIndices = [1, 33, 263, 61, 291, 199, 0, 17, 152, 234, 454, 10, 9, 84, 314, 168];
    let h = 0;
    for (const idx of keyIndices) {
      const p = landmarks[idx];
      if (!p) continue;
      const x = Math.round(p.x * 1000);
      const y = Math.round(p.y * 1000);
      const z = Math.round(p.z * 1000);
      h = ((h * 31) ^ x) >>> 0;
      h = ((h * 31) ^ y) >>> 0;
      h = ((h * 31) ^ z) >>> 0;
    }
    const fp = (navigator.userAgent + screen.width + 'x' + screen.height).length;
    h = ((h * 31) ^ fp) >>> 0;
    return '0x' + h.toString(16).padStart(8, '0').toUpperCase();
  }, []);

  const computeBioHashRef = useRef(computeBioHash);
  computeBioHashRef.current = computeBioHash;

  // ============================================================
  // Render loop
  // ============================================================
  const renderLoopRef = useRef<(() => void) | null>(null);
  if (renderLoopRef.current === null) {
    renderLoopRef.current = () => {
      if (!activeRef.current || statusRef.current !== 'scanning') return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(renderLoopRef.current!);
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        rafRef.current = requestAnimationFrame(renderLoopRef.current!);
        return;
      }

      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;

      let faceDetected = false;
      let landmarks: { x: number; y: number; z: number }[] | null = null;
      try {
        const result = landmarker.detectForVideo(video, now);
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          faceDetected = true;
          landmarks = result.faceLandmarks[0];
        }
      } catch {
        /* transient */
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      if (faceDetected && landmarks) {
        ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < landmarks.length; i += 4) {
          const p = landmarks[i];
          ctx.moveTo(p.x * canvas.width, p.y * canvas.height);
          ctx.lineTo(
            landmarks[(i + 4) % landmarks.length].x * canvas.width,
            landmarks[(i + 4) % landmarks.length].y * canvas.height
          );
        }
        ctx.stroke();

        ctx.fillStyle = '#00FFCC';
        for (let i = 0; i < landmarks.length; i += 8) {
          const p = landmarks[i];
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }

        if (elapsed > 1.5) {
          const hash = computeBioHashRef.current(landmarks);
          onFaceHashRef.current(hash);
        }
      } else {
        ctx.fillStyle = '#FFCC00';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO FACE DETECTED', canvas.width / 2, canvas.height / 2 - 10);
        ctx.fillStyle = '#666';
        ctx.font = '10px monospace';
        ctx.fillText('ALIGN YOUR FACE WITHIN THE FRAME', canvas.width / 2, canvas.height / 2 + 10);
      }
      ctx.restore();

      // Scan line
      const scanY = ((elapsed * 0.6) % 1) * canvas.height;
      const gradient = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      gradient.addColorStop(0, 'rgba(0, 255, 204, 0)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 204, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, scanY - 20, canvas.width, 40);
      ctx.strokeStyle = '#00FFCC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(canvas.width, scanY);
      ctx.stroke();

      const pct = faceDetected
        ? Math.min(100, Math.max(0, ((elapsed - 0.5) / 3.5) * 100))
        : 0;
      onProgressRef.current(pct);

      if (pct >= 100) {
        setStatus('done');
        getAudioEngine().playQuantumThud();
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        return;
      }

      rafRef.current = requestAnimationFrame(renderLoopRef.current!);
    };
  }
  const renderLoop = renderLoopRef.current;

  // ============================================================
  // Lifecycle
  // ============================================================
  useEffect(() => {
    if (!active) {
      setStatus('idle');
      return;
    }

    let cancelled = false;
    (async () => {
      const mpLoaded = await loadMediaPipe();
      if (cancelled) return;

      const mpWindow = window as unknown as MediaPipeWindow;
      if (!mpLoaded || !mpWindow.FaceLandmarker || !mpWindow.FilesetResolver) {
        setStatus('fallback');
        return;
      }

      try {
        const vision = await mpWindow.FilesetResolver.forVisionTasks(MP_WASM_PATH);
        const landmarker = await mpWindow.FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MP_MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        if (cancelled) {
          landmarker.close();
          return;
        }
        landmarkerRef.current = landmarker;
      } catch (e) {
        console.warn('[FaceScanner] Landmarker init failed:', e);
        setStatus('fallback');
        return;
      }

      // Start camera
      setStatus('requesting');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('scanning');
        startTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(renderLoop);
      } catch (e) {
        console.warn('[FaceScanner] Camera denied:', e);
        setStatus('denied');
        setErrorMsg(e instanceof Error ? e.message : 'Camera permission denied');
        // Fall through to fallback after a brief delay
        setTimeout(() => !cancelled && setStatus('fallback'), 2000);
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {
          /* noop */
        }
        landmarkerRef.current = null;
      }
    };
  }, [active, renderLoop]);

  // ============================================================
  // Fallback mode: matrix fingerprint (no camera)
  // ============================================================
  useEffect(() => {
    if (status !== 'fallback') return;
    const fp = (
      navigator.userAgent +
      screen.width +
      'x' +
      screen.height +
      'x' +
      screen.colorDepth +
      navigator.language
    ).length;
    let h = 0;
    const seed = `plvtvs-fallback-${fp}-${Date.now()}`;
    for (let i = 0; i < seed.length; i++) {
      h = ((h * 31) ^ seed.charCodeAt(i)) >>> 0;
    }
    const hash = '0x' + h.toString(16).padStart(8, '0').toUpperCase();
    onFaceHash(hash);

    let pct = 0;
    const interval = setInterval(() => {
      pct += Math.random() * 8 + 4;
      if (pct >= 100) {
        pct = 100;
        clearInterval(interval);
        onProgress(100);
        getAudioEngine().playQuantumThud();
        setStatus('done');
      } else {
        onProgress(pct);
      }
    }, 120);
    return () => clearInterval(interval);
  }, [status, onFaceHash, onProgress]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <div className="relative w-full max-w-md aspect-square">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00FFCC]" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00FFCC]" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00FFCC]" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00FFCC]" />
        </div>

        {status === 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="cyber-mono text-xs text-[#00FFCC] cyber-flicker">
              <span className="cyber-blink">▊</span> REQUESTING BIO-METRIC ACCESS...
            </div>
          </div>
        )}

        {status === 'denied' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
            <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.3em] mb-3 cyber-flicker">
              {'// CAMERA DENIED'}
            </div>
            <div className="cyber-mono text-[10px] text-[#888] text-center max-w-xs">
              Switching to matrix fingerprint fallback. Your soul will still be encapsulated.
            </div>
          </div>
        )}

        {status === 'fallback' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6">
            <div className="cyber-mono text-xs text-[#FFCC00] tracking-[0.3em] mb-3 cyber-flicker">
              {'// MATRIX FINGERPRINT MODE'}
            </div>
            <div className="cyber-mono text-[10px] text-[#888] text-center mb-4 max-w-xs">
              Generating bio-hash from device fingerprint signature.
            </div>
            <div className="grid grid-cols-8 gap-1 max-w-[200px]">
              {Array.from({ length: 64 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3"
                  style={{
                    background: Math.random() > 0.5 ? '#00FF66' : 'transparent',
                    boxShadow: Math.random() > 0.7 ? '0 0 4px #00FF66' : 'none',
                    animation: `cyber-pulse ${0.5 + Math.random()}s ease-in-out infinite`,
                    animationDelay: `${Math.random()}s`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        <div className="absolute bottom-4 left-4 right-4 cyber-mono text-[9px] text-[#666] flex justify-between">
          <span>
            {status === 'scanning' && '◉ SCANNING BIO-METRIC VECTORS'}
            {status === 'done' && '✓ ENCAPSULATION COMPLETE'}
            {status === 'fallback' && '◉ HASHING DEVICE FINGERPRINT'}
          </span>
          <span>468 LANDMARKS</span>
        </div>
      </div>
    </div>
  );
}
