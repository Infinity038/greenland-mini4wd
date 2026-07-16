'use client';
// Reusable real browser-camera scanner: getUserMedia (rear camera preferred)
// + the native BarcodeDetector Shape Detection API, feature-detected at
// runtime. Used for both product barcodes and racer QR codes — callers pass
// the format list and label. No third-party decoding library is bundled: as
// of now BarcodeDetector covers Chrome/Edge desktop, Android Chrome, and
// Safari 17+ (iOS/macOS); unsupported browsers (e.g. Firefox) get a clear
// fallback message instead of a silently broken camera button.
import { useEffect, useRef, useState } from 'react';
import { getBarcodeDetectorCapability, getCameraCapability, createBarcodeDetector } from '@/lib/scanner/scannerSupport';
import { createDuplicateScanGuard } from '@/lib/scanner/duplicateScanGuard';

const F  = { fontFamily: "'Barlow Condensed', sans-serif" } as const;
const FB = { fontFamily: "'DM Sans', sans-serif" } as const;

type ScanState = 'requesting_permission' | 'scanning' | 'permission_denied' | 'unsupported' | 'error';

export interface CameraScannerModalProps {
  title: string;
  formats: readonly string[];
  onDetected: (code: string) => void;
  onCancel: () => void;
}

// Capability is decided once, synchronously, before the component ever
// renders — so the effect that follows only ever performs genuinely async
// work (getUserMedia) and calls setState inside its .then()/.catch(), never
// synchronously in the effect body itself.
function computeInitialState(): ScanState {
  if (getCameraCapability() === 'unsupported' || getBarcodeDetectorCapability() === 'unsupported') return 'unsupported';
  return 'requesting_permission';
}

export default function CameraScannerModal({ title, formats, onDetected, onCancel }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const guardRef = useRef(createDuplicateScanGuard(1500));
  const [state, setState] = useState<ScanState>(computeInitialState);
  const [errorMessage, setErrorMessage] = useState('');

  const stopCamera = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  };

  const tick = (detector: { detect(source: unknown): Promise<{ rawValue: string }[]> }) => {
    if (!videoRef.current || streamRef.current == null) return;
    detector.detect(videoRef.current)
      .then(results => {
        const first = results[0];
        if (first?.rawValue && guardRef.current.shouldAccept(first.rawValue)) {
          if (navigator.vibrate) navigator.vibrate(150);
          stopCamera();
          onDetected(first.rawValue);
          return;
        }
        rafRef.current = requestAnimationFrame(() => tick(detector));
      })
      .catch(() => {
        // Transient per-frame decode errors are expected — keep scanning.
        rafRef.current = requestAnimationFrame(() => tick(detector));
      });
  };

  const requestCameraStream = () => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(stream => {
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        return video.play();
      })
      .then(() => {
        setState('scanning');
        const detector = createBarcodeDetector(formats);
        if (!detector) { setState('unsupported'); return; }
        rafRef.current = requestAnimationFrame(() => tick(detector));
      })
      .catch((e: unknown) => {
        const name = (e as { name?: string })?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setState('permission_denied');
        } else {
          setState('error');
          setErrorMessage((e as Error)?.message || 'Could not access the camera.');
        }
      });
  };

  useEffect(() => {
    if (state !== 'unsupported') requestCameraStream();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = () => {
    stopCamera();
    onCancel();
  };

  const handleRetry = () => {
    setErrorMessage('');
    setState('requesting_permission');
    requestCameraStream();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#071426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, width: '100%', maxWidth: 420, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...F, fontWeight: 900, fontSize: 16, letterSpacing: 1, color: '#F5F5F5' }}>{title}</div>
          <button onClick={handleCancel} style={{ background: 'none', border: 'none', color: '#B8C1CC', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ position: 'relative', background: '#000', minHeight: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Always mounted so the ref exists before getUserMedia resolves; hidden until actively scanning. */}
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', height: 260, objectFit: 'cover', display: state === 'scanning' ? 'block' : 'none' }}
            data-testid="scanner-video"
          />
          {state === 'scanning' && (
            <div style={{ position: 'absolute', inset: 24, border: '3px solid #22C55E', borderRadius: 12, pointerEvents: 'none' }} data-testid="scan-frame" />
          )}
          {state === 'requesting_permission' && (
            <div style={{ ...FB, fontSize: 13, color: '#B8C1CC', textAlign: 'center', padding: 20 }}>Requesting camera permission…</div>
          )}
          {state === 'permission_denied' && (
            <div style={{ ...FB, fontSize: 13, color: '#FCA5A5', textAlign: 'center', padding: 20 }}>
              Camera permission was denied. Allow camera access in your browser settings, or use the barcode field or search instead.
            </div>
          )}
          {state === 'unsupported' && (
            <div style={{ ...FB, fontSize: 13, color: '#FCA5A5', textAlign: 'center', padding: 20 }}>
              Camera scanning isn&apos;t supported in this browser. Use the barcode field or search instead.
            </div>
          )}
          {state === 'error' && (
            <div style={{ ...FB, fontSize: 13, color: '#FCA5A5', textAlign: 'center', padding: 20 }}>{errorMessage || 'Could not access the camera.'}</div>
          )}
        </div>

        <div style={{ padding: 16, display: 'flex', gap: 8 }}>
          <button onClick={handleCancel} style={{ flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#F5F5F5', borderRadius: 8, padding: '12px', ...F, fontWeight: 700, fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}>CANCEL</button>
          {(state === 'permission_denied' || state === 'error') && (
            <button onClick={handleRetry} style={{ flex: 1, background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', ...F, fontWeight: 900, fontSize: 14, letterSpacing: 1, cursor: 'pointer' }}>RETRY</button>
          )}
        </div>
      </div>
    </div>
  );
}
