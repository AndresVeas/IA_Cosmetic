import Link from "next/link";
import Image from "next/image";
import { Camera, Sparkles, Check, ArrowRight, Cpu, Shield, Award, Sparkle } from "lucide-react";
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
        <nav className="hidden md:flex gap-8 items-center text-xs tracking-[0.15em] font-semibold text-brand-plum/80">
          <a href="#metodo" className="hover:text-brand-plum transition-colors duration-300">EL MÉTODO</a>
          <a href="#productos" className="hover:text-brand-plum transition-colors duration-300">PRODUCTOS</a>
          <Link 
            href="/diagnostico" 
            className="bg-brand-plum text-[#F7F4F1] px-5 py-2.5 rounded-full hover:bg-brand-dusty-rose hover:text-brand-plum transition-all duration-300 hover:shadow-md font-bold tracking-widest text-[10px]"
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

          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-light tracking-wide text-brand-plum leading-[1.15] mb-6">
            Conoce tu piel.<br />
            Transforma tu rutina.<br />
            <span className="italic font-normal text-brand-dusty-rose">Con ciencia e inteligencia.</span>
          </h1>

          <p className="text-base md:text-lg text-brand-plum/80 font-light leading-relaxed mb-10 max-w-xl">
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
              src="/hero-skin.png"
              alt="Análisis Dermo-Cosmético de Piel"
              fill
              className="object-cover"
              priority
            />
            {/* U-Net Grid Overlay Mask */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-lavender/30 to-brand-rose/30 mix-blend-multiply" />
            
            {/* Futuristic Animated SVG Wireframe Layer */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Mesh connection lines mapping the facial features */}
              <path d="M120,150 L200,120 L280,150 L310,220 L200,280 L90,220 Z" stroke="#581E2E" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
              <path d="M120,150 L200,200 L280,150 L280,240 L200,280 L120,240 Z" stroke="#581E2E" strokeWidth="1.2" opacity="0.4" />
              <path d="M200,120 L200,200 L200,280" stroke="#581E2E" strokeWidth="1" opacity="0.5" />
              <path d="M90,220 L200,200 L310,220" stroke="#581E2E" strokeWidth="1" opacity="0.5" />
              
              {/* Nodes */}
              <circle cx="120" cy="150" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" className="animate-pulse" />
              <circle cx="200" cy="120" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" />
              <circle cx="280" cy="150" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" className="animate-pulse" />
              <circle cx="310" cy="220" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" />
              <circle cx="200" cy="280" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" />
              <circle cx="90" cy="220" r="3" fill="#DCC6D6" stroke="#581E2E" strokeWidth="1" />
              <circle cx="200" cy="200" r="4.5" fill="#581E2E" className="animate-ping" style={{ animationDuration: '3.5s' }} />
              <circle cx="200" cy="200" r="2.5" fill="#581E2E" />

              {/* Diagnostic markers */}
              <path d="M150,220 L180,240 L220,240 L250,220" stroke="#DCC6D6" strokeWidth="1" />
              <circle cx="150" cy="220" r="2" fill="#DCC6D6" />
              <circle cx="250" cy="220" r="2" fill="#DCC6D6" />
              
              {/* Horizontal scanning light bar */}
              <line x1="0" y1="180" x2="400" y2="180" stroke="#581E2E" strokeWidth="1" opacity="0.3" className="animate-bounce" style={{ animationDuration: '7s' }} />
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
              <h3 className="font-serif text-lg font-medium mb-3 text-brand-plum">VISIÓN AVANZADA</h3>
              <p className="text-sm text-brand-plum/70 font-light leading-relaxed">
                Escaneo instantáneo de imperfecciones para evaluar acné, manchas de sol, líneas de expresión e hiperpigmentación con alta precisión.
              </p>
              <Link href="/diagnostico" className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
                Conocer más &rarr;
              </Link>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-brand-dusty-rose/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand-rose/40 flex items-center justify-center text-brand-plum mb-6">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-medium mb-3 text-brand-plum">ACTIVOS INTELIGENTES</h3>
              <p className="text-sm text-brand-plum/70 font-light leading-relaxed">
                Ingredientes clínicamente respaldados seleccionados mediante IA para responder directamente a las necesidades y balance celular de tu rostro.
              </p>
              <a href="#productos" className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
                Conocer más &rarr;
              </a>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-brand-dusty-rose/20 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-brand-lavender flex items-center justify-center text-brand-plum mb-6">
                <Sparkle className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-lg font-medium mb-3 text-brand-plum">PRESCRIPCIÓN BOUTIQUE</h3>
              <p className="text-sm text-brand-plum/70 font-light leading-relaxed">
                Rutinas y combinaciones personalizadas basadas en tu análisis biométrico, conectadas de forma dinámica a nuestro catálogo inteligente.
              </p>
              <Link href="/diagnostico" className="inline-flex items-center gap-1.5 text-[10px] tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 mt-6 uppercase">
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
            <span className="text-xs tracking-widest text-brand-plum uppercase font-bold block mb-3">TU RITUAL. TU PIEL. TU MEJOR VERSIÓN.</span>
            <h2 className="font-serif text-3xl sm:text-4xl text-brand-plum font-light leading-snug">
              Beneficios que se ven, ciencia que se siente.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-6 lg:max-w-3xl w-full">
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-brand-plum">Diagnóstico preciso</h4>
                <p className="text-sm text-brand-plum/70 leading-relaxed font-light mt-1">Tecnología U-Net para resultados analíticos confiables y mapeados al instante.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-brand-plum">Personalización real</h4>
                <p className="text-sm text-brand-plum/70 leading-relaxed font-light mt-1">Sugerencias exclusivas basadas en tu tipo de piel, imperfecciones y estilo de vida.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-brand-plum">Resultados visibles</h4>
                <p className="text-sm text-brand-plum/70 leading-relaxed font-light mt-1">Fórmulas activas y concentradas que trabajan a nivel celular desde el primer ritual.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-brand-rose/40 flex items-center justify-center shrink-0 text-brand-plum mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-serif text-lg font-semibold text-brand-plum">Seguridad & transparencia</h4>
                <p className="text-sm text-brand-plum/70 leading-relaxed font-light mt-1">Ingredientes probados, seguros de origen, sin parabenos ni componentes agresivos.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-24 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-[10px] tracking-widest text-brand-plum/70 uppercase block mb-3 font-bold">FÓRMULAS DESTACADAS</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-light tracking-wide text-brand-plum">
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
              <div className="relative aspect-[4/5] w-full bg-brand-sand/20 overflow-hidden flex items-center justify-center p-6 border-b border-brand-dusty-rose/10">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  width={200}
                  height={250}
                  className="object-contain transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <span className="absolute top-4 left-4 bg-brand-lavender text-brand-plum border border-brand-dusty-rose/40 px-3 py-1 rounded-full text-[9px] tracking-widest font-bold uppercase">
                  {product.tag}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className="text-[10px] text-brand-dusty-rose tracking-widest uppercase mb-1 font-semibold">{product.type}</span>
                <h3 className="font-serif text-base font-semibold text-brand-plum mb-2 leading-snug">{product.name}</h3>
                <p className="text-sm text-brand-plum/70 font-light leading-relaxed mb-6 flex-1">{product.description}</p>
                <div className="flex justify-between items-center border-t border-brand-dusty-rose/10 pt-4">
                  <span className="font-semibold text-sm text-brand-plum">{product.price}</span>
                  <Link 
                    href="/diagnostico" 
                    className="text-[10px] tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300"
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
