'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Logo from '@/components/Logo';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  CircleDot,
  Eye,
  EyeOff,
  FlipHorizontal,
  Info,
  Lightbulb,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  SunMedium,
  Upload,
  Waves,
} from 'lucide-react';
import styles from './diagnostico.module.css';

interface VisualOverlay {
  type: string;
  x: number;
  y: number;
  radius: number;
  label: string;
}

interface Product {
  id: string;
  nombre: string;
  marca: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  imperfecciones: string[];
}

interface AnalysisResponse {
  anomalies: string[];
  visualOverlay: VisualOverlay[];
  recommendation: string;
  products: Product[];
  maskImage?: string;
}

const anomalyMeta: Record<string, { label: string; tone: string; icon: LucideIcon }> = {
  acne: { label: 'Acné', tone: styles.acne, icon: CircleDot },
  manchas: { label: 'Hiperpigmentación', tone: styles.spots, icon: SunMedium },
  arrugas: { label: 'Líneas / arrugas', tone: styles.lines, icon: Waves },
};

function getAnomalyMeta(type: string) {
  return anomalyMeta[type] ?? { label: 'Otra condición', tone: styles.other, icon: ScanFace };
}

function DiagnosisProgress({ analyzed = false }: { analyzed?: boolean }) {
  return (
    <div className={styles.progress} aria-label={`Paso ${analyzed ? 2 : 1} de 2`}>
      {[
        ['1', 'Captura', analyzed ? 'Completado' : 'Actual'],
        ['2', 'Análisis', analyzed ? 'Resultado disponible' : 'Siguiente paso'],
      ].map(([number, label, caption], index) => (
        <div className={styles.progressStep} key={number}>
          <div className={`${styles.progressNumber} ${index < (analyzed ? 2 : 1) ? styles.progressActive : ''}`}>
            {analyzed && index === 0 ? <Check size={14} /> : number}
          </div>
          <strong>{label}</strong>
          <span>{caption}</span>
        </div>
      ))}
    </div>
  );
}

function IntroCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.introCard}>
      <span className={styles.introIcon}>{icon}</span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </div>
  );
}

export default function DiagnosticoPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [showMask, setShowMask] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setResults(null);
      setShowMask(false);

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch (firstErr: unknown) {
        console.warn('Could not start camera with HD constraints. Falling back to default constraints.', firstErr);
        mediaStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      }

      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: unknown) {
      console.error('Camera access error:', err);
      const errorName = err instanceof DOMException ? err.name : '';
      let errorMsg = 'No se pudo acceder a la cámara.';
      if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
        errorMsg = 'La cámara está siendo utilizada por otra aplicación o el sistema no permite el acceso. Ciérrala e intenta de nuevo.';
      } else if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
        errorMsg = 'Acceso a la cámara denegado. Permite el acceso desde los ajustes del navegador.';
      } else if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
        errorMsg = 'No se detectó ninguna cámara. Puedes subir una imagen desde tus archivos.';
      }
      setError(errorMsg);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  const analyzeSkin = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setResults(null);
    setError(null);
    setShowMask(false);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 }),
      });
      if (!res.ok) throw new Error('Error al procesar el análisis de piel.');
      setResults((await res.json()) as AnalysisResponse);
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      setError('Ocurrió un error al procesar el análisis dermocosmético.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    analyzeSkin(dataUrl);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      setCapturedImage(dataUrl);
      stopCamera();
      analyzeSkin(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);

  useEffect(() => {
    if ((results || isAnalyzing) && window.innerWidth < 1024) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [results, isAnalyzing]);

  const hasResult = Boolean(results && capturedImage && !isAnalyzing);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brandGroup}>
          <Link href="/" className={styles.back} aria-label="Volver al inicio"><ArrowLeft /></Link>
          <Logo className={styles.moduleLogo} />
        </div>
        <span className={styles.visionBadge}><Sparkles /> U-Net Vision 1.0</span>
      </header>

      {!capturedImage && !isAnalyzing && (
        <div className={styles.initialIntro}>
          <span><Sparkles /></span>
          <div>
            <h1>Tu análisis comenzará aquí</h1>
            <p>Captura tu rostro para obtener un análisis inteligente y recomendaciones personalizadas.</p>
          </div>
        </div>
      )}

      {hasResult && (
        <div className={styles.resultIntro}>
          <span><Sparkles /></span>
          <div>
            <h1>Análisis Dermocosmético</h1>
            <p>Resultados generados a partir del análisis inteligente de tu piel.</p>
          </div>
        </div>
      )}

      <div className={`${styles.workspace} ${hasResult ? styles.resultWorkspace : ''} ${!capturedImage && !isAnalyzing ? styles.initialWorkspace : ''}`}>
        <section className={`${styles.captureColumn} ${hasResult ? styles.resultCapture : ''}`} aria-labelledby="capture-title">
          <div className={styles.captureInner}>
            <div className={styles.sectionHeading}>
              <div>
                <div className={styles.headingTitleRow}>
                  {hasResult || (!capturedImage && !isAnalyzing)
                    ? <h2 id="capture-title">Captura de rostro</h2>
                    : <h1 id="capture-title">Captura de rostro</h1>}
                  {hasResult && <span className={styles.successBadge}><CheckCircle2 /> Imagen analizada</span>}
                </div>
                <p>{hasResult ? 'Tu imagen ha sido capturada y analizada correctamente.' : 'Posiciona tu rostro completo en el encuadre para obtener un análisis preciso.'}</p>
              </div>
            </div>

            <div className={styles.viewport}>
              {isCameraActive && (
                <>
                  <video
                    ref={(element) => {
                      videoRef.current = element;
                      if (element && stream) element.srcObject = stream;
                    }}
                    autoPlay playsInline muted
                    className={`${styles.media} ${isMirrored ? styles.mirrored : ''}`}
                  />
                  <button className={styles.mirrorButton} onClick={() => setIsMirrored(!isMirrored)} aria-label="Alternar imagen espejo">
                    <FlipHorizontal />
                  </button>
                  <div className={styles.faceGuide} aria-hidden="true">
                    <span className={styles.guideVertical} />
                    <span className={styles.guideEyes} />
                    <span className={styles.guideShoulders} />
                  </div>
                  <div className={styles.guideMessage} aria-hidden="true">
                    Centra tu rostro dentro de la guía
                  </div>
                </>
              )}

              {capturedImage && (
                <div className={styles.imageStage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={capturedImage} alt="Rostro capturado para el análisis" className={styles.media} />
                  
                  {showMask && results?.maskImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={results.maskImage}
                      alt="Máscara de segmentación UNET"
                      className={styles.media}
                      style={{ mixBlendMode: 'normal', opacity: 0.8, zIndex: 3 }}
                    />
                  )}

                  {results?.visualOverlay.map((overlay, index) => {
                    const meta = getAnomalyMeta(overlay.type);
                    return (
                      <div
                        key={`${overlay.type}-${index}`}
                        className={`${styles.marker} ${meta.tone}`}
                        style={{ left: `${(overlay.x / 640) * 100}%`, top: `${(overlay.y / 480) * 100}%`, zIndex: 4 }}
                        tabIndex={0}
                        aria-label={`${meta.label}: ${overlay.label}`}
                      >
                        <span>{index + 1}</span>
                        <div className={styles.markerTooltip}><strong>{meta.label}</strong> · {overlay.label}</div>
                      </div>
                    );
                  })}

                  {results && results.maskImage && (
                    <button
                      className={`${styles.maskToggleButton} ${showMask ? styles.maskToggleButtonActive : ''}`}
                      onClick={() => setShowMask(!showMask)}
                      aria-label="Alternar máscara de segmentación"
                      title={showMask ? "Ocultar máscara U-Net" : "Mostrar máscara U-Net"}
                    >
                      {showMask ? <EyeOff /> : <Eye />}
                    </button>
                  )}
                </div>
              )}

              {!isCameraActive && !capturedImage && (
                <div className={styles.placeholder}>
                  <div className={styles.faceSilhouette} aria-hidden="true"><span /></div>
                  <span className={styles.cameraOrb}><Camera /></span>
                  <h2>Cámara inactiva</h2>
                  <p>Activa tu cámara para el análisis dermocosmético o sube una fotografía desde tus archivos.</p>
                  <div className={styles.captureHints} aria-label="Recomendaciones para la captura">
                    <span><Check /> Luz frontal</span>
                    <span><Check /> Rostro completo</span>
                    <span><Check /> Sin filtros</span>
                  </div>
                  <div className={styles.primaryActions}>
                    <button className={styles.primaryButton} onClick={startCamera}><Camera /> Usar cámara</button>
                    <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}><Upload /> Subir foto</button>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className={styles.loadingOverlay} role="status">
                  <Loader2 className={styles.spinner} />
                  <h2>Analizando tu piel…</h2>
                  <p>La visión computacional está identificando patrones visibles.</p>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className={styles.hiddenInput} aria-label="Seleccionar fotografía" />

            {!isCameraActive && !capturedImage && (
              <div className={styles.formatNote}><Info /> Formatos de imagen compatibles con tu navegador</div>
            )}

            {isCameraActive && (
              <div className={styles.belowActions}>
                <button className={styles.primaryButton} onClick={capturePhoto}><Camera /> Tomar foto</button>
                <button className={styles.secondaryButton} onClick={stopCamera}>Cancelar</button>
              </div>
            )}

            {capturedImage && !isAnalyzing && (
              <>
                <div className={styles.belowActions}>
                  <button className={styles.primaryButton} onClick={startCamera}><RefreshCw /> Nueva captura</button>
                  <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}><Upload /> Subir otra</button>
                </div>
                <div className={styles.privacyNote}><LockKeyhole /> La imagen se utiliza para generar este análisis personalizado.</div>
              </>
            )}

            {error && <div className={styles.error} role="alert">{error}</div>}
          </div>
        </section>

        <aside className={`${styles.infoColumn} ${hasResult ? styles.resultInfo : ''}`} ref={resultsRef}>
          {!capturedImage && !isAnalyzing && (
            <div className={styles.introPanel}>
              <div className={styles.introLead}>
                <h2>Análisis inteligente</h2>
                <p>Cuando captures tu rostro, la IA analizará patrones visibles de tu piel y preparará recomendaciones personalizadas.</p>
              </div>
              <DiagnosisProgress />
              <div className={styles.introCards}>
                <IntroCard icon={<Eye />} title="Qué analizará la IA">Acné, manchas, líneas finas y otras condiciones disponibles en el análisis.</IntroCard>
                <IntroCard icon={<Lightbulb />} title="Consejos para la captura">Usa luz frontal, mantén el rostro completo, evita filtros y sombras fuertes.</IntroCard>
                <IntroCard icon={<ShieldCheck />} title="Tu privacidad">La fotografía se utiliza dentro de este flujo para generar el resultado.</IntroCard>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className={styles.skeleton} aria-label="Preparando el informe">
              <span /><span /><span /><div /><div /><div />
            </div>
          )}

          {results && !isAnalyzing && (
            <div className={styles.report}>
              <div className={styles.reportHeader}>
                <span className={styles.eyebrow}>Análisis dermocosmético</span>
                <h2>Informe de tu piel</h2>
                <div className={styles.chips}>
                  {results.anomalies.map((anomaly) => {
                    const meta = getAnomalyMeta(anomaly);
                    return <span key={anomaly} className={`${styles.chip} ${meta.tone}`}>{meta.label}</span>;
                  })}
                </div>
              </div>

              <div className={styles.summaryCard}>
                <span><Sparkles /></span>
                <p>{results.recommendation}</p>
              </div>

              {results.anomalies.length > 0 && (
                <section className={styles.reportSection}>
                  <h3>Indicadores clave</h3>
                  <div className={styles.indicators}>
                    {results.anomalies.map((anomaly) => {
                      const meta = getAnomalyMeta(anomaly);
                      const IndicatorIcon = meta.icon;
                      const detectedZones = results.visualOverlay.filter((overlay) => overlay.type === anomaly).length;
                      return (
                        <div className={`${styles.indicatorCard} ${meta.tone}`} key={anomaly}>
                          <span className={`${styles.indicatorIcon} ${meta.tone}`}><IndicatorIcon /></span>
                          <div className={styles.indicatorCopy}>
                            <span>
                              {detectedZones > 0
                                ? `${detectedZones} ${detectedZones === 1 ? 'zona identificada' : 'zonas identificadas'}`
                                : 'Condición identificada'}
                            </span>
                            <strong>{meta.label}</strong>
                          </div>
                          <small className={`${styles.indicatorStatus} ${meta.tone}`}><Check /> Detectada</small>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div>
          )}
        </aside>
      </div>

      {hasResult && results && (
        <section className={styles.productShelf} aria-labelledby="recommended-products-title">
          <div className={styles.productShelfHeading}>
            <div>
              <h2 id="recommended-products-title">Fórmulas recomendadas para tu piel</h2>
              <p>Seleccionadas según las condiciones identificadas en el análisis.</p>
            </div>
            <span>{results.products.length} {results.products.length === 1 ? 'fórmula recomendada' : 'fórmulas recomendadas'}</span>
          </div>
          <div className={styles.productGrid}>
            {results.products.map((product) => (
              <article className={styles.shelfProductCard} key={product.id}>
                <div className={styles.shelfProductImage}>
                  <Image src={product.imagenUrl} alt={product.nombre} width={130} height={150} />
                </div>
                <div className={styles.productCopy}>
                  <span>{product.marca}</span>
                  <h3>{product.nombre}</h3>
                  <p>{product.descripcion}</p>
                  <div className={styles.productTags}>
                    {product.imperfecciones.map((item) => <span key={item}>{getAnomalyMeta(item).label}</span>)}
                  </div>
                  <strong className={styles.shelfPrice}>${product.precio.toFixed(2)}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
