import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export interface SkincareProduct {
  id: string;
  nombre: string;
  marca: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  imperfecciones: string[];
}

// Mock data to fallback ONLY in case the database connection physically fails
export const MOCK_PRODUCTS: SkincareProduct[] = [
  {
    id: "mock-niacinamide",
    nombre: 'IA Cosmetic Sérum Niacinamide 10% + Zinc 1%',
    marca: 'IA_Cosmetic',
    descripcion: 'Sérum multifuncional regulador del sebo y unificador de tono. Trata imperfecciones activas y reduce hiperpigmentación de forma simultánea.',
    precio: 38.00,
    imagenUrl: '/products/niacinamide.png',
    imperfecciones: ['acne', 'manchas']
  },
  {
    id: "mock-cleanser",
    nombre: 'IA Cosmetic Gel Limpiador Ácido Salicílico',
    marca: 'IA_Cosmetic',
    descripcion: 'Limpiador purificante profundo con BHA para destapar poros obstruidos, controlar la producción de grasa y reducir brotes.',
    precio: 26.50,
    imagenUrl: '/products/cleanser.png',
    imperfecciones: ['acne']
  },
  {
    id: "mock-vitc",
    nombre: 'IA Cosmetic Corrector Antimanchas Vitamina C',
    marca: 'IA_Cosmetic',
    descripcion: 'Potente sérum iluminador antioxidante que desvanece manchas oscuras y combate el daño de los radicales libres.',
    precio: 45.00,
    imagenUrl: '/products/vitc.png',
    imperfecciones: ['manchas']
  },
  {
    id: "mock-retinol",
    nombre: 'IA Cosmetic Crema Regeneradora Retinol 0.5%',
    marca: 'IA_Cosmetic',
    descripcion: 'Tratamiento restaurador nocturno que estimula la renovación celular, suavizando arrugas finas y mejorando la textura.',
    precio: 52.00,
    imagenUrl: '/products/retinol.png',
    imperfecciones: ['arrugas']
  },
  {
    id: "mock-multipeptides",
    nombre: 'IA Cosmetic Crema Hidratante Multipéptidos + AH',
    marca: 'IA_Cosmetic',
    descripcion: 'Crema ultra nutritiva que rellena líneas de expresión y unifica el tono hidratando a múltiples profundidades.',
    precio: 48.00,
    imagenUrl: '/products/multipeptides.png',
    imperfecciones: ['arrugas', 'manchas']
  }
];

export async function getProductsByImperfections(anomalies: string[]): Promise<SkincareProduct[]> {
  try {
    console.log('Querying Neon database for anomalies:', anomalies);

    // Expand search terms to cover variations with/without accents (e.g. 'acne' vs 'Acné')
    const searchTerms = Array.from(new Set(
      anomalies.flatMap(a => {
        const normalized = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized === 'acne') return [a, 'acne', 'Acné', 'acné', 'ACNÉ', 'ACNE'];
        if (normalized === 'manchas') return [a, 'manchas', 'Manchas', 'MANCHAS'];
        if (normalized === 'arrugas') return [a, 'arrugas', 'Arrugas', 'ARRUGAS'];
        return [a];
      })
    ));

    // Query Neon products matching anomalies
    const products = await prisma.producto.findMany({
      where: {
        productoImperfeccion: {
          some: {
            imperfeccion: {
              nombre: {
                in: searchTerms,
                mode: 'insensitive'
              }
            }
          }
        }
      },
      include: {
        productoImperfeccion: {
          include: {
            imperfeccion: true
          }
        }
      }
    });

    if (!products || products.length === 0) {
      console.log('No specific matches found for anomalies. Fetching all products from Neon...');
      const allProducts = await prisma.producto.findMany({
        include: {
          productoImperfeccion: {
            include: {
              imperfeccion: true
            }
          }
        }
      });

      if (allProducts && allProducts.length > 0) {
        return allProducts.map(p => ({
          id: String(p.id),
          nombre: p.nombre,
          marca: p.marca || 'IA_Cosmetic',
          descripcion: p.descripcion || '',
          precio: p.precio ? Number(p.precio) : 0,
          imagenUrl: p.imagenUrl || '/products/default.png',
          imperfecciones: Array.isArray(p.productoImperfeccion)
            ? p.productoImperfeccion.map(pi => pi.imperfeccion?.nombre || '')
            : []
        }));
      }

      return MOCK_PRODUCTS.filter(p => 
        p.imperfecciones.some(imp => anomalies.includes(imp))
      );
    }

    return products.map(p => ({
      id: String(p.id),
      nombre: p.nombre,
      marca: p.marca || 'IA_Cosmetic',
      descripcion: p.descripcion || '',
      precio: p.precio ? Number(p.precio) : 0,
      imagenUrl: p.imagenUrl || '/products/default.png',
      imperfecciones: Array.isArray(p.productoImperfeccion)
        ? p.productoImperfeccion.map(pi => pi.imperfeccion?.nombre || '')
        : []
    }));

  } catch (error) {
    console.error('Database query error details:', error);
    return MOCK_PRODUCTS.filter(p => 
      p.imperfecciones.some(imp => anomalies.includes(imp))
    );
  }
}
