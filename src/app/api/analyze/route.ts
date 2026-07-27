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
    let pixelCounts: Record<string, number> = {};
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
        pixelCounts = mlResults.pixelCounts || {};
        isRealInference = true;
        console.log('Inferencia real completada por FastAPI. Detectado:', anomaliesArray, 'Píxeles:', pixelCounts);
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
          pixelCounts['acne'] = 1200;
        } else if (type === 'manchas') {
          visualOverlay.push(
            { type: 'manchas', x: 280, y: 220, radius: 22, label: `Hiperpigmentación (Simulado) #${index + 1}` },
            { type: 'manchas', x: 380, y: 250, radius: 16, label: `Lentigo Solar (Simulado) #${index + 2}` }
          );
          pixelCounts['manchas'] = 800;
        } else if (type === 'arrugas') {
          visualOverlay.push(
            { type: 'arrugas', x: 320, y: 140, radius: 30, label: `Línea de Expresión (Simulado) #${index + 1}` },
            { type: 'arrugas', x: 450, y: 210, radius: 20, label: `Línea Periocular (Simulado) #${index + 2}` }
          );
          pixelCounts['arrugas'] = 500;
        }
      });
      // Crear una máscara SVG simulada para el fallback
      let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">`;
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
    const recommendationText = generateRecommendationText(anomaliesArray);

    // Obtener productos relacionados de la base de datos (PostgreSQL/Prisma) usando ranking ponderado + especificidad
    const products = await getProductsByImperfections(anomaliesArray, pixelCounts);

    return NextResponse.json({
      anomalies: anomaliesArray,
      visualOverlay,
      recommendation: recommendationText,
      products,
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

function formatElegantList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`;
}

function generateRecommendationText(anomalies: string[]): string {
  const indicatorMeta: Record<string, { label: string; focus: string }> = {
    acne: {
      label: 'acné',
      focus: 'el equilibrio y el confort de las zonas con tendencia a imperfecciones',
    },
    manchas: {
      label: 'manchas',
      focus: 'la uniformidad y la luminosidad del tono',
    },
    arrugas: {
      label: 'líneas de expresión',
      focus: 'la hidratación, la suavidad y la apariencia de las líneas visibles',
    },
  };

  const uniqueIndicators = Array.from(new Set(anomalies.map((item) => item.toLowerCase())));
  const labels = uniqueIndicators.map((item) => indicatorMeta[item]?.label ?? item);
  const focusAreas = uniqueIndicators
    .map((item) => indicatorMeta[item]?.focus)
    .filter((item): item is string => Boolean(item));

  const indicatorSummary = labels.length > 0
    ? `La lectura visual de tu piel destaca indicadores relacionados con ${formatElegantList(labels)}. Estos hallazgos se presentan como una guía para comprender con mayor claridad las necesidades que refleja tu piel en este momento.`
    : 'La lectura visual refleja una apariencia equilibrada, sin indicadores destacados dentro de las categorías evaluadas.';

  const careSummary = focusAreas.length > 0
    ? `A partir de esta combinación, el cuidado puede orientarse hacia ${formatElegantList(focusAreas)}. Una rutina progresiva, respetuosa y constante ayudará a acompañar estas necesidades sin sobrecargar la piel.`
    : 'Como cuidado general, se recomienda priorizar una rutina sencilla basada en hidratación, protección diaria y constancia.';

  return [
    indicatorSummary,
    careSummary,
    'A continuación encontrarás una selección de productos alineada con los indicadores identificados.',
    'Este análisis es orientativo y complementa, pero no sustituye, la valoración de un profesional de la salud.',
  ].join('\n\n');
}
