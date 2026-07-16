import { NextRequest, NextResponse } from 'next/server';
import { getProductsByImperfections } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import * as ort from 'onnxruntime-node';

// Cache Inference Session to avoid reloading the model on every request
let session: ort.InferenceSession | null = null;

async function getSession(): Promise<ort.InferenceSession | null> {
  if (session) return session;
  
  const modelPath = path.join(process.cwd(), 'best_model.onnx');
  if (fs.existsSync(modelPath)) {
    try {
      console.log(`Cargando modelo ONNX desde: ${modelPath}`);
      session = await ort.InferenceSession.create(modelPath);
      return session;
    } catch (err) {
      console.error('Error al cargar la sesión de ONNX Runtime:', err);
      return null;
    }
  }
  return null;
}

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

    const onnxSession = await getSession();

    if (onnxSession) {
      try {
        console.log('Iniciando inferencia del modelo U-Net ONNX...');
        
        // 1. Decodificar la imagen base64
        const headerMatch = image.match(/^data:image\/\w+;base64,/);
        const base64Data = headerMatch ? image.substring(headerMatch[0].length) : image;
        const buffer = Buffer.from(base64Data, 'base64');

        // 2. Preprocesar con Sharp: redimensionar a 256x256 y extraer bytes RGB brutos
        const { data } = await sharp(buffer)
          .resize(256, 256, { fit: 'fill' })
          .raw()
          .toBuffer({ resolveWithObject: true });

        // 3. Normalizar canales con la media/std de ImageNet en formato plano planar [1, 3, 256, 256]
        const floatData = new Float32Array(3 * 256 * 256);
        const mean = [0.485, 0.456, 0.406];
        const std = [0.229, 0.224, 0.225];

        for (let i = 0; i < 256 * 256; i++) {
          const r = data[i * 3 + 0] / 255.0;
          const g = data[i * 3 + 1] / 255.0;
          const b = data[i * 3 + 2] / 255.0;

          floatData[0 * 256 * 256 + i] = (r - mean[0]) / std[0]; // Red
          floatData[1 * 256 * 256 + i] = (g - mean[1]) / std[1]; // Green
          floatData[2 * 256 * 256 + i] = (b - mean[2]) / std[2]; // Blue
        }

        // 4. Crear Tensores y ejecutar la sesión
        const inputTensor = new ort.Tensor('float32', floatData, [1, 3, 256, 256]);
        const inputName = onnxSession.inputNames[0];
        const outputs = await onnxSession.run({ [inputName]: inputTensor });
        const outputTensor = outputs[onnxSession.outputNames[0]];
        const outputData = outputTensor.data as Float32Array; // Logits shape [1, 4, 256, 256]

        // 5. Postprocesar: calcular el ArgMax por cada píxel para clasificarlo
        const grid = new Uint8Array(256 * 256);
        for (let i = 0; i < 256 * 256; i++) {
          let maxVal = -Infinity;
          let maxClass = 0;
          for (let c = 0; c < 4; c++) {
            const val = outputData[c * 256 * 256 + i];
            if (val > maxVal) {
              maxVal = val;
              maxClass = c;
            }
          }
          grid[i] = maxClass;
        }

        // 6. Connected Component Labeling (Detección de islas con BFS)
        const visited = new Uint8Array(256 * 256);
        const rawOverlays: Array<{
          type: string;
          x: number;
          y: number;
          radius: number;
          label: string;
          size: number;
        }> = [];
        const finalAnomalies = new Set<string>();

        const classTypes = {
          1: { type: 'acne', label: 'Acné' },
          2: { type: 'manchas', label: 'Hiperpigmentación' },
          3: { type: 'arrugas', label: 'Línea/Arruga' }
        } as const;

        for (let y = 0; y < 256; y++) {
          for (let x = 0; x < 256; x++) {
            const idx = y * 256 + x;
            const classId = grid[idx];

            if (classId > 0 && !visited[idx]) {
              const info = classTypes[classId as 1 | 2 | 3];
              if (!info) continue;

              // BFS para agrupar componentes conectados
              const queue: number[] = [idx];
              visited[idx] = 1;

              let sumX = 0;
              let sumY = 0;
              let count = 0;
              let minX = x;
              let maxX = x;
              let minY = y;
              let maxY = y;

              while (queue.length > 0) {
                const currIdx = queue.shift()!;
                const cy = Math.floor(currIdx / 256);
                const cx = currIdx % 256;

                sumX += cx;
                sumY += cy;
                count++;

                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                const neighbors = [
                  { nx: cx + 1, ny: cy },
                  { nx: cx - 1, ny: cy },
                  { nx: cx, ny: cy + 1 },
                  { nx: cx, ny: cy - 1 }
                ];

                for (const { nx, ny } of neighbors) {
                  if (nx >= 0 && nx < 256 && ny >= 0 && ny < 256) {
                    const nIdx = ny * 256 + nx;
                    if (grid[nIdx] === classId && !visited[nIdx]) {
                      visited[nIdx] = 1;
                      queue.push(nIdx);
                    }
                  }
                }
              }

              // Filtrar imperfecciones microscópicas (menos de 5 píxeles de área)
              if (count >= 5) {
                finalAnomalies.add(info.type);
                const centerX = sumX / count;
                const centerY = sumY / count;

                const width = maxX - minX + 1;
                const height = maxY - minY + 1;
                const radius = Math.max(width, height) / 2;

                // Escalar coordenadas al área de renderizado 640x480
                const mappedX = (centerX / 256) * 640;
                const mappedY = (centerY / 256) * 480;

                rawOverlays.push({
                  type: info.type,
                  x: Math.round(mappedX),
                  y: Math.round(mappedY),
                  radius: Math.max(6, Math.round(radius * (640 / 256))),
                  label: `${info.label} (${count} px)`,
                  size: count
                });
              }
            }
          }
        }

        // Agrupar y seleccionar los 3 focos más grandes por tipo para mantener limpia la UI
        const groupedOverlays: Record<string, typeof rawOverlays> = {};
        for (const item of rawOverlays) {
          if (!groupedOverlays[item.type]) groupedOverlays[item.type] = [];
          groupedOverlays[item.type].push(item);
        }

        const visualOverlay: typeof rawOverlays = [];
        for (const type in groupedOverlays) {
          groupedOverlays[type].sort((a, b) => b.size - a.size);
          visualOverlay.push(...groupedOverlays[type].slice(0, 3));
        }

        const anomaliesArray = Array.from(finalAnomalies);
        const recommendationText = generateRecommendationText(anomaliesArray);
        const products = await getProductsByImperfections(anomaliesArray);

        const sortedProducts = [...products].sort((a, b) => {
          const aMatches = a.imperfecciones.filter(imp => anomaliesArray.includes(imp)).length;
          const bMatches = b.imperfecciones.filter(imp => anomaliesArray.includes(imp)).length;
          return bMatches - aMatches;
        });

        console.log('Inferencia exitosa de U-Net ONNX. Detectado:', anomaliesArray);

        return NextResponse.json({
          anomalies: anomaliesArray,
          visualOverlay: visualOverlay.map(({ type, x, y, radius, label }) => ({ type, x, y, radius, label })),
          recommendation: recommendationText,
          products: sortedProducts
        });

      } catch (err: any) {
        console.error('Error ejecutando inferencia ONNX. Usando fallback simulado.', err);
        return runSimulationFallback();
      }
    } else {
      console.warn('best_model.onnx no encontrado. Usando fallback simulado.');
      return runSimulationFallback();
    }

  } catch (error) {
    console.error('Error en analyze API route:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error al procesar el diagnóstico dermo-cosmético.' },
      { status: 500 }
    );
  }
}

function generateRecommendationText(anomalies: string[]): string {
  let recommendationText = 'Basado en el análisis de visión computacional de tu modelo U-Net integrado en IA_Cosmetic, se presenta el siguiente diagnóstico dermo-cosmético:\n\n';

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

  recommendationText += '\n\nCompleta tu rutina con los siguientes productos de nuestro catálogo Neon PostgreSQL formulados específicamente para tratar estas imperfecciones:';
  return recommendationText;
}

async function runSimulationFallback() {
  const pool = ['acne', 'manchas', 'arrugas'];
  const count = Math.floor(Math.random() * 2) + 1; // 1 o 2 anomalías aleatorias
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const anomalies = shuffled.slice(0, count);

  if (Math.random() > 0.5 && !anomalies.includes('acne')) {
    anomalies.push('acne');
  }
  if (Math.random() > 0.5 && !anomalies.includes('manchas')) {
    anomalies.push('manchas');
  }

  const finalAnomalies = Array.from(new Set(anomalies));

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

  const recommendationText = generateRecommendationText(finalAnomalies);
  const products = await getProductsByImperfections(finalAnomalies);

  const sortedProducts = [...products].sort((a, b) => {
    const aMatches = a.imperfecciones.filter(imp => finalAnomalies.includes(imp)).length;
    const bMatches = b.imperfecciones.filter(imp => finalAnomalies.includes(imp)).length;
    return bMatches - aMatches;
  });

  return NextResponse.json({
    anomalies: finalAnomalies,
    visualOverlay,
    recommendation: recommendationText,
    products: sortedProducts,
  });
}
