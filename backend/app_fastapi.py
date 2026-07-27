import os
import base64
from datetime import datetime
import uuid
import numpy as np
import cv2
import onnxruntime as ort
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Inicializar FastAPI
app = FastAPI(title="IA_Cosmetic ONNX Inference Server")

# Habilitar CORS para permitir peticiones desde el frontend de Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Variable global para la sesión de ONNX
ort_session = None

@app.on_event("startup")
def load_model():
    global ort_session
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(base_dir, "assemble_super.onnx")
    if not os.path.exists(model_path):
        model_path = os.path.join(base_dir, "best_model_iou.onnx")
    if not os.path.exists(model_path):
        print(f"[!] ADVERTENCIA: No se encontró ningún modelo ONNX en el directorio. La inferencia fallará hasta que esté presente.")
        return

    try:
        print(f"Cargando modelo ONNX definitivo 'assemble_super.onnx' desde '{model_path}' en CPU...")
        # Carga el modelo optimizado utilizando el proveedor de CPU para inferencia ultra-rápida y ligera
        ort_session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        print("¡Modelo assemble_super.onnx cargado en memoria exitosamente y listo para inferencias!")
    except Exception as e:
        print(f"Error crítico al cargar el modelo ONNX: {str(e)}")

def preprocess_pass_arrugas(img_rgb: np.ndarray) -> np.ndarray:
    """PASADA 1: Enfoque suave de arrugas (CLAHE 2.0 en LAB sin artefactos de bordes)."""
    img_dark = cv2.convertScaleAbs(img_rgb, alpha=0.92, beta=0)
    lab = cv2.cvtColor(img_dark, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return cv2.cvtColor(cv2.merge((clahe.apply(l), a, b)), cv2.COLOR_LAB2RGB)

def preprocess_pass_acne(img_rgb: np.ndarray) -> np.ndarray:
    """PASADA 2: Aislamiento eritematoso moderado (+25% saturación HSV)."""
    hsv = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.25, 0, 255)
    return cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)

def preprocess_pass_manchas(img_rgb: np.ndarray) -> np.ndarray:
    """PASADA 3: Exposición equilibrada (0.85) y CLAHE moderado (2.2)."""
    img_dark = cv2.convertScaleAbs(img_rgb, alpha=0.85, beta=0)
    lab = cv2.cvtColor(img_dark, cv2.COLOR_RGB2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    return cv2.cvtColor(cv2.merge((clahe.apply(l), a, b)), cv2.COLOR_LAB2RGB)

class AnalysisRequest(BaseModel):
    image: str  # Base64 string

@app.post("/analyze")
def analyze_skin(payload: AnalysisRequest):
    data_payload = payload
    if not data_payload or not data_payload.image:
        raise HTTPException(status_code=400, detail="No se recibió ninguna imagen en formato base64.")

    global ort_session
    if ort_session is None:
        raise HTTPException(status_code=503, detail="El modelo ONNX no está cargado. Verifica que best_model.onnx exista en la raíz.")

    try:
        # 1. Decodificar la imagen base64
        image_str = data_payload.image
        if "," in image_str:
            header, image_str = image_str.split(",", 1)
        
        img_data = base64.b64decode(image_str)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("No se pudo decodificar la imagen recibida.")
            
        h_orig, w_orig = img.shape[:2]

        # Recorte del cuadrado central 1:1 en caso de recibir una foto rectangular para evitar deformar las proporciones del rostro
        if h_orig != w_orig:
            min_dim = min(h_orig, w_orig)
            start_x = (w_orig - min_dim) // 2
            start_y = (h_orig - min_dim) // 2
            img = img[start_y : start_y + min_dim, start_x : start_x + min_dim]
            h_orig, w_orig = min_dim, min_dim

        # 1. Redimensionar el encuadre cuadrado 1:1 a 512x512 sin deformación
        img_512_bgr = cv2.resize(img, (512, 512), interpolation=cv2.INTER_AREA if (h_orig > 512) else cv2.INTER_CUBIC)

        # 2. Extraer región facial magnificada (zoom interno para máxima sensibilidad de la U-Net)
        min_x_f = int(512 * 0.04)
        max_x_f = int(512 * 0.96)
        min_y_f = int(512 * 0.04)
        max_y_f = int(512 * 0.96)
        w_face = max_x_f - min_x_f
        h_face = max_y_f - min_y_f

        face_img_raw = img_512_bgr[min_y_f : max_y_f, min_x_f : max_x_f]
        face_512_bgr_zoomed = cv2.resize(face_img_raw, (512, 512), interpolation=cv2.INTER_CUBIC)

        # 3. Ecualización de contraste CLAHE en canal L (LAB) sobre la imagen magnificada
        img_rgb_for_model = cv2.cvtColor(face_512_bgr_zoomed, cv2.COLOR_BGR2RGB)
        lab = cv2.cvtColor(img_rgb_for_model, cv2.COLOR_RGB2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.3, tileGridSize=(8, 8))
        l_eq = clahe.apply(l_ch)
        face_512_eq = cv2.cvtColor(cv2.merge((l_eq, a_ch, b_ch)), cv2.COLOR_LAB2RGB)

        # 4. Normalización estándar ImageNet sobre la imagen magnificada
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        face_norm = (face_512_eq / 255.0 - mean) / std
        face_tensor = np.transpose(face_norm, (2, 0, 1)).astype(np.float32)
        batch_pure = np.expand_dims(face_tensor, axis=0)  # Shape: [1, 3, 512, 512]

        input_name = ort_session.get_inputs()[0].name
        output_name = ort_session.get_outputs()[0].name

        # 5. Inferencia con la U-Net sobre el rostro magnificado
        raw_logits_512 = ort_session.run([output_name], {input_name: batch_pure})[0][0]  # Shape: [4, 512, 512]

        # 6. Reconstruir los logits magnificados en las coordenadas originales del canvas 1:1 (512x512)
        final_logits = np.zeros((4, 512, 512), dtype=np.float32)
        final_logits[0] = 2.0  # Logit de fondo neutro
        final_logits[1:] = -10.0

        final_logits_face = np.zeros((4, h_face, w_face), dtype=np.float32)
        for c in range(4):
            final_logits_face[c] = cv2.resize(raw_logits_512[c], (w_face, h_face), interpolation=cv2.INTER_LINEAR)

        final_logits[:, min_y_f : max_y_f, min_x_f : max_x_f] = final_logits_face

        # 7. Calcular softmax y argmax sobre la imagen completa 1:1
        logits_exp = np.exp(final_logits - np.max(final_logits, axis=0, keepdims=True))
        probs = logits_exp / np.sum(logits_exp, axis=0, keepdims=True)  # Shape: [4, 512, 512]
        prediction_scaled = np.argmax(final_logits, axis=0).astype(np.uint8)  # Shape: [512, 512]

        # Definir la imagen base BGR no deformada para visualización y guardado
        face_512_bgr = img_512_bgr
        
        # --- FILTRAR DETECCIONES FUERA DE LA GUÍA FACIAL (512x512) ---
        face_guide_mask = np.zeros((512, 512), dtype=np.uint8)
        cv2.ellipse(face_guide_mask, (256, 256), (230, 210), 0, 0, 360, 255, -1)

        # Todo lo que esté fuera del óvalo facial se fuerza a clase 0 (Fondo/Piel Sana)
        prediction_scaled[face_guide_mask == 0] = 0
        for c in range(1, 4):
            probs[c][face_guide_mask == 0] = 0.0
            
        visual_overlay = []
        anomalies_detected = set()
        
        classes_map = {1: "acne", 2: "manchas", 3: "arrugas"}
        labels_map = {1: "Acné", 2: "Hiperpigmentación", 3: "Línea/Arruga"}
        
        # Generar la máscara de segmentación en formato BGRA nativo de OpenCV (para visualización web base64)
        overlay_mask = np.zeros((512, 512, 4), dtype=np.uint8)
        # Generar la máscara de mapa de bits indexada (0: Fondo, 1: Acné, 2: Manchas, 3: Arrugas) para reentrenamiento U-Net
        indexed_mask = np.zeros((512, 512), dtype=np.uint8)
        
        # Colores BGRA (Blue, Green, Red, Alpha) alineados con el sistema de diseño web:
        # 1: Acné -> Rojo Coral (#e76f73) -> B=115, G=111, R=231, A=140
        # 2: Manchas -> Verde Esmeralda (#48a783) -> B=131, G=167, R=72, A=140
        # 3: Arrugas -> Morado/Púrpura (#8975e8) -> B=232, G=117, R=137, A=140
        color_map = {
            1: [115, 111, 231, 140],  # acne (rojo coral #e76f73 en BGRA)
            2: [131, 167, 72, 140],   # manchas (verde esmeralda #48a783 en BGRA)
            3: [232, 117, 137, 140]   # arrugas (morado púrpura #8975e8 en BGRA)
        }
        
        # Umbrales por clase: manchas necesita más confianza para evitar sombras naturales del pómulo/ojeras
        conf_thresholds = {1: 0.25, 2: 0.35, 3: 0.25}  # acne, manchas, arrugas
        # Área mínima por clase: manchas requiere focos más grandes (las sombras difusas suelen ser extensas pero débiles)
        min_area = {1: 15, 2: 60, 3: 15}  # acne, manchas, arrugas
        
        pixel_counts = {}
        # Procesar en orden 2 (Manchas) -> 3 (Arrugas) -> 1 (Acné) para que el Acné (lesión clínica activa) tenga máxima prioridad en solapamientos
        classes_order = [2, 3, 1]
        for class_id in classes_order:
            class_name = classes_map[class_id]
            # Evaluar la máscara de probabilidades directa de cada clase para detectar focos reales sin que una clase opaque a la otra
            raw_class_mask = (probs[class_id] >= conf_thresholds[class_id]).astype(np.uint8)

            # Apertura Morfológica: kernel más grande para manchas (5x5) para eliminar parches difusos de sombra
            k_size = 5 if class_id == 2 else 3
            kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
            raw_class_mask = cv2.morphologyEx(raw_class_mask, cv2.MORPH_OPEN, kernel_open)
            
            # Encontrar contornos sobre la máscara umbralizada
            contours, _ = cv2.findContours(raw_class_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            valid_contours = []
            class_overlays = []
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # Omitir contornos por debajo del área mínima de su clase (15px acné/arrugas, 60px manchas)
                if area < min_area[class_id]:
                    continue
                
                valid_contours.append(cnt)

                # Calcular la confianza/intensidad media de los píxeles de este contorno
                single_contour_mask = np.zeros(raw_class_mask.shape, dtype=np.uint8)
                cv2.drawContours(single_contour_mask, [cnt], -1, 1, thickness=-1)
                mean_conf = np.mean(probs[class_id][single_contour_mask == 1]) if np.sum(single_contour_mask) > 0 else 0.0
                confidence_pct = max(50, int(mean_conf * 100))
                
                # Determinar severidad según el tamaño del foco
                if area < 50:
                    severity = "Leve"
                elif area <= 200:
                    severity = "Moderado"
                else:
                    severity = "Severo"
                
                # Obtener centroide de masa
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                else:
                    (circle_x, circle_y), _ = cv2.minEnclosingCircle(cnt)
                    cx, cy = int(circle_x), int(circle_y)
                
                (_, _), radius = cv2.minEnclosingCircle(cnt)
                
                class_overlays.append({
                    "type": class_name,
                    "x": cx,
                    "y": cy,
                    "radius": max(5, int(radius)),
                    "label": f"Foco {severity} ({int(area)} px) · Confianza: {confidence_pct}%",
                    "size": int(area),
                    "area": int(area),
                    "confidence": confidence_pct,
                    "severity": severity
                })
            
            # Crear la máscara limpia filtrada ÚNICAMENTE con los contornos válidos que superan el área mínima
            cleaned_class_mask = np.zeros(raw_class_mask.shape, dtype=np.uint8)
            if len(valid_contours) > 0:
                cv2.drawContours(cleaned_class_mask, valid_contours, -1, 1, thickness=-1)
                anomalies_detected.add(class_name)
                # Asignar el ID de clase (1: acné, 2: manchas, 3: arrugas) a los píxeles de la máscara indexada
                indexed_mask[cleaned_class_mask == 1] = class_id

            # Pintar la máscara correspondiente a este canal en el overlay usando solo píxeles válidos
            overlay_mask[cleaned_class_mask == 1] = color_map[class_id]
            
            # Contar píxeles activos válidos en la resolución 512x512
            active_pixels = int(np.sum(cleaned_class_mask))
            pixel_counts[class_name] = active_pixels
            print(f"[DEBUG] Clase {class_name.upper()} (512x512): {active_pixels} px válidos en {len(valid_contours)} focos (umbral={conf_thresholds[class_id]}, min_area={min_area[class_id]}px)")

            # Ordenar por tamaño descendente y tomar hasta 8 focos por clase para detallar todas las zonas identificadas
            class_overlays.sort(key=lambda item: item["size"], reverse=True)
            for item in class_overlays[:8]:
                del item["size"]
                visual_overlay.append(item)
                
        # Codificar máscara BGRA nativa a PNG base64 (OpenCV imencode convierte BGRA a RGBA PNG correctamente)
        _, encoded_img = cv2.imencode(".png", overlay_mask)
        mask_base64 = base64.b64encode(encoded_img).decode("utf-8")
        mask_image_url = f"data:image/png;base64,{mask_base64}"

        # Guardar las imágenes procesadas ÚNICAMENTE si se detectó al menos 1 anomalía (no guardar pieles sin detecciones)
        if len(anomalies_detected) > 0:
            try:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                unique_id = uuid.uuid4().hex[:6]
                scan_tag = f"scan_{timestamp}_{unique_id}"

                # Determinar directorio raíz de imágenes (soporta ejecución local y Docker con volumen ./images:/app/images)
                backend_dir = os.path.dirname(os.path.abspath(__file__))
                parent_dir = os.path.dirname(backend_dir)

                if os.path.exists("/app/images"):
                    images_root = "/app/images"
                else:
                    images_root = os.path.join(parent_dir, "images")

                photos_dir = os.path.join(images_root, "photos")
                results_dir = os.path.join(images_root, "results")
                mask_dir = os.path.join(images_root, "mask")

                os.makedirs(photos_dir, exist_ok=True)
                os.makedirs(results_dir, exist_ok=True)
                os.makedirs(mask_dir, exist_ok=True)

                # 1. Foto original (_photo.jpg) en BGR nativo
                cv2.imwrite(os.path.join(photos_dir, f"{scan_tag}_photo.jpg"), face_512_bgr)

                # 2. Máscara de mapa de bits indexada para reentrenamiento U-Net (Clases 0: Fondo, 1: Acné, 2: Manchas, 3: Arrugas)
                cv2.imwrite(os.path.join(mask_dir, f"{scan_tag}_mask.png"), indexed_mask)

                # 3. Resultado con máscara superpuesta (_result.jpg) en BGR nativo
                result_bgr = face_512_bgr.copy()
                alpha = overlay_mask[:, :, 3] / 255.0
                for c_idx in range(3):
                    result_bgr[:, :, c_idx] = (
                        (1.0 - alpha) * result_bgr[:, :, c_idx] + alpha * overlay_mask[:, :, c_idx]
                    ).astype(np.uint8)
                cv2.imwrite(os.path.join(results_dir, f"{scan_tag}_result.jpg"), result_bgr)
                print(f"[IMAGES] Imágenes guardadas con tag '{scan_tag}' ({len(anomalies_detected)} anomalías detectadas: {list(anomalies_detected)})")
            except Exception as img_err:
                print(f"[IMAGES ERROR] Error al guardar imágenes de inferencia: {str(img_err)}")
        else:
            print("[IMAGES] Inferencia sin anomalías detectadas. No se guardan imágenes a disco.")

        return {
            "anomalies": list(anomalies_detected),
            "visualOverlay": visual_overlay,
            "maskImage": mask_image_url,
            "pixelCounts": pixel_counts
        }
        
    except Exception as e:
        print(f"Error procesando inferencia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento de la imagen: {str(e)}")

if __name__ == "__main__":
    print("Iniciando el servidor de FastAPI ONNX con 4 workers en http://localhost:8000...")
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8000, workers=4)
