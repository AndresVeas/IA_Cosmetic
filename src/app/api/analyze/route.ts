import { NextRequest, NextResponse } from 'next/server';
import { getProductsByImperfections } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'No se recibió ninguna imagen para analizar.' },
        { status: 400 }
      );
    }

    // Simulate Python Vision API inference delay (e.g., U-Net model processing time)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulate detected anomalies randomly to demonstrate dynamic frontend rendering
    const pool = ['acne', 'manchas', 'arrugas'];
    
    // Select 1 to 3 anomalies
    const count = Math.floor(Math.random() * 2) + 1; // 1 or 2 anomalies
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const anomalies = shuffled.slice(0, count);

    // If both 'acne' and 'manchas' are in the list, prioritize the Niacinamide Star Product
    // Let's ensure there's a good mix
    if (Math.random() > 0.5 && !anomalies.includes('acne')) {
      anomalies.push('acne');
    }
    if (Math.random() > 0.5 && !anomalies.includes('manchas')) {
      anomalies.push('manchas');
    }

    // De-duplicate anomalies
    const finalAnomalies = Array.from(new Set(anomalies));

    // Generate coordinate masks for canvas drawing based on typical face coordinates (assuming a 640x480 resolution)
    const visualOverlay: Array<{
      type: string;
      x: number;
      y: number;
      radius: number;
      label: string;
    }> = [];

    finalAnomalies.forEach((type, index) => {
      if (type === 'acne') {
        visualOverlay.push(
          { type: 'acne', x: 220, y: 280, radius: 14, label: `Acné Pápula #${index + 1}` },
          { type: 'acne', x: 410, y: 310, radius: 18, label: `Acné Pústula #${index + 2}` }
        );
      } else if (type === 'manchas') {
        visualOverlay.push(
          { type: 'manchas', x: 280, y: 220, radius: 22, label: `Hiperpigmentación #${index + 1}` },
          { type: 'manchas', x: 380, y: 250, radius: 16, label: `Lentigo Solar #${index + 2}` }
        );
      } else if (type === 'arrugas') {
        visualOverlay.push(
          { type: 'arrugas', x: 320, y: 140, radius: 30, label: `Línea de Expresión (Frente) #${index + 1}` },
          { type: 'arrugas', x: 450, y: 210, radius: 20, label: `Línea Periocular (Pata de gallo) #${index + 2}` }
        );
      }
    });

    // Generate doctor-style skin diagnosis narrative
    let recommendationText = 'Basado en el análisis de visión computacional del Lumière Lab, se presenta el siguiente diagnóstico dermo-cosmético:\n\n';

    if (finalAnomalies.includes('acne') && finalAnomalies.includes('manchas')) {
      recommendationText += 'Se observa una combinación de brotes activos de acné junto con manchas post-inflamatorias e hiperpigmentación. Recomendamos priorizar la regulación del sebo y la reparación de la barrera cutánea sin descuidar el desvanecimiento de manchas. La Niacinamide es tu ingrediente principal recomendado, ya que trata ambas condiciones simultáneamente de manera gentil.';
    } else if (finalAnomalies.includes('acne')) {
      recommendationText += 'Se identifican zonas con exceso de sebo y poros obstruidos propensos a brotes de acné inflamatorio. Se recomienda una rutina enfocada en la exfoliación química suave con beta-hidroxiácidos (como el Ácido Salicílico) y agentes calmantes que impidan la proliferación bacteriana y desinflamen los poros.';
    } else if (finalAnomalies.includes('manchas') && finalAnomalies.includes('arrugas')) {
      recommendationText += 'Se aprecian signos mixtos de fotoenvejecimiento, manifestados en manchas solares localizadas y pérdida de firmeza con líneas de expresión marcadas. Sugerimos un enfoque regenerativo y protector: Vitamina C por la mañana para iluminar y proteger de los radicales libres, y Péptidos o Retinol por la noche para reactivar la producción de colágeno.';
    } else if (finalAnomalies.includes('manchas')) {
      recommendationText += 'El análisis detecta un tono de piel irregular debido a la presencia de hiperpigmentación melánica y manchas solares. Es fundamental incorporar antioxidantes iluminadores como la Vitamina C en tu rutina diurna y despigmentantes reguladores de melanina, acompañados siempre de protector solar de amplio espectro.';
    } else if (finalAnomalies.includes('arrugas')) {
      recommendationText += 'Se visualizan líneas de expresión en la frente y patas de gallo debido a la disminución del colágeno y deshidratación transepidérmica. Recomendamos tratamientos enfocados en la redensificación celular (Retinol) y humectación profunda con base de multipéptidos y ácido hialurónico.';
    } else {
      recommendationText += 'Tu piel muestra un balance saludable en general. Para mantenimiento preventivo, te sugerimos una rutina basada en hidratación profunda y protección antioxidante diaria.';
    }

    recommendationText += '\n\nCompleta tu rutina con los siguientes productos formulados específicamente para tratar estas imperfecciones de forma científica:';

    // Fetch related products from database/mock
    const products = await getProductsByImperfections(finalAnomalies);

    // Sort products: Stars or items treating MULTIPLE anomalies should appear first
    const sortedProducts = [...products].sort((a, b) => {
      const aMatches = a.imperfecciones.filter(imp => finalAnomalies.includes(imp)).length;
      const bMatches = b.imperfecciones.filter(imp => finalAnomalies.includes(imp)).length;
      return bMatches - aMatches; // Descending
    });

    return NextResponse.json({
      anomalies: finalAnomalies,
      visualOverlay,
      recommendation: recommendationText,
      products: sortedProducts,
    });
  } catch (error) {
    console.error('Error in analyze API route:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el diagnóstico dermo-cosmético.' },
      { status: 500 }
    );
  }
}
