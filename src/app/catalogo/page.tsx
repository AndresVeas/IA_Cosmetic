import Link from 'next/link';
import { Sparkles, ArrowLeft, Search, Filter } from 'lucide-react';
import Logo from '@/components/Logo';
import { getAllProducts, SkincareProduct } from '@/lib/db';

export default async function CatalogoPage() {
  const products: SkincareProduct[] = await getAllProducts();

  return (
    <div className="min-h-screen bg-[#F7F4F1] flex flex-col selection:bg-brand-dusty-rose/30 text-brand-plum font-sans">
      {/* Header */}
      <header className="border-b border-brand-dusty-rose/20 py-4 px-6 sm:px-12 flex justify-between items-center bg-[#F7F4F1]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 rounded-full hover:bg-brand-rose/30 transition-colors text-brand-plum" aria-label="Volver al inicio">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <nav className="flex items-center gap-4">
          <Link
            href="/diagnostico"
            className="bg-brand-plum text-[#F7F4F1] px-6 py-3 rounded-full hover:bg-brand-dusty-rose hover:text-brand-plum transition-all duration-300 hover:shadow-md font-bold tracking-widest text-xs sm:text-sm flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            DIAGNÓSTICO EN VIVO
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 sm:px-12 max-w-7xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-dusty-rose bg-brand-rose/20 text-[10px] tracking-widest text-brand-plum uppercase font-bold mb-4">
          <Sparkles className="w-3 h-3 text-brand-plum" />
          CATÁLOGO COMPLETO DE FÓRMULAS
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-brand-plum mb-4">
          Nuestra Colección Dermocosmética
        </h1>
        <p className="text-base sm:text-lg text-brand-plum/80 max-w-2xl font-normal leading-relaxed mb-8">
          Explora la totalidad de nuestras formulaciones boutique diseñadas para responder a las necesidades específicas evaluadas por la IA.
        </p>

        {/* Product Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
          {products.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-brand-dusty-rose/20 rounded-[2rem] overflow-hidden hover:shadow-xl hover:border-brand-dusty-rose transition-all duration-500 group flex flex-col h-full shadow-sm"
            >
              <div className="relative aspect-[4/5] w-full bg-brand-sand/20 overflow-hidden border-b border-brand-dusty-rose/10 flex items-center justify-center p-4">
                <img
                  src={product.imagenUrl || '/products/default.png'}
                  alt={product.nombre}
                  className="max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-105"
                />
                {product.imperfecciones.length > 0 && (
                  <span className="absolute top-4 left-4 bg-brand-lavender text-brand-plum border border-brand-dusty-rose/40 px-3 py-1 rounded-full text-[9px] tracking-widest font-bold uppercase z-10">
                    {product.imperfecciones[0]}
                  </span>
                )}
              </div>

              <div className="p-6 flex flex-col flex-1">
                <span className="text-[10px] text-brand-dusty-rose tracking-widest uppercase mb-1 font-semibold">{product.marca}</span>
                <h2 className="font-serif text-2xl font-bold text-brand-plum mb-2 leading-snug">{product.nombre}</h2>
                <p className="text-base text-brand-plum/80 font-normal leading-relaxed mb-6 flex-1 line-clamp-3">{product.descripcion}</p>

                <div className="flex flex-wrap gap-1.5 mb-6">
                  {product.imperfecciones.filter(Boolean).map((imp, idx) => (
                    <span
                      key={`${imp}-${idx}`}
                      className="px-2.5 py-0.5 bg-brand-sand/40 border border-brand-dusty-rose/20 text-brand-plum rounded-full text-[9px] font-bold tracking-wider uppercase"
                    >
                      {imp}
                    </span>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-brand-dusty-rose/10 pt-4 mt-auto">
                  <span className="font-bold text-lg text-brand-plum">${product.precio.toFixed(2)}</span>
                  <Link
                    href="/diagnostico"
                    className="text-xs tracking-widest font-bold text-brand-plum hover:text-brand-dusty-rose transition-colors duration-300 uppercase"
                  >
                    EVALUAR PIEL &rarr;
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
