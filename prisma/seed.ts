import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Imperfections
  const acne = await prisma.imperfeccion.upsert({
    where: { nombre: 'acne' },
    update: {},
    create: { nombre: 'acne' },
  });

  const manchas = await prisma.imperfeccion.upsert({
    where: { nombre: 'manchas' },
    update: {},
    create: { nombre: 'manchas' },
  });

  const arrugas = await prisma.imperfeccion.upsert({
    where: { nombre: 'arrugas' },
    update: {},
    create: { nombre: 'arrugas' },
  });

  console.log('Imperfections seeded.');

  // 2. Define Products Data
  const productsData = [
    {
      nombre: 'IA Cosmetic Sérum Niacinamide 10% + Zinc 1%',
      marca: 'IA_Cosmetic',
      descripcion: 'Sérum multifuncional regulador del sebo y unificador de tono. Trata imperfecciones activas y reduce hiperpigmentación de forma simultánea.',
      precio: 38.00,
      imagenUrl: '/products/niacinamide.png',
      imperfecciones: ['acne', 'manchas']
    },
    {
      nombre: 'IA Cosmetic Gel Limpiador Ácido Salicílico',
      marca: 'IA_Cosmetic',
      descripcion: 'Limpiador purificante profundo con BHA para destapar poros obstruidos, controlar la producción de grasa y reducir brotes.',
      precio: 26.50,
      imagenUrl: '/products/cleanser.png',
      imperfecciones: ['acne']
    },
    {
      nombre: 'IA Cosmetic Corrector Antimanchas Vitamina C',
      marca: 'IA_Cosmetic',
      descripcion: 'Potente sérum iluminador antioxidante que desvanece manchas oscuras y combate el daño de los radicales libres.',
      precio: 45.00,
      imagenUrl: '/products/vitc.png',
      imperfecciones: ['manchas']
    },
    {
      nombre: 'IA Cosmetic Crema Regeneradora Retinol 0.5%',
      marca: 'IA_Cosmetic',
      descripcion: 'Tratamiento restaurador nocturno que estimula la renovación celular, suavizando arrugas finas y mejorando la textura.',
      precio: 52.00,
      imagenUrl: '/products/retinol.png',
      imperfecciones: ['arrugas']
    },
    {
      nombre: 'IA Cosmetic Crema Hidratante Multipéptidos + AH',
      marca: 'IA_Cosmetic',
      descripcion: 'Crema ultra nutritiva que rellena líneas de expresión y unifica el tono hidratando a múltiples profundidades.',
      precio: 48.00,
      imagenUrl: '/products/multipeptides.png',
      imperfecciones: ['arrugas', 'manchas']
    }
  ];

  // 3. Insert and associate products
  for (const prod of productsData) {
    const existingProduct = await prisma.producto.findFirst({
      where: { nombre: prod.nombre }
    });

    let product;
    if (existingProduct) {
      product = await prisma.producto.update({
        where: { id: existingProduct.id },
        data: {
          marca: prod.marca,
          descripcion: prod.descripcion,
          precio: prod.precio,
          imagenUrl: prod.imagenUrl,
        }
      });
      // Clear previous relations to rebuild
      await prisma.productoImperfeccion.deleteMany({
        where: { productoId: product.id }
      });
    } else {
      product = await prisma.producto.create({
        data: {
          nombre: prod.nombre,
          marca: prod.marca,
          descripcion: prod.descripcion,
          precio: prod.precio,
          imagenUrl: prod.imagenUrl,
        }
      });
    }

    // Connect to imperfections
    for (const impName of prod.imperfecciones) {
      const imp = impName === 'acne' ? acne : impName === 'manchas' ? manchas : arrugas;
      await prisma.productoImperfeccion.create({
        data: {
          productoId: product.id,
          imperfeccionId: imp.id
        }
      });
    }
  }

  console.log('Products seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
