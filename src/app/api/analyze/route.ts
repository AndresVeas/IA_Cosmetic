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

    let anomaliesArray: string[] = [];
    let visualOverlay: any[] = [];
    let maskImage: string | null = null;
    let isRealInference = false;

    // Intentar consultar el servidor de FastAPI (Python)
    try {
      const fastapiUrl = process.env.FASTAPI_URL || 'http://localhost:8000';
      const targetUrl = `${fastapiUrl.replace(/\/$/, '')}/analyze`;
      console.log(`Enviando imagen al servidor FastAPI (${targetUrl})...`);
      
      const apiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image })
      });

      if (apiResponse.ok) {
        const mlResults = await apiResponse.json();
        anomaliesArray = mlResults.anomalies;
        visualOverlay = mlResults.visualOverlay;
        maskImage = mlResults.maskImage || null;
        isRealInference = true;
        console.log('Inferencia real completada por FastAPI. Detectado:', anomaliesArray);
      } else {
        console.warn('El servidor FastAPI respondió con un error. Código:', apiResponse.status);
      }
    } catch (err) {
      console.warn(`No se pudo conectar con FastAPI. Ejecutando simulación fallback (¿Está encendido el servidor Python?)`);
    }

    // Si la inferencia real no funcionó o falló la conexión, retrocedemos al simulador aleatorio
    if (!isRealInference) {
      const pool = ['acne', 'manchas', 'arrugas'];
      const count = Math.floor(Math.random() * 2) + 1; // 1 o 2 anomalías aleatorias
      const shuffled = [...pool].sort(() => 0.5 - Math.random());
      const simulatedAnomalies = shuffled.slice(0, count);

      if (Math.random() > 0.5 && !simulatedAnomalies.includes('acne')) {
        simulatedAnomalies.push('acne');
      }
      if (Math.random() > 0.5 && !simulatedAnomalies.includes('manchas')) {
        simulatedAnomalies.push('manchas');
      }

      anomaliesArray = Array.from(new Set(simulatedAnomalies));

      // Coordenadas simuladas para el fallback
      anomaliesArray.forEach((type, index) => {
        if (type === 'acne') {
          visualOverlay.push(
            { type: 'acne', x: 220, y: 280, radius: 14, label: `Acné Pápula (Simulado) #${index + 1}` },
            { type: 'acne', x: 410, y: 310, radius: 18, label: `Acné Pústula (Simulado) #${index + 2}` }
          );
        } else if (type === 'manchas') {
          visualOverlay.push(
            { type: 'manchas', x: 280, y: 220, radius: 22, label: `Hiperpigmentación (Simulado) #${index + 1}` },
            { type: 'manchas', x: 380, y: 250, radius: 16, label: `Lentigo Solar (Simulado) #${index + 2}` }
          );
        } else if (type === 'arrugas') {
          visualOverlay.push(
            { type: 'arrugas', x: 320, y: 140, radius: 30, label: `Línea de Expresión (Simulado) #${index + 1}` },
            { type: 'arrugas', x: 450, y: 210, radius: 20, label: `Línea Periocular (Simulado) #${index + 2}` }
          );
        }
      });
      // Crear una máscara SVG simulada para el fallback
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" width="640" height="480">`;
      visualOverlay.forEach((overlay) => {
        let color = '#e76f73'; // acne
        if (overlay.type === 'manchas') color = '#48a783';
        if (overlay.type === 'arrugas') color = '#8975e8';
        svgContent += `<circle cx="${overlay.x}" cy="${overlay.y}" r="${overlay.radius * 2}" fill="${color}" fill-opacity="0.55" />`;
      });
      svgContent += `</svg>`;
      maskImage = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    }

    // Generar narrativa de recomendaciones según las anomalías
    const recommendationText = generateRecommendationText(anomaliesArray, isRealInference);

    // Obtener productos relacionados de la base de datos (PostgreSQL/Prisma)
    const products = await getProductsByImperfections(anomaliesArray);

    const sortedProducts = [...products].sort((a, b) => {
      const aMatches = a.imperfecciones.filter(imp => anomaliesArray.includes(imp)).length;
      const bMatches = b.imperfecciones.filter(imp => anomaliesArray.includes(imp)).length;
      return bMatches - aMatches;
    });

    return NextResponse.json({
      anomalies: anomaliesArray,
      visualOverlay,
      recommendation: recommendationText,
      products: sortedProducts,
      maskImage
    });

  } catch (error) {
    console.error('Error en analyze API route:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el diagnóstico dermo-cosmético.' },
      { status: 500 }
    );
  }
}

function generateRecommendationText(anomalies: string[], isReal: boolean): string {
  const sourceText = isReal 
    ? 'Basado en el análisis de visión computacional de tu modelo U-Net integrado en IA_Cosmetic,' 
    : 'Basado en el análisis simulado de visión computacional de IA_Cosmetic,';
    
  let recommendationText = `${sourceText} se presenta el siguiente diagnóstico dermo-cosmético:\n\n`;

  if (anomalies.includes('acne') && anomalies.includes('manchas')) {
    recommendationText += 'Se observa una combinación de brotes activos de acné junto con manchas post-inflamatorias e hiperpigmentación. Recomendamos priorizar la regulación del sebo y la reparación de la barrera cutánea sin descuidar el desvanecimiento de manchas. La Niacinamide es tu ingrediente principal recomendado, ya que trata ambas condiciones simultáneamente de manera gentil.';
  } else if (anomalies.includes('acne')) {
    recommendationText += 'Se identifican zonas con exceso de sebo y poros obstruidos propensos a brotes de acné inflamatorio. Se recomienda una rutina enfocada en la exfoliación química suave con beta-hidroxiácidos (como el Ácido Salicílico) y agentes calmantes que impidan la proliferación bacteriana y desinflamen los poros.';
  } else if (anomalies.includes('manchas') && anomalies.includes('arrugas')) {
    recommendationText += 'Se aprecian signos mixtos de fotoenvejecimiento, manifestados en manchas solares localizadas y pérdida de firmeza con líneas de expresión marcadas. Sugerimos un enfoque regenerativo y protector: Vitamina C por la mañana para iluminar y proteger de los radicales libres, y Péptidos o Retinol por la noche para reactivar la producción de colágeno.';
  } else if (anomalies.includes('manchas')) {
    recommendationText += 'El análisis detecta un tono de piel irregular debido a la presencia de hiperpigmentación melánica y manchas solares. Es fundamental incorporar antioxidantes iluminadores como la Vitamina C en tu rutina diurna y despigmentantes reguladores de melanina, acompañados siempre de protector solar de amplio espectro.';
  } else if (anomalies.includes('arrugas')) {
    recommendationText += 'Se visualizan líneas de expresión en la frente y patas de gallo debido a la disminución del colágeno y deshidratación transepidérmica. Recomendamos tratamientos enfocados en la redensificación celular (Retinol) y humectación profunda con base de multipéptidos y ácido hialurónico.';
  } else {
    recommendationText += 'Tu piel muestra un balance saludable en general. Para mantenimiento preventivo, te sugerimos una rutina basada en hidratación profunda y protección antioxidante diaria.';
  }

  recommendationText += '\n\nCompleta tu rutina con los siguientes productos de nuestro catálogo Neon PostgreSQL recomendados para tu tipo de piel:';
  return recommendationText;
}
