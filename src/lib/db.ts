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

export interface AnomalyPixelCounts {
  [anomaly: string]: number;
}

export async function getProductsByImperfections(
  anomalies: string[],
  pixelCounts?: AnomalyPixelCounts
): Promise<SkincareProduct[]> {
  try {
    console.log('Querying Neon database for anomalies:', anomalies, 'with pixel counts:', pixelCounts);

    // Normalize anomaly names (acne, manchas, arrugas)
    const normalizedAnomalies = Array.from(new Set(
      anomalies.map(a => a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))
    ));

    // Calculate severity weight per anomaly based on pixel counts
    const anomalyWeights: Record<string, number> = {};
    let totalPixels = 0;

    if (pixelCounts) {
      for (const [key, val] of Object.entries(pixelCounts)) {
        const normKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const px = Number(val) || 0;
        anomalyWeights[normKey] = (anomalyWeights[normKey] || 0) + px;
        totalPixels += px;
      }
    }

    if (totalPixels > 0) {
      for (const key of Object.keys(anomalyWeights)) {
        anomalyWeights[key] = anomalyWeights[key] / totalPixels;
      }
    } else {
      // Fallback equal weights if no pixel counts provided
      const equalWeight = normalizedAnomalies.length > 0 ? 1 / normalizedAnomalies.length : 1;
      for (const a of normalizedAnomalies) {
        anomalyWeights[a] = equalWeight;
      }
    }

    // Expand search terms for DB query
    const searchTerms = Array.from(new Set(
      anomalies.flatMap(a => {
        const normalized = a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (normalized === 'acne') return [a, 'acne', 'Acné', 'acné', 'ACNÉ', 'ACNE'];
        if (normalized === 'manchas') return [a, 'manchas', 'Manchas', 'MANCHAS'];
        if (normalized === 'arrugas') return [a, 'arrugas', 'Arrugas', 'ARRUGAS'];
        return [a];
      })
    ));

    // Query Neon products matching any of the user's anomalies
    let rawProducts = await prisma.producto.findMany({
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

    if (!rawProducts || rawProducts.length === 0) {
      console.log('No specific matches found. Fetching all products from Neon...');
      rawProducts = await prisma.producto.findMany({
        include: {
          productoImperfeccion: {
            include: {
              imperfeccion: true
            }
          }
        }
      });
    }

    // Map DB products to SkincareProduct interface
    const mappedProducts: SkincareProduct[] = rawProducts.map(p => ({
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

    const productsToScore = mappedProducts.length > 0 ? mappedProducts : MOCK_PRODUCTS;

    // --- ALGORITMO DE SCORING PONDERADO + DESEMPATE DE ESPECIFICIDAD ---
    const scoredProducts = productsToScore.map(product => {
      const prodAnomaliesNorm = product.imperfecciones.map(imp =>
        imp.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      );

      // Anomalías coincidentes entre usuario y producto
      const matchedUserAnomalies = normalizedAnomalies.filter(ua => prodAnomaliesNorm.includes(ua));

      // Suma ponderada por porcentaje de píxeles
      let matchScore = 0;
      for (const ma of matchedUserAnomalies) {
        matchScore += anomalyWeights[ma] || 0;
      }

      // Índice de especificidad (Jaccard similarity): evita empates beneficiando al producto enfocado
      const totalProdAnomalies = Math.max(1, prodAnomaliesNorm.length);
      const jaccardSpec = matchedUserAnomalies.length / totalProdAnomalies;

      // Anomalía principal (la de mayor cantidad de píxeles)
      const topAnomaly = Object.keys(anomalyWeights).sort((a, b) => (anomalyWeights[b] || 0) - (anomalyWeights[a] || 0))[0];
      const coversTopAnomaly = topAnomaly && prodAnomaliesNorm.includes(topAnomaly) ? (anomalyWeights[topAnomaly] || 0) : 0;

      // Score final compuesto
      const finalScore = matchScore * 1000 + jaccardSpec * 100 + coversTopAnomaly * 10;

      return {
        product,
        finalScore,
        matchScore,
        jaccardSpec,
        coversTopAnomaly,
        matchedCount: matchedUserAnomalies.length
      };
    });

    // Filtrar estrictamente: solo incluir productos que tratan AL MENOS UNA de las anomalías detectadas del usuario
    const matchingOnlyScored = scoredProducts.filter(sp => {
      if (normalizedAnomalies.length === 0) return true;
      return sp.matchedCount > 0;
    });

    // Ordenar de mayor a menor score de afinidad
    matchingOnlyScored.sort((a, b) => {
      const scoreDiff = b.finalScore - a.finalScore;
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      
      const matchDiff = b.matchScore - a.matchScore;
      if (Math.abs(matchDiff) > 0.001) return matchDiff;
      
      const specDiff = b.jaccardSpec - a.jaccardSpec;
      if (Math.abs(specDiff) > 0.001) return specDiff;
      
      return 0;
    });

    // Retornar solo los productos correspondientes a esas anomalías
    return matchingOnlyScored.map(sp => sp.product);

  } catch (error) {
    console.error('Database query error details:', error);
    return MOCK_PRODUCTS;
  }
}

export async function getAllProducts(): Promise<SkincareProduct[]> {
  try {
    const rawProducts = await prisma.producto.findMany({
      include: {
        productoImperfeccion: {
          include: {
            imperfeccion: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    if (!rawProducts || rawProducts.length === 0) {
      return MOCK_PRODUCTS;
    }

    return rawProducts.map(p => ({
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
    console.error('Error fetching all products:', error);
    return MOCK_PRODUCTS;
  }
}
