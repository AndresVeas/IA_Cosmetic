'use client';

import { useEffect, useRef, useState } from 'react';
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
  ZoomIn,
} from 'lucide-react';
import styles from './diagnostico.module.css';

interface VisualOverlay {
  type: string;
  x: number;
  y: number;
  radius: number;
  label: string;
  area?: number;
  confidence?: number;
  severity?: string;
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
  manchas: { label: 'Manchas', tone: styles.spots, icon: SunMedium },
  arrugas: { label: 'Arrugas', tone: styles.lines, icon: Waves },
};

function getAnomalyMeta(type: string) {
  if (!type) return { label: 'Imperfección', tone: styles.other, icon: ScanFace };
  const normalizedKey = type.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (anomalyMeta[normalizedKey]) {
    return anomalyMeta[normalizedKey];
  }
  
  const formattedLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return { label: formattedLabel, tone: styles.other, icon: ScanFace };
}

function formatConditionTag(item: string): string {
  if (!item) return '';
  const normalized = item.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (normalized === 'acne') return 'Acné';
  if (normalized === 'manchas') return 'Manchas';
  if (normalized === 'arrugas') return 'Arrugas';
  return item.charAt(0).toUpperCase() + item.slice(1);
}

function DiagnosisProgress({ analyzed = false }: { analyzed?: boolean }) {
  return (
    <div className={styles.progress} aria-label={`Paso ${analyzed ? 3 : 1} de 3`}>
      {[
        ['1', 'Captura', 'Tu foto'],
        ['2', 'Análisis', 'IA inteligente'],
        ['3', 'Resultado', 'Recomendaciones'],
      ].map(([number, label, caption], index) => (
        <div className={styles.progressStep} key={number}>
          <div className={`${styles.progressNumber} ${index < (analyzed ? 3 : 1) ? styles.progressActive : ''}`}>
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
  const [zoomLevel, setZoomLevel] = useState<number>(1.65);
  const [showMask, setShowMask] = useState(false);
  const [visibleProductsCount, setVisibleProductsCount] = useState<number>(15);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultsRef = useRef<HTMLDivElement | null>(null);

  const startCamera = async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setResults(null);
      setShowMask(false);
      setVisibleProductsCount(15);

      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            aspectRatio: { ideal: 1 },
            width: { ideal: 1080 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (firstErr: unknown) {
        console.warn('Could not start camera with 1:1 constraints. Falling back to default constraints.', firstErr);
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
    const vWidth = video.videoWidth || 1080;
    const vHeight = video.videoHeight || 1080;
    
    // Recorte del cuadrado central 1:1 aplicando el Zoom Facial seleccionado
    const baseSize = Math.min(vWidth, vHeight);
    const zoomedSize = baseSize / zoomLevel;
    const startX = (vWidth - zoomedSize) / 2;
    const startY = (vHeight - zoomedSize) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, startX, startY, zoomedSize, zoomedSize, 0, 0, 1080, 1080);
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
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const minSize = Math.min(img.width, img.height);
        canvas.width = 1080;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const startX = (img.width - minSize) / 2;
        const startY = (img.height - minSize) / 2;
        ctx.drawImage(img, startX, startY, minSize, minSize, 0, 0, 1080, 1080);
        const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(croppedDataUrl);
        stopCamera();
        analyzeSkin(croppedDataUrl);
      };
      img.src = dataUrl;
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
            <h1>Tu análisis comenzará <span className="italic">aquí</span></h1>
            <p>Captura tu rostro para obtener un análisis inteligente y recomendaciones personalizadas.</p>
          </div>
          <div className={styles.introSecurity}>
            <span><ShieldCheck /></span>
            <div>
              <strong>Tus datos están protegidos</strong>
              <small>Privacidad y seguridad garantizadas</small>
            </div>
          </div>
        </div>
      )}

      {hasResult && (
        <div className={styles.resultIntro}>
          <span><Sparkles /></span>
          <div>
            <h1>Análisis <span className="italic">Dermocosmético</span></h1>
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
                    ? <h2 id="capture-title">Captura de <span className="italic">rostro</span></h2>
                    : <h1 id="capture-title">Captura de <span className="italic">rostro</span></h1>}
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
                    className={`${styles.media}`}
                    style={{ transform: `${isMirrored ? 'scaleX(-1)' : ''} scale(${zoomLevel})` }}
                  />
                  <button className={styles.mirrorButton} onClick={() => setIsMirrored(!isMirrored)} aria-label="Alternar imagen espejo" title="Espejo">
                    <FlipHorizontal />
                  </button>
                  <button
                    className={styles.zoomButton}
                    onClick={() => setZoomLevel((prev) => (prev >= 1.8 ? 1.0 : prev === 1.0 ? 1.35 : 1.65))}
                    aria-label="Cambiar zoom de la cámara"
                    title="Zoom Facial"
                  >
                    <ZoomIn /> {zoomLevel.toFixed(2)}x
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
                  
                  {/* 1. Máscara coloreada de segmentación (se desvela al presionar el botón) */}
                  {showMask && results?.maskImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={results.maskImage}
                      alt="Máscara de segmentación UNET"
                      className={styles.media}
                      style={{ mixBlendMode: 'normal', opacity: 0.8, zIndex: 3 }}
                    />
                  )}

                  {/* 2. Círculos/Puntos numerados (visibles por defecto, desaparecen al desvelar la máscara) */}
                  {!showMask && results?.visualOverlay.map((overlay, index) => {
                    const meta = getAnomalyMeta(overlay.type);
                    return (
                      <div
                        key={`${overlay.type}-${index}`}
                        className={`${styles.marker} ${meta.tone}`}
                        style={{ left: `${(overlay.x / 512) * 100}%`, top: `${(overlay.y / 512) * 100}%`, zIndex: 4 }}
                        tabIndex={0}
                        aria-label={`${meta.label}: ${overlay.label}`}
                      >
                        <span>{index + 1}</span>
                        <div className={styles.markerTooltip}>
                          <strong>{meta.label} #{index + 1}</strong>
                          <div className={styles.tooltipRow}>
                            <span>Foco:</span> <strong>{overlay.severity || 'Identificado'}</strong>
                          </div>
                          {overlay.area && (
                            <div className={styles.tooltipRow}>
                              <span>Tamaño:</span> <strong>{overlay.area} px</strong>
                            </div>
                          )}
                          {overlay.confidence && (
                            <div className={styles.tooltipRow}>
                              <span>Confianza:</span> <strong>{overlay.confidence}%</strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {results && results.maskImage && (
                    <button
                      className={`${styles.maskToggleButton} ${showMask ? styles.maskToggleButtonActive : ''}`}
                      onClick={() => setShowMask(!showMask)}
                      aria-label="Alternar vista entre puntos y máscara"
                      title={showMask ? "Ver marcadores de puntos" : "Desvelar máscara coloreada U-Net"}
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
                  <h2>Cámara <span className="italic">inactiva</span></h2>
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
                  <h2>Analizando tu <span className="italic">piel</span>…</h2>
                  <p>La visión computacional está identificando patrones visibles.</p>
                </div>
              )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className={styles.hiddenInput} aria-label="Seleccionar fotografía" />

            {!isCameraActive && !capturedImage && (
              <div className={styles.formatNote}><Info /> Formatos compatibles: .jpg, .png y .webp (máx. 10 MB)</div>
            )}

            {isCameraActive && (
              <>
                <div className={styles.privacyNote} style={{ marginBottom: '14px', background: 'rgba(247, 244, 241, 0.95)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--plum)', fontSize: '12px', lineHeight: 1.4, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <LockKeyhole size={16} style={{ flexShrink: 0, color: 'var(--plum)' }} />
                  <span><strong>Aviso de Privacidad:</strong> La fotografía capturada será almacenada de forma segura únicamente para mejorar nuestro servicio de análisis. No se realizará la distribución ni divulgación de tus imágenes.</span>
                </div>
                <div className={styles.belowActions}>
                  <button className={styles.primaryButton} onClick={capturePhoto}><Camera /> Tomar foto</button>
                  <button className={styles.secondaryButton} onClick={stopCamera}>Cancelar</button>
                </div>
              </>
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
                <h2>Análisis <span className="italic">inteligente</span></h2>
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
                <h2>Informe de tu <span className="italic">piel</span></h2>
              </div>

              <div className={styles.summaryCard}>
                <span><Sparkles /></span>
                <div className={styles.summaryCopy}>
                  <small>Lectura personalizada</small>
                  {results.recommendation.split('\n\n').map((paragraph, index, paragraphs) => {
                    const isDisclaimer = index === paragraphs.length - 1;
                    return isDisclaimer ? (
                      <div className={styles.summaryNote} key={`${index}-${paragraph.slice(0, 24)}`}>
                        <Info />
                        <p>{paragraph}</p>
                      </div>
                    ) : (
                      <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                    );
                  })}
                </div>
              </div>

              {results.anomalies.length > 0 && (
                <section className={styles.reportSection}>
                  <h3>Indicadores <span className="italic">clave</span></h3>
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

      {hasResult && results && results.products && results.products.length > 0 && (
        <section className={styles.productShelf} aria-labelledby="recommended-products-title">
          <div className={styles.productShelfHeading}>
            <div>
              <h2 id="recommended-products-title">Fórmulas recomendadas para tu <span className="italic">piel</span></h2>
              <p>Seleccionadas según las condiciones identificadas en el análisis dermo-cosmético.</p>
            </div>
            <span>
              Mostrando {Math.min(visibleProductsCount, results.products.length)} de {results.products.length} {results.products.length === 1 ? 'fórmula' : 'fórmulas'}
            </span>
          </div>
          <div className={styles.productGrid}>
            {results.products.slice(0, visibleProductsCount).map((product) => (
              <article className={styles.shelfProductCard} key={product.id}>
                <div className={styles.shelfProductImage}>
                  <ProductImage src={product.imagenUrl} alt={product.nombre} />
                </div>
                <div className={styles.productCopy}>
                  <span>{product.marca}</span>
                  <h3>{product.nombre}</h3>
                  <p>{product.descripcion}</p>
                  <div className={styles.productTags}>
                    {product.imperfecciones.filter(Boolean).map((item, idx) => (
                      <span key={`${item}-${idx}`}>{formatConditionTag(item)}</span>
                    ))}
                  </div>
                  <strong className={styles.shelfPrice}>${product.precio.toFixed(2)}</strong>
                </div>
              </article>
            ))}
          </div>

          {visibleProductsCount < results.products.length && (
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'center' }}>
              <button
                className={styles.secondaryButton}
                onClick={() => setVisibleProductsCount(prev => prev + 15)}
                style={{ padding: '0 36px', height: '52px', fontSize: '15px', borderRadius: '999px', cursor: 'pointer' }}
              >
                Ver más recomendaciones
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: '12px',
        textAlign: 'center',
        background: 'linear-gradient(135deg, #fbf7f4 0%, #f1e6df 100%)',
        color: '#9c7b75'
      }}>
        <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px', opacity: 0.8 }}>
          <path d="M12 2v4" />
          <path d="M7 6h10a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1z" />
          <path d="M10 12h4" />
        </svg>
        <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.9, lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      style={{
        width: '100%',
        height: '100%',
        maxHeight: '170px',
        objectFit: 'contain',
        padding: '10px'
      }}
    />
  );
}
