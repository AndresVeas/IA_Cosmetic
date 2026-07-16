'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, RefreshCw, Upload, Sparkles, Check, ArrowLeft, Loader2, Beaker, HelpCircle, FlipHorizontal } from 'lucide-react';

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
}

export default function DiagnosticoPage() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedProducts, setAddedProducts] = useState<Record<string, boolean>>({});
  const [isMirrored, setIsMirrored] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera stream
  const startCamera = async () => {
    try {
      setError(null);
      setCapturedImage(null);
      setResults(null);
      
      let mediaStream: MediaStream;
      try {
        // Try high quality first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: { ideal: 1920 }, 
            height: { ideal: 1080 } 
          },
          audio: false
        });
      } catch (firstErr: any) {
        console.warn("Could not start camera with HD constraints. Falling back to default constraints.", firstErr);
        // Fallback to basic video stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
      }
      
      setStream(mediaStream);
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Camera access error:", err);
      
      let errorMsg = "No se pudo acceder a la cámara.";
      if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = "La cámara está siendo utilizada por otra aplicación (como Zoom, Teams, u otra pestaña) o el sistema no permite el acceso. Por favor, ciérrala e intenta de nuevo.";
      } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Acceso a la cámara denegado. Por favor, permite el acceso en los permisos de tu navegador.";
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = "No se detectó ninguna cámara en este dispositivo. Puedes subir una imagen desde tu galería.";
      } else {
        errorMsg += " Por favor verifica tu conexión o sube una imagen de tu galería.";
      }
      
      setError(errorMsg);
      setIsCameraActive(false);
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  };

  // Capture frame from video and triggers analysis
  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1920;
      canvas.height = video.videoHeight || 1080;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // If mirroring is active, flip canvas context before drawing
        if (isMirrored) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        
        // Draw the current video frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Reset transformation matrix to default
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        // Export high-quality image (0.95 quality)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setCapturedImage(dataUrl);
        stopCamera();
        analyzeSkin(dataUrl);
      }
    }
  };

  // Handle image upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setCapturedImage(dataUrl);
        stopCamera();
        analyzeSkin(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Call internal Next.js API for Vision / Database query
  const analyzeSkin = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setResults(null);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageBase64 })
      });

      if (!res.ok) {
        throw new Error('Error al procesar el análisis de piel.');
      }

      const data: AnalysisResponse = await res.json();
      setResults(data);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setError("Ocurrió un error al contactar el laboratorio de diagnóstico.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Toggle routine items
  const toggleRoutineProduct = (productId: string) => {
    setAddedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Color mappings for UI anomalies
  const getColorClasses = (type: string) => {
    switch (type) {
      case 'acne':
        return {
          bg: 'bg-red-500',
          border: 'border-red-500',
          text: 'text-red-600',
          lightBg: 'bg-red-50',
          label: 'Acné',
        };
      case 'manchas':
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-500',
          text: 'text-emerald-600',
          lightBg: 'bg-emerald-50',
          label: 'Hiperpigmentación',
        };
      case 'arrugas':
        return {
          bg: 'bg-indigo-500',
          border: 'border-indigo-500',
          text: 'text-indigo-600',
          lightBg: 'bg-indigo-50',
          label: 'Líneas/Arrugas',
        };
      default:
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-500',
          text: 'text-amber-600',
          lightBg: 'bg-amber-50',
          label: 'Anomalía',
        };
    }
  };

  return (
    <div className="min-h-screen lg:h-screen bg-[#FDFBF7] flex flex-col selection:bg-[#8E7E73]/20 lg:overflow-hidden">
      {/* Mini Header */}
      <header className="border-b border-[#8E7E73]/10 py-5 px-6 sm:px-8 flex justify-between items-center bg-[#FDFBF7]">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-[#8E7E73] hover:text-[#1A1A1A] transition-colors duration-300">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="font-serif text-lg tracking-[0.15em] font-light text-[#1A1A1A]">IA_COSMETIC</span>
        </div>
        <div className="flex gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5EFEB] border border-[#8E7E73]/20 text-[10px] text-[#8E7E73] tracking-widest uppercase font-semibold">
            <Sparkles className="w-3 h-3 text-[#8E7E73]" />
            U-Net Vision 1.0
          </div>
        </div>
      </header>

      {/* Main Workspace split screen */}
      <div className="flex-1 grid lg:grid-cols-12 gap-0 lg:overflow-hidden">
        {/* Left Panel: Camera capture and drawing */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col items-center justify-center border-r border-[#8E7E73]/10 bg-[#FDFBF7] lg:h-full lg:overflow-y-auto">
          <div className="w-full max-w-2xl flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="font-serif text-2xl tracking-wide text-[#1A1A1A]">Captura de Rostro</h1>
                <p className="text-xs text-[#8E7E73] font-light">Posiciona tu rostro completo en el encuadre para un análisis óptimo</p>
              </div>
              
              {!isCameraActive && !capturedImage && (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-2 bg-[#1A1A1A] text-white px-5 py-2.5 rounded-full text-xs font-semibold hover:bg-[#8E7E73] transition-all duration-300"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Activar Cámara
                </button>
              )}
            </div>

            {/* Viewport Frame */}
            <div className="relative aspect-[4/3] w-full rounded-3xl overflow-hidden bg-[#F5EFEB]/50 border border-[#8E7E73]/20 shadow-inner flex flex-col items-center justify-center">
              
              {/* Live Web Camera View */}
              {isCameraActive && (
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el && stream) {
                        el.srcObject = stream;
                      }
                    }}
                    autoPlay
                    playsInline
                    muted
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 ${
                      isMirrored ? 'scale-x-[-1]' : ''
                    }`}
                  />
                  {/* Floating Toggle Mirror Button */}
                  <button
                    onClick={() => setIsMirrored(!isMirrored)}
                    className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-md border border-[#8E7E73]/20 text-[#8E7E73] p-2.5 rounded-full hover:bg-white hover:text-[#1A1A1A] transition-all duration-300 shadow-md flex items-center justify-center group"
                    title="Alternar Modo Espejo"
                  >
                    <FlipHorizontal className={`w-4 h-4 transition-transform duration-500 ${isMirrored ? 'rotate-180' : ''}`} />
                  </button>
                </>
              )}

              {/* Static Captured Image View with Overlay Masks */}
              {capturedImage && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                  <div className="relative w-full h-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={capturedImage}
                      alt="Captured skincare target"
                      className="w-full h-full object-cover"
                    />

                    {/* Canvas Overlays (Percentage-based absolute pins for perfect responsiveness) */}
                    {results && results.visualOverlay.map((overlay, index) => {
                      const color = getColorClasses(overlay.type);
                      // Map the 640x480 coordinate space to percentage values
                      const leftPercent = (overlay.x / 640) * 100;
                      const topPercent = (overlay.y / 480) * 100;

                      return (
                        <div
                          key={index}
                          style={{ left: `${leftPercent}%`, top: `${topPercent}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 group z-20 cursor-help"
                        >
                          {/* Pulsing ring */}
                          <div className={`absolute -inset-2 rounded-full border-2 ${color.border} opacity-70 animate-ping`} />
                          
                          {/* Center point pin */}
                          <div className={`w-5 h-5 rounded-full ${color.bg} border-2 border-white flex items-center justify-center shadow-lg`}>
                            <span className="text-[8px] text-white font-bold">{index + 1}</span>
                          </div>

                          {/* Hover tooltip label */}
                          <div className="absolute left-6 top-1/2 -translate-y-1/2 scale-0 group-hover:scale-100 transition-all duration-300 origin-left bg-[#1A1A1A] text-white px-3 py-1.5 rounded-lg text-[10px] tracking-wider whitespace-nowrap shadow-xl z-50">
                            <span className="font-bold">{color.label}:</span> {overlay.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Feed Placeholder / File Drag Drop Fallback */}
              {!isCameraActive && !capturedImage && (
                <div className="flex flex-col items-center gap-4 text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center border border-[#8E7E73]/20 shadow-md">
                    <Camera className="w-6 h-6 text-[#8E7E73]" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-medium text-[#1A1A1A] mb-1">Cámara Inactiva</h3>
                    <p className="text-xs text-[#8E7E73] max-w-sm font-light">
                      Activa tu cámara en vivo para el análisis dermo-cosmético o sube una fotografía desde tus archivos.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 mt-4">
                    <button
                      onClick={startCamera}
                      className="bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-xs font-semibold hover:bg-[#8E7E73] transition-all duration-300"
                    >
                      Usar Cámara
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="border border-[#8E7E73]/40 text-[#1A1A1A] bg-white px-6 py-3 rounded-full text-xs font-semibold hover:bg-[#F5EFEB]/20 transition-all duration-300 flex items-center gap-2"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#8E7E73]" />
                      Subir Foto
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* Loading overlay during vision computation */}
              {isAnalyzing && (
                <div className="absolute inset-0 bg-[#FDFBF7]/90 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-30">
                  <Loader2 className="w-10 h-10 text-[#8E7E73] animate-spin" />
                  <div className="text-center">
                    <p className="font-serif text-lg text-[#1A1A1A] tracking-wider animate-pulse">Analizando la piel a nivel molecular...</p>
                    <p className="text-[10px] text-[#8E7E73] tracking-widest uppercase mt-1">U-Net segmentando anomalías</p>
                  </div>
                </div>
              )}
            </div>

            {/* Error notifications */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 leading-relaxed font-light">
                {error}
              </div>
            )}

            {/* Live Camera Controls */}
            {isCameraActive && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={capturePhoto}
                  className="bg-[#1A1A1A] text-white px-8 py-3 rounded-full text-xs font-semibold hover:bg-[#8E7E73] transition-all duration-300 shadow-md flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Tomar Foto
                </button>
                <button
                  onClick={stopCamera}
                  className="border border-[#8E7E73]/30 bg-white text-[#8E7E73] px-6 py-3 rounded-full text-xs hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all duration-300"
                >
                  Cancelar
                </button>
              </div>
            )}

            {/* Post-Capture Controls */}
            {capturedImage && !isAnalyzing && (
              <div className="flex gap-3 justify-center">
                <button
                  onClick={startCamera}
                  className="bg-[#1A1A1A] text-white px-8 py-3.5 rounded-full text-xs font-semibold hover:bg-[#8E7E73] transition-all duration-300 flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Nueva Captura
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="border border-[#8E7E73]/30 bg-white text-[#1A1A1A] px-6 py-3.5 rounded-full text-xs hover:border-[#1A1A1A] transition-all duration-300 flex items-center gap-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Subir Otra
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Diagnosis reports and Neon db product catalog */}
        <div className="lg:col-span-5 p-6 sm:p-8 bg-[#F5EFEB]/30 flex flex-col justify-start border-t lg:border-t-0 lg:h-full lg:overflow-y-auto">
          
          {/* STATE 1: Empty state, waiting for image capture */}
          {!capturedImage && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 px-4">
              <Beaker className="w-12 h-12 text-[#8E7E73]/30 mb-4" />
              <h2 className="font-serif text-xl font-light text-[#1A1A1A] mb-2">Diagnóstico Pendiente</h2>
              <p className="text-xs text-[#8E7E73] max-w-xs font-light leading-relaxed">
                Toma una foto o sube un archivo para que nuestra API de visión y base de datos de Neon PostgreSQL generen tu receta dermo-cosmética personalizada.
              </p>
            </div>
          )}

          {/* STATE 2: Loading skeletons */}
          {isAnalyzing && (
            <div className="space-y-8 py-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-[#8E7E73]/15 rounded w-1/3"></div>
                <div className="h-8 bg-[#8E7E73]/15 rounded w-2/3"></div>
                <div className="space-y-2 pt-2">
                  <div className="h-3.5 bg-[#8E7E73]/15 rounded w-full"></div>
                  <div className="h-3.5 bg-[#8E7E73]/15 rounded w-full"></div>
                  <div className="h-3.5 bg-[#8E7E73]/15 rounded w-5/6"></div>
                </div>
              </div>

              <div className="animate-pulse space-y-4 pt-6 border-t border-[#8E7E73]/10">
                <div className="h-4 bg-[#8E7E73]/15 rounded w-1/2"></div>
                <div className="grid grid-cols-1 gap-4">
                  <div className="h-28 bg-[#8E7E73]/10 rounded-2xl"></div>
                  <div className="h-28 bg-[#8E7E73]/10 rounded-2xl"></div>
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: Render results */}
          {results && !isAnalyzing && (
            <div className="space-y-8 py-2">
              
              {/* Doctor diagnosis report */}
              <div>
                <span className="text-[10px] tracking-widest text-[#8E7E73] uppercase font-semibold block mb-2">Análisis de Laboratorio</span>
                <h2 className="font-serif text-3xl font-light text-[#1A1A1A] mb-4">Informe Dermatológico</h2>
                
                {/* Visual labels badge */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {results.anomalies.map((anom) => {
                    const color = getColorClasses(anom);
                    return (
                      <span
                        key={anom}
                        className={`text-[10px] font-semibold tracking-widest uppercase px-3 py-1 rounded-full ${color.lightBg} ${color.text} border ${color.border}/30`}
                      >
                        {color.label}
                      </span>
                    );
                  })}
                </div>

                <div className="bg-white border border-[#8E7E73]/15 rounded-3xl p-6 shadow-sm">
                  <p className="text-xs text-[#1A1A1A] leading-relaxed font-light whitespace-pre-line">
                    {results.recommendation}
                  </p>
                </div>
              </div>

              {/* Neon database products catalog */}
              <div className="border-t border-[#8E7E73]/10 pt-8">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-xl font-light text-[#1A1A1A]">Fórmulas Recomendadas</h3>
                    <p className="text-[10px] text-[#8E7E73] font-light">Directo desde nuestro catálogo en Neon PostgreSQL</p>
                  </div>
                  <span className="text-[9px] bg-[#8E7E73]/10 text-[#8E7E73] px-2 py-0.5 rounded font-mono">
                    {results.products.length} {results.products.length === 1 ? 'fórmula' : 'fórmulas'}
                  </span>
                </div>

                <div className="space-y-4">
                  {results.products.map((product) => (
                    <div
                      key={product.id}
                      className="bg-white border border-[#8E7E73]/15 rounded-2xl p-4 flex gap-4 hover:border-[#8E7E73]/40 transition-all duration-300 group shadow-sm"
                    >
                      {/* Product Thumbnail */}
                      <div className="relative w-20 h-20 bg-[#F5EFEB]/30 rounded-xl overflow-hidden p-2 flex items-center justify-center shrink-0 border border-[#8E7E73]/10">
                        <Image
                          src={product.imagenUrl}
                          alt={product.nombre}
                          width={60}
                          height={60}
                          className="object-contain transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>

                      {/* Product copy details */}
                      <div className="flex flex-col justify-between flex-grow">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-[9px] text-[#8E7E73] tracking-widest uppercase">{product.marca}</span>
                            <span className="text-xs font-semibold text-[#1A1A1A]">${product.precio.toFixed(2)}</span>
                          </div>
                          <h4 className="font-serif text-sm font-medium text-[#1A1A1A] leading-tight mt-0.5">{product.nombre}</h4>
                          <p className="text-[10px] text-[#8E7E73] leading-relaxed font-light mt-1.5 line-clamp-2">
                            {product.descripcion}
                          </p>
                        </div>

                        {/* Connection points treated tags and Routine additions */}
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#8E7E73]/5">
                          <div className="flex gap-1">
                            {product.imperfecciones.map(imp => {
                              const color = getColorClasses(imp);
                              return (
                                <span key={imp} className={`text-[8px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${color.lightBg} ${color.text}`}>
                                  {imp === 'acne' ? 'Acné' : imp === 'manchas' ? 'Manchas' : 'Arrugas'}
                                </span>
                              );
                            })}
                          </div>
                          
                          <button
                            onClick={() => toggleRoutineProduct(product.id)}
                            className={`flex items-center gap-1 text-[10px] tracking-wider font-semibold transition-all duration-300 ${
                              addedProducts[product.id]
                                ? 'text-[#8E7E73] bg-[#F5EFEB] border border-[#8E7E73]/20 px-3 py-1.5 rounded-full'
                                : 'text-white bg-[#1A1A1A] px-4 py-1.5 rounded-full hover:bg-[#8E7E73]'
                            }`}
                          >
                            {addedProducts[product.id] ? (
                              <>
                                <Check className="w-3 h-3 text-[#8E7E73]" />
                                Añadido
                              </>
                            ) : (
                              'Añadir'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
