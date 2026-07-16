import Link from "next/link";
import Image from "next/image";
import { Camera, Sparkles, Shield, Beaker } from "lucide-react";

export default function Home() {
  const showcaseProducts = [
    {
      name: "Lumière Sérum Niacinamide 10% + Zinc 1%",
      type: "Producto Estrella",
      description: "Trata acné y manchas simultáneamente, regulando el sebo y unificando el tono.",
      price: "$38.00",
      image: "/products/niacinamide.png",
      tag: "Acné & Manchas"
    },
    {
      name: "Lumière Gel Limpiador Ácido Salicílico",
      type: "Purificante",
      description: "Exfoliación profunda con BHA para destapar poros y prevenir imperfecciones.",
      price: "$26.50",
      image: "/products/cleanser.png",
      tag: "Acné"
    },
    {
      name: "Lumière Corrector Antimanchas Vitamina C",
      type: "Iluminador",
      description: "Potente antioxidante que desvanece la hiperpigmentación y unifica el tono.",
      price: "$45.00",
      image: "/products/vitc.png",
      tag: "Manchas"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col selection:bg-[#8E7E73]/20">
      {/* Header */}
      <header className="border-b border-[#8E7E73]/10 py-6 px-8 flex justify-between items-center bg-[#FDFBF7]/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/" className="font-serif text-2xl tracking-[0.25em] font-light text-[#1A1A1A]">
          LUMIÈRE <span className="font-sans text-xs tracking-widest text-[#8E7E73] font-normal">LAB</span>
        </Link>
        <nav className="hidden md:flex gap-8 items-center text-sm tracking-widest text-[#8E7E73]">
          <a href="#metodo" className="hover:text-[#1A1A1A] transition-colors duration-300">EL MÉTODO</a>
          <a href="#productos" className="hover:text-[#1A1A1A] transition-colors duration-300">PRODUCTOS</a>
          <Link 
            href="/diagnostico" 
            className="bg-[#1A1A1A] text-white px-6 py-2.5 rounded-full text-xs font-semibold hover:bg-[#8E7E73] transition-all duration-300 hover:shadow-lg hover:shadow-[#8E7E73]/10"
          >
            DIAGNÓSTICO EN VIVO
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6 flex flex-col items-center text-center max-w-6xl mx-auto flex-1 justify-center">
        {/* Subtle decorative blurred circles for spa feeling */}
        <div className="absolute top-1/4 left-10 w-72 h-72 rounded-full bg-[#F5EFEB]/60 blur-3xl -z-10" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-[#8E7E73]/5 blur-3xl -z-10" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#8E7E73]/20 bg-[#F5EFEB]/30 text-xs tracking-widest text-[#8E7E73] uppercase mb-8 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          Diagnóstico Dermo-Cosmético Computarizado
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-light tracking-wide text-[#1A1A1A] leading-[1.15] max-w-4xl mb-8">
          Descubre las necesidades de tu piel de forma <span className="italic font-normal text-[#8E7E73]">científica</span>
        </h1>

        <p className="text-base sm:text-lg text-[#8E7E73] max-w-2xl font-light leading-relaxed mb-12">
          Lumière fusiona la visión computacional U-Net con la formulación boutique para analizar tu rostro en tiempo real y recomendar el ritual dermo-cosmético perfecto de nuestra base de datos inteligente.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/diagnostico"
            className="group flex items-center justify-center gap-3 bg-[#1A1A1A] text-white px-8 py-4 rounded-full text-sm font-medium hover:bg-[#8E7E73] transition-all duration-300 hover:shadow-xl hover:shadow-[#8E7E73]/20"
          >
            <Camera className="w-4 h-4 transition-transform group-hover:scale-110" />
            Iniciar Diagnóstico
          </Link>
          <a
            href="#productos"
            className="flex items-center justify-center border border-[#8E7E73]/30 text-[#1A1A1A] px-8 py-4 rounded-full text-sm font-medium hover:border-[#1A1A1A] hover:bg-[#F5EFEB]/20 transition-all duration-300"
          >
            Ver Catálogo
          </a>
        </div>
      </section>

      {/* Features Section */}
      <section id="metodo" className="bg-[#F5EFEB]/40 py-20 px-6 border-t border-b border-[#8E7E73]/10">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif text-3xl md:text-4xl text-center font-light tracking-wide mb-16 text-[#1A1A1A]">
            Cuidado Avanzado de la Piel
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5EFEB] flex items-center justify-center text-[#8E7E73] mb-6">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-medium mb-3 text-[#1A1A1A]">Visión Artificial</h3>
              <p className="text-sm text-[#8E7E73] font-light leading-relaxed">
                Escaneo instantáneo a través de la cámara para segmentar acné, manchas de sol, hiperpigmentación y arrugas de expresión.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5EFEB] flex items-center justify-center text-[#8E7E73] mb-6">
                <Beaker className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-medium mb-3 text-[#1A1A1A]">Ingredientes Activos</h3>
              <p className="text-sm text-[#8E7E73] font-light leading-relaxed">
                Formulaciones concentradas basadas en Niacinamida, Ácido Salicílico purificado, Vitamina C estabilizada y Retinol encapsulado.
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5EFEB] flex items-center justify-center text-[#8E7E73] mb-6">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-serif text-xl font-medium mb-3 text-[#1A1A1A]">Prescripción Boutique</h3>
              <p className="text-sm text-[#8E7E73] font-light leading-relaxed">
                Recomendaciones dinámicas directas de nuestra base de datos Neon PostgreSQL optimizadas según el diagnóstico dermo-cosmético.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs tracking-widest text-[#8E7E73] uppercase block mb-3 font-semibold">Boutique de Fórmulas</span>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-wide text-[#1A1A1A]">
            La Colección Lumière Lab
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {showcaseProducts.map((product, index) => (
            <div 
              key={index} 
              className="bg-[#F5EFEB]/10 border border-[#8E7E73]/15 rounded-3xl overflow-hidden hover:shadow-xl hover:shadow-[#8E7E73]/5 hover:border-[#8E7E73]/40 transition-all duration-500 group flex flex-col h-full"
            >
              <div className="relative aspect-[4/5] w-full bg-[#F5EFEB]/30 overflow-hidden flex items-center justify-center p-8 border-b border-[#8E7E73]/10">
                <Image 
                  src={product.image} 
                  alt={product.name}
                  width={240}
                  height={300}
                  className="object-contain transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                <span className="absolute top-4 left-4 bg-white/80 backdrop-blur-sm border border-[#8E7E73]/20 px-3 py-1 rounded-full text-[10px] tracking-widest text-[#8E7E73] font-semibold uppercase">
                  {product.tag}
                </span>
              </div>
              <div className="p-6 flex flex-col flex-1">
                <span className="text-xs text-[#8E7E73] tracking-widest uppercase mb-1">{product.type}</span>
                <h3 className="font-serif text-lg font-medium text-[#1A1A1A] mb-2 leading-snug">{product.name}</h3>
                <p className="text-xs text-[#8E7E73] font-light leading-relaxed mb-6 flex-1">{product.description}</p>
                <div className="flex justify-between items-center border-t border-[#8E7E73]/10 pt-4">
                  <span className="font-medium text-sm text-[#1A1A1A]">{product.price}</span>
                  <Link 
                    href="/diagnostico" 
                    className="text-xs tracking-widest font-semibold text-[#1A1A1A] hover:text-[#8E7E73] transition-colors duration-300"
                  >
                    DIAGNÓSTICO →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#8E7E73]/10 bg-[#F5EFEB]/20 py-12 px-8 text-center text-[#8E7E73] text-xs tracking-widest mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="font-serif text-lg tracking-[0.2em] text-[#1A1A1A]">LUMIÈRE</p>
          <p>© {new Date().getFullYear()} LUMIÈRE LAB. TODOS LOS DERECHOS RESERVADOS. CIENCIA Y BELLEZA.</p>
        </div>
      </footer>
    </div>
  );
}
