import Link from "next/link";
import Image from "next/image";
import { Camera, Sparkles, Check, Cpu, Sparkle } from "lucide-react";
import Logo from "@/components/Logo";

export default function Home() {
  const showcaseProducts = [
    {
      name: "Clarité Serum",
      type: "Fórmula Activa",
      description: "Niacinamida 10% + Zinc PCA. Trata acné y manchas regulando el sebo y unificando el tono.",
      price: "$38.00",
      image: "/products/niacinamide.png",
      tag: "Acné & Manchas"
    },
    {
      name: "Lumière Cream",
      type: "Tratamiento Reparador",
      description: "Retinol Encapsulado + Péptidos. Estimula la renovación celular y suaviza arrugas de expresión.",
      price: "$52.00",
      image: "/products/retinol.png",
      tag: "Anti-Edad"
    },
    {
      name: "Hydra Balance",
      type: "Restaurador Profundo",
      description: "Ácido Hialurónico + Ceramidas. Retiene la humedad y fortalece la barrera protectora de la piel.",
      price: "$48.00",
      image: "/products/multipeptides.png",
      tag: "Hidratación"
    },
    {
      name: "Barrier Repair",
      type: "Calmante Activo",
      description: "Centella Asiática + Probióticos. Reduce rojeces, desinflama y equilibra el microbioma cutáneo.",
      price: "$45.00",
      image: "/products/vitc.png",
      tag: "Barrera"
    }
  ];

  return (
    <div className="min-h-screen bg-[#F7F4F1] flex flex-col selection:bg-brand-dusty-rose/30 text-brand-plum font-sans">
      {/* Header */}
      <header className="border-b border-brand-dusty-rose/20 py-4 px-6 sm:px-12 flex justify-between items-center bg-[#F7F4F1]/90 backdrop-blur-md sticky top-0 z-50">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="hidden md:flex gap-8 items-center text-sm sm:text-base tracking-[0.15em] font-bold text-brand-plum">
          <a href="#metodo" className="hover:text-brand-plum transition-colors duration-300">EL MÉTODO</a>
          <a href="#productos" className="hover:text-brand-plum transition-colors duration-300">PRODUCTOS</a>
          <Link 
            href="/diagnostico" 
            className="bg-brand-plum text-[#F7F4F1] px-6 py-3 rounded-full hover:bg-brand-dusty-rose hover:text-brand-plum transition-all duration-300 hover:shadow-md font-bold tracking-widest text-xs sm:text-sm"
          >
            DIAGNÓSTICO EN VIVO
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-12 lg:items-center justify-between">
        {/* Soft abstract color blobs in background */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-brand-lavender/50 blur-3xl -z-10" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 rounded-full bg-brand-rose/40 blur-3xl -z-10" />

        {/* Hero Left Content */}
        <div className="flex-grow flex-shrink-0 lg:max-w-2xl animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-dusty-rose bg-brand-rose/20 text-[10px] tracking-widest text-brand-plum uppercase font-bold mb-6">
            <Sparkles className="w-3 h-3 text-brand-plum" />
            DIAGNÓSTICO DERMO-COSMÉTICO CON IA
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-[-0.04em] text-brand-plum leading-[1.05] mb-6">
            Conoce tu piel.<br />
            Transforma tu rutina.<br />
            <span className="font-bold text-brand-dusty-rose">Con ciencia e inteligencia.</span>
          </h1>

          <p className="text-base md:text-lg text-brand-plum/80 font-normal leading-relaxed mb-10 max-w-xl">
            IA_COSMETIC fusiona visión computacional U-Net con formulación boutique para ofrecerte un diagnóstico profundo y recomendaciones personalizadas en tiempo real de forma científica.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <Link
              href="/diagnostico"
              className="group flex items-center justify-center gap-3 bg-brand-plum text-[#F7F4F1] px-8 py-4 rounded-full text-xs tracking-widest font-bold hover:bg-brand-dusty-rose hover:text-brand-plum transition-all duration-300 hover:shadow-lg"
            >
              <Camera className="w-4 h-4 transition-transform group-hover:scale-110" />
              INICIAR DIAGNÓSTICO &rarr;
            </Link>
            <a
              href="#productos"
              className="flex items-center justify-center border border-brand-dusty-rose text-brand-plum px-8 py-4 rounded-full text-xs tracking-widest font-bold hover:bg-brand-rose/20 transition-all duration-300"
            >
              VER CATÁLOGO
            </a>
          </div>
        </div>

        {/* Hero Right Visual Column */}
        <div className="flex-1 max-w-md lg:max-w-lg mx-auto w-full relative">
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden border border-brand-dusty-rose/30 shadow-2xl bg-brand-rose/10">
            {/* The generated high-end model face image */}
            <Image
              src="/hero-skin-natural.png"
              alt="Retrato con piel natural y textura visible"
              fill
              className="object-cover"
              priority
            />
            {/* Subtle color integration */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-lavender/10 to-brand-rose/10 mix-blend-multiply" />
            
            {/* Minimal animated skin-analysis layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-75" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
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
          </div>
        </div>
      </section>

      {/* Feature Blocks Section */}
      <section id="metodo" className="bg-brand-sand/30 py-20 px-6 sm:px-12 border-t border-b border-brand-dusty-rose/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-[2rem] border border-brand-dusty-rose/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-plum mb-6">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3 text-brand-plum">VISIÓN AVANZADA</h3>
              <p className="text-xl text-brand-plum font-normal leading-relaxed">
                Escaneo instantáneo de imperfecciones para evaluar acné, manchas de sol, líneas de expresión e hiperpigmentación con alta precisión.
              </p>
              <Link href="/diagnostico" className="inline-flex items-center gap-1.5 text-base tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
                Conocer más &rarr;
              </Link>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-brand-dusty-rose/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand-rose/40 flex items-center justify-center text-brand-plum mb-6">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3 text-brand-plum">ACTIVOS INTELIGENTES</h3>
              <p className="text-xl text-brand-plum font-normal leading-relaxed">
                Ingredientes clínicamente respaldados seleccionados mediante IA para responder directamente a las necesidades y balance celular de tu rostro.
              </p>
              <a href="#productos" className="inline-flex items-center gap-1.5 text-base tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
                Conocer más &rarr;
              </a>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-brand-dusty-rose/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-plum mb-6">
                <Sparkle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-2xl font-bold mb-3 text-brand-plum">PRESCRIPCIÓN BOUTIQUE</h3>
              <p className="text-xl text-brand-plum font-normal leading-relaxed">
                Rutinas y combinaciones personalizadas basadas en tu análisis biométrico, conectadas de forma dinámica a nuestro catálogo inteligente.
              </p>
              <Link href="/diagnostico" className="inline-flex items-center gap-1.5 text-base tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
                Conocer más &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Middle Elegant Banner */}
      <section className="bg-brand-lavender py-20 px-6 sm:px-12 border-b border-brand-dusty-rose/10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-12 lg:items-center justify-between">
          <div className="lg:max-w-md">
            <span className="text-base tracking-widest text-brand-plum uppercase font-extrabold block mb-3">TU RITUAL. TU PIEL. TU MEJOR VERSIÓN.</span>
            <h2 className="font-serif text-5xl sm:text-6xl text-brand-plum font-bold leading-tight">
              Beneficios que se ven, ciencia que se siente.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 lg:max-w-3xl w-full">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-3xl font-bold text-brand-plum">Diagnóstico preciso</h4>
                <p className="text-xl text-brand-plum font-medium leading-relaxed mt-1">Tecnología U-Net para resultados analíticos confiables y mapeados al instante.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-3xl font-bold text-brand-plum">Personalización real</h4>
                <p className="text-xl text-brand-plum font-medium leading-relaxed mt-1">Sugerencias exclusivas basadas en tu tipo de piel, imperfecciones y estilo de vida.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-3xl font-bold text-brand-plum">Resultados visibles</h4>
                <p className="text-xl text-brand-plum font-medium leading-relaxed mt-1">Fórmulas activas y concentradas que trabajan a nivel celular desde el primer ritual.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-3xl font-bold text-brand-plum">Seguridad & transparencia</h4>
                <p className="text-xl text-brand-plum font-medium leading-relaxed mt-1">Ingredientes probados, seguros de origen, sin parabenos ni componentes agresivos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-sm tracking-widest text-brand-plum uppercase block mb-3 font-extrabold">FÓRMULAS DESTACADAS</span>
            <h2 className="font-serif text-5xl sm:text-6xl font-bold tracking-wide text-brand-plum">
              Selección IA_Cosmetic
            </h2>
          </div>
          <Link
            href="/diagnostico"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300"
          >
            VER CATÁLOGO COMPLETO &rarr;
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {showcaseProducts.map((product, index) => (
            <div 
              key={index} 
              className="bg-white border border-brand-dusty-rose/20 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-brand-dusty-rose transition-all duration-500 group flex flex-col h-full shadow-sm"
            >
              <div className="relative aspect-[4/5] w-full bg-brand-sand/20 overflow-hidden border-b border-brand-dusty-rose/10">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <span className="absolute top-4 left-4 bg-brand-lavender text-brand-plum border border-brand-dusty-rose/40 px-3 py-1 rounded-full text-[9px] tracking-widest font-bold uppercase z-10">
                  {product.tag}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className="text-[10px] text-brand-dusty-rose tracking-widest uppercase mb-1 font-semibold">{product.type}</span>
                <h3 className="font-serif text-2xl font-bold text-brand-plum mb-2 leading-snug">{product.name}</h3>
                <p className="text-lg text-brand-plum font-medium leading-relaxed mb-6 flex-1">{product.description}</p>
                <div className="flex justify-between items-center border-t border-brand-dusty-rose/10 pt-4">
                  <span className="font-bold text-lg text-brand-plum">{product.price}</span>
                  <Link 
                    href="/diagnostico" 
                    className="text-sm tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300"
                  >
                    DIAGNÓSTICO &rarr;
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
