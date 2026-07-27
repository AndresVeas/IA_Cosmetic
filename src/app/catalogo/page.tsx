import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import Logo from '@/components/Logo';
import { getAllProducts, SkincareProduct } from '@/lib/db';
import CatalogGrid from './CatalogGrid';

export const dynamic = 'force-dynamic';

export default async function CatalogoPage() {
  const products: SkincareProduct[] = await getAllProducts();
  const categories = Array.from(
    new Set(products.flatMap((product) => product.imperfecciones).filter(Boolean)),
  ).slice(0, 4);

  return (
    <div className="catalog-page">
      <header className="catalog-header">
        <div className="catalog-brand">
          <Link href="/" className="catalog-back" aria-label="Volver al inicio">
            <ArrowLeft />
          </Link>
          <Link href="/">
            <Logo />
          </Link>
        </div>

        <nav>
          <Link href="/diagnostico" className="catalog-diagnosis-link">
            <Sparkles />
            DIAGNÓSTICO EN VIVO
          </Link>
        </nav>
      </header>

      <main className="catalog-main">
        <section className="catalog-intro">
          <div className="catalog-intro-copy">
            <div className="catalog-eyebrow">
              <Sparkles />
              CATÁLOGO COMPLETO DE FÓRMULAS
            </div>

            <h1>
              Nuestra colección <em>dermocosmética</em>
            </h1>
            <p>
              Fórmulas seleccionadas para acompañar las necesidades específicas
              identificadas durante el análisis de tu piel.
            </p>
          </div>

          <aside className="catalog-overview" aria-label="Resumen del catálogo">
            <div>
              <strong>{String(products.length).padStart(2, '0')}</strong>
              <span>Fórmulas disponibles</span>
            </div>
            <div className="catalog-categories">
              {categories.map((category) => (
                <span key={category}>{category}</span>
              ))}
            </div>
          </aside>
        </section>

        <CatalogGrid products={products} categories={categories} />
      </main>

      <footer className="catalog-footer">
        <Logo />
        <p>
          &copy; {new Date().getFullYear()} IA_COSMETIC. CIENCIA Y BELLEZA.
        </p>
      </footer>
    </div>
  );
}
