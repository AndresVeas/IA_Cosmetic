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

// Mock data to fallback in case the Neon database connection fails (e.g. invalid connection string)
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
    // Attempt database call
    console.log('Querying database for anomalies:', anomalies);
    
    // Find all products that treat any of these imperfections
    const products = await prisma.producto.findMany({
      where: {
        productoImperfeccion: {
          some: {
            imperfeccion: {
              nombre: {
                in: anomalies
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
    }) as any[];

    if (!products || products.length === 0) {
      // If db connection succeeded but empty (e.g. not seeded yet), fallback to filtered mocks
      return MOCK_PRODUCTS.filter(p => 
        p.imperfecciones.some(imp => anomalies.includes(imp))
      );
    }

    // Format products to match standard output structure
    return products.map(p => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca,
      descripcion: p.descripcion,
      precio: Number(p.precio),
      imagenUrl: p.imagenUrl,
      imperfecciones: Array.isArray(p.productoImperfeccion)
        ? p.productoImperfeccion.map((pi: any) => pi.imperfeccion?.nombre || '')
        : []
    }));

  } catch (error) {
    console.warn('Database query failed. Falling back to local mock database. Error details:', error);
    // Connection string is likely invalid or not setup. Return filtered mock data.
    return MOCK_PRODUCTS.filter(p => 
      p.imperfecciones.some(imp => anomalies.includes(imp))
    );
  }
}
