import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Sparkles,
  ScanFace,
  FlaskConical,
  ClipboardCheck,
  Crosshair,
  UserRound,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react";
import Logo from "@/components/Logo";
import { getAllProducts } from "@/lib/db";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const allProducts = await getAllProducts();
  const showcaseProducts = allProducts.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F7F4F1] flex flex-col selection:bg-brand-dusty-rose/30 text-brand-plum font-sans">
      {/* Header */}
      <header className="home-header">
        <Link href="/">
          <Logo className="home-logo" />
        </Link>
        <nav className="home-nav">
          <a href="#metodo" className="hover:text-brand-plum transition-colors duration-300">EL MÉTODO</a>
          <Link href="/catalogo" className="hover:text-brand-plum transition-colors duration-300">PRODUCTOS</Link>
          <Link 
            href="/diagnostico" 
            className="home-nav-cta"
          >
            DIAGNÓSTICO EN VIVO
          </Link>
        </nav>
        <details className="mobile-menu">
          <summary className="mobile-menu-button" aria-label="Abrir menú de navegación">
            <span />
            <span />
            <span />
          </summary>
          <nav className="mobile-menu-panel" aria-label="Navegación móvil">
            <a href="#metodo">EL MÉTODO</a>
            <Link href="/catalogo">PRODUCTOS</Link>
            <Link href="/diagnostico" className="mobile-menu-cta">DIAGNÓSTICO EN VIVO</Link>
          </nav>
        </details>
      </header>

      {/* Hero Section */}
      <section className="home-hero">
        {/* Hero Left Content */}
        <div className="home-hero-copy">
          <div className="home-eyebrow">
            <Sparkles className="w-3 h-3 text-brand-plum" />
            DIAGNÓSTICO DERMO-COSMÉTICO CON IA
          </div>

          <h1 className="home-title">
            Conoce tu <span className="italic">piel</span>.<br />
            Transforma tu <span className="italic">rutina</span>.<br />
            <span>Con ciencia e inteligencia.</span>
          </h1>

          <p className="home-description">
            IA_COSMETIC fusiona visión computacional U-Net con formulación boutique para ofrecerte un diagnóstico profundo y recomendaciones personalizadas en tiempo real de forma científica.
          </p>

          <div className="home-actions">
            <Link
              href="/diagnostico"
              className="home-primary-action group"
            >
              <Camera className="w-4 h-4 transition-transform group-hover:scale-110" />
              INICIAR DIAGNÓSTICO &rarr;
            </Link>
            <Link
              href="/catalogo"
              className="home-secondary-action"
            >
              VER CATÁLOGO
            </Link>
          </div>
        </div>

        {/* Hero Right Visual Column */}
        <div className="home-hero-visual">
          <div className="home-portrait home-portrait-provided">
            {/* The generated high-end model face image */}
            <Image
              src="/hero-main-imperfections-v2.png"
              alt="Retrato con piel natural y textura visible"
              fill
              className="home-portrait-image"
              priority
            />
            
            {/* Minimal animated skin-analysis layer */}
            <svg className="home-analysis-map" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <clipPath id="heroFaceClip"><ellipse cx="205" cy="226" rx="116" ry="160" /></clipPath>
                <linearGradient id="heroScanBeam" x1="85" y1="0" x2="325" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F7F4F1" stopOpacity="0" />
                  <stop offset="0.18" stopColor="#F7F4F1" stopOpacity="0.85" />
                  <stop offset="0.5" stopColor="#DCC0C6" />
                  <stop offset="0.82" stopColor="#F7F4F1" stopOpacity="0.85" />
                  <stop offset="1" stopColor="#F7F4F1" stopOpacity="0" />
                </linearGradient>
                <filter id="heroScanGlow" x="-20%" y="-300%" width="140%" height="700%">
                  <feGaussianBlur stdDeviation="4" />
                </filter>
              </defs>

              <ellipse cx="205" cy="226" rx="116" ry="160" stroke="#F7F4F1" strokeWidth="1" strokeDasharray="5 7" opacity="0.52" />

              <g stroke="#581E2E" strokeWidth="0.8" opacity="0.42">
                <path d="M200 112 L146 190 L205 238 L252 188 L200 112" />
                <path d="M146 190 L126 244 L205 238 L274 240 L252 188" />
                <path d="M126 244 L174 282 L205 238 L235 281 L274 240" />
                <path d="M174 282 L207 324 L235 281" />
                <path d="M146 190 L252 188 M174 282 L235 281" strokeDasharray="3 5" />
              </g>

              {[
                [200, 112, '0s'], [146, 190, '.35s'], [252, 188, '.7s'],
                [205, 238, '1.05s'], [126, 244, '1.4s'], [274, 240, '1.75s'],
                [174, 282, '2.1s'], [235, 281, '2.45s'], [207, 324, '2.8s'],
              ].map(([cx, cy, delay], index) => (
                <g key={index} className="animate-pulse" style={{ animationDelay: String(delay), animationDuration: '2.8s' }}>
                  <circle cx={Number(cx)} cy={Number(cy)} r="5" fill="#F7F4F1" fillOpacity="0.82" />
                  <circle cx={Number(cx)} cy={Number(cy)} r="2.6" fill="#581E2E" />
                </g>
              ))}

              <g clipPath="url(#heroFaceClip)">
                <rect x="82" y="96" width="246" height="10" fill="url(#heroScanBeam)" opacity="0.28" filter="url(#heroScanGlow)">
                  <animate attributeName="y" values="96;348;96" dur="6s" repeatCount="indefinite" />
                </rect>
                <rect x="82" y="100" width="246" height="2" fill="url(#heroScanBeam)">
                  <animate attributeName="y" values="100;352;100" dur="6s" repeatCount="indefinite" />
                </rect>
              </g>
            </svg>
            <span className="scan-corner scan-corner-tl" />
            <span className="scan-corner scan-corner-tr" />
            <span className="scan-corner scan-corner-bl" />
            <span className="scan-corner scan-corner-br" />
            <div className="live-analysis-badge">
              <Sparkles className="w-3 h-3" />
              <strong>ANÁLISIS</strong>
              <span>EN VIVO</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Blocks Section */}
      <section id="metodo" className="method-section">
        <div className="method-grid">
            <article className="method-card">
              <div className="method-icon">
                <ScanFace />
              </div>
              <h3>VISIÓN AVANZADA</h3>
              <p>
                Escaneo instantáneo de imperfecciones para evaluar acné, manchas de sol, líneas de expresión e hiperpigmentación con alta precisión.
              </p>
              <Link href="/diagnostico" className="method-link">
                Conocer más &rarr;
              </Link>
            </article>

            <article className="method-card method-card-featured">
              <div className="method-icon">
                <FlaskConical />
              </div>
              <h3>ACTIVOS INTELIGENTES</h3>
              <p>
                Ingredientes clínicamente respaldados seleccionados mediante IA para responder directamente a las necesidades y balance celular de tu rostro.
              </p>
              <Link href="/catalogo" className="method-link">
                Conocer más &rarr;
              </Link>
            </article>

            <article className="method-card">
              <div className="method-icon">
                <ClipboardCheck />
              </div>
              <h3>PRESCRIPCIÓN BOUTIQUE</h3>
              <p>
                Rutinas y combinaciones personalizadas basadas en tu análisis biométrico, conectadas de forma dinámica a nuestro catálogo inteligente.
              </p>
              <Link href="/diagnostico" className="method-link">
                Conocer más &rarr;
              </Link>
            </article>
        </div>
      </section>

      {/* Middle Elegant Banner */}
      <section className="benefits-section">
        <div className="benefits-inner">
          <div className="benefits-intro">
            <span>TU RITUAL. TU PIEL. TU MEJOR VERSIÓN.</span>
            <div className="benefits-divider" />
            <h2>
              Beneficios que<br />se <em>ven</em>, ciencia<br />que se <em>siente</em>.
            </h2>
          </div>
          <div className="benefits-grid">
            <article className="benefit-card">
              <span className="benefit-number">01</span>
              <div className="benefit-icon">
                <Crosshair />
              </div>
              <h4>Diagnóstico preciso</h4>
              <i />
              <p>Tecnología U-Net para resultados analíticos confiables y mapeados al instante.</p>
            </article>
            <article className="benefit-card">
              <span className="benefit-number">02</span>
              <div className="benefit-icon">
                <UserRound />
              </div>
              <h4>Personalización real</h4>
              <i />
              <p>Sugerencias exclusivas basadas en tu tipo de piel, imperfecciones y estilo de vida.</p>
            </article>
            <article className="benefit-card">
              <span className="benefit-number">03</span>
              <div className="benefit-icon">
                <ChartNoAxesCombined />
              </div>
              <h4>Resultados visibles</h4>
              <i />
              <p>Fórmulas activas y concentradas que trabajan a nivel celular desde el primer ritual.</p>
            </article>
            <article className="benefit-card">
              <span className="benefit-number">04</span>
              <div className="benefit-icon">
                <ShieldCheck />
              </div>
              <h4>Seguridad &amp; transparencia</h4>
              <i />
              <p>Ingredientes probados, seguros de origen, sin parabenos ni componentes agresivos.</p>
            </article>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="products-section">
        <div className="products-heading">
          <div>
            <span className="products-kicker">FÓRMULAS DESTACADAS</span>
            <h2>
              Selección <span className="italic">IA_Cosmetic</span>
            </h2>
          </div>
          <Link
            href="/catalogo"
            className="products-catalog-link"
          >
            <span>VER CATÁLOGO COMPLETO</span><b>&rarr;</b>
          </Link>
        </div>

        <div className="products-grid">
          {showcaseProducts.map((product) => (
            <div 
              key={product.id} 
              className="product-card group"
            >
              <div className="product-image-wrap">
                <img 
                  src={product.imagenUrl || '/products/default.png'} 
                  alt={product.nombre}
                  className="product-image"
                />
                {product.imperfecciones.length > 0 && (
                  <span className="product-tag">
                    {product.imperfecciones[0]}
                  </span>
                )}
              </div>
              <div className="product-content">
                <span className="product-brand">{product.marca}</span>
                <h3>{product.nombre}</h3>
                <p>{product.descripcion}</p>
                <div className="product-footer">
                  <span>${product.precio.toFixed(2)}</span>
                  <Link 
                    href="/diagnostico" 
                    className="product-action"
                    aria-label={`Ver diagnóstico para ${product.nombre}`}
                  >
                    <span>DIAGNÓSTICO</span><b>+</b>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      
      {/* Footer */}
      <footer className="border-t border-brand-dusty-rose/20 bg-brand-sand/10 py-12 px-6 sm:px-12 text-brand-plum/80 text-xs tracking-widest mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <Logo />
          <p className="text-[10px] text-center md:text-right font-light">
            &copy; {new Date().getFullYear()} IA_COSMETIC. TODOS LOS DERECHOS RESERVADOS. CIENCIA Y BELLEZA.
          </p>
        </div>
      </footer>
    </div>
  );
}
