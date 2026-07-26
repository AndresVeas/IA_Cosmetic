import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkImperfections() {
  const imps = await prisma.imperfeccion.findMany();
  console.log('--- ALL IMPERFECCIONES IN NEON DB ---');
  console.log(imps);

  const sampleProducts = await prisma.producto.findMany({
    take: 10,
    include: {
      productoImperfeccion: {
        include: {
          imperfeccion: true
        }
      }
    }
  });

  console.log('\n--- SAMPLE 10 PRODUCTS AND THEIR IMPERFECCIONES ---');
  sampleProducts.forEach(p => {
    console.log(`Product "${p.nombre}":`, p.productoImperfeccion.map(pi => pi.imperfeccion?.nombre));
  });

  await prisma.$disconnect();
}

checkImperfections().catch(err => {
  console.error(err);
  prisma.$disconnect();
});
