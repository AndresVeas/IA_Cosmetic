'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, SlidersHorizontal } from 'lucide-react';
import type { SkincareProduct } from '@/lib/db';
import styles from './CatalogGrid.module.css';

interface CatalogGridProps {
  products: SkincareProduct[];
  categories: string[];
}

const normalizeCategory = (value: string) =>
  value
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const displayCategory = (value: string) => {
  const normalized = normalizeCategory(value);
  const labels: Record<string, string> = {
    acne: 'Acné',
    manchas: 'Manchas',
    arrugas: 'Arrugas',
  };

  return labels[normalized] ?? value;
};

export default function CatalogGrid({ products, categories }: CatalogGridProps) {
  const [activeCategory, setActiveCategory] = useState('todos');

  const filteredProducts = useMemo(() => {
    if (activeCategory === 'todos') return products;

    return products.filter((product) =>
      product.imperfecciones.some(
        (imperfeccion) => normalizeCategory(imperfeccion) === activeCategory,
      ),
    );
  }, [activeCategory, products]);

  return (
    <>
      <div className={styles.filter} aria-label="Filtrar productos por necesidad">
        <div className={styles.label}>
          <span className={styles.labelIcon}>
            <SlidersHorizontal />
          </span>
          <span className={styles.labelText}>
            <strong>Encuentra tu fórmula</strong>
            <span>Elige una necesidad de tu piel</span>
          </span>
        </div>

        <div className={styles.options}>
          <button
            type="button"
            className={`${styles.option} ${
              activeCategory === 'todos' ? styles.optionActive : ''
            }`}
            onClick={() => setActiveCategory('todos')}
            aria-pressed={activeCategory === 'todos'}
          >
            Todos
            <small className={styles.count}>{products.length}</small>
          </button>

          {categories.map((category) => {
            const normalizedCategory = normalizeCategory(category);
            const productCount = products.filter((product) =>
              product.imperfecciones.some(
                (imperfeccion) =>
                  normalizeCategory(imperfeccion) === normalizedCategory,
              ),
            ).length;

            return (
              <button
                type="button"
                key={normalizedCategory}
                className={`${styles.option} ${
                  activeCategory === normalizedCategory ? styles.optionActive : ''
                }`}
                onClick={() => setActiveCategory(normalizedCategory)}
                aria-pressed={activeCategory === normalizedCategory}
              >
                {displayCategory(category)}
                <small className={styles.count}>{productCount}</small>
              </button>
            );
          })}
        </div>

        <p className={styles.result} aria-live="polite">
          {filteredProducts.length}{' '}
          {filteredProducts.length === 1 ? 'fórmula encontrada' : 'fórmulas encontradas'}
        </p>
      </div>

      <section className="catalog-grid" aria-label="Productos dermocosméticos">
        {filteredProducts.map((product, productIndex) => (
          <article key={product.id} className="catalog-card">
            <div className="catalog-image-wrap">
              <span className="catalog-index">
                {String(productIndex + 1).padStart(2, '0')}
              </span>
              <img
                src={product.imagenUrl || '/products/default.png'}
                alt={product.nombre}
                className="catalog-image"
              />
              {product.imperfecciones.length > 0 && (
                <span className="catalog-primary-tag">
                  {displayCategory(product.imperfecciones[0])}
                </span>
              )}
            </div>

            <div className="catalog-card-body">
              <span className="catalog-brand-name">{product.marca}</span>
              <h2>{product.nombre}</h2>
              <p>{product.descripcion}</p>

              <div className="catalog-tags">
                {product.imperfecciones.filter(Boolean).map((imperfeccion, index) => (
                  <span key={`${imperfeccion}-${index}`}>
                    {displayCategory(imperfeccion)}
                  </span>
                ))}
              </div>

              <div className="catalog-card-footer">
                <div>
                  <small>Precio</small>
                  <strong>${product.precio.toFixed(2)}</strong>
                </div>
                <Link
                  href="/diagnostico"
                  aria-label={`Evaluar piel para ${product.nombre}`}
                >
                  <span>Evaluar piel</span>
                  <ArrowUpRight />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
