import os
import base64
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
            
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # 2. Estandarizar la imagen recibida a la resolución nativa 512x512 del dataset de la U-Net
        # Esto garantiza que fotos de celulares (1080p, 4K) tengan exactamente la misma escala de arrugas/manchas que el entrenamiento.
        h_orig, w_orig = img_rgb.shape[:2]
        if h_orig != 512 or w_orig != 512:
            img_rgb = cv2.resize(img_rgb, (512, 512), interpolation=cv2.INTER_AREA if (h_orig > 512) else cv2.INTER_CUBIC)
            h_orig, w_orig = 512, 512

        # Delimitar la región del rostro alineada al marco 1:1 (~92-96% del encuadre)
        min_x_f = int(w_orig * 0.04)
        max_x_f = int(w_orig * 0.96)
        min_y_f = int(h_orig * 0.04)
        max_y_f = int(h_orig * 0.96)
        
        w_face = max_x_f - min_x_f
        h_face = max_y_f - min_y_f
        
        # Extraer región facial de la imagen original en alta resolución
        face_img_raw = img_rgb[min_y_f : max_y_f, min_x_f : max_x_f]
        
        # --- MODO U-NET DIRECTO PURO (SIN MULTI-PASADAS) ---
        # 1. Redimensionar la imagen limpia del rostro a 512x512 (resolución nativa U-Net)
        face_512 = cv2.resize(face_img_raw, (512, 512), interpolation=cv2.INTER_CUBIC)

        # 2. Ecualización de contraste CLAHE en canal L (LAB) para mejorar detección en webcam
        lab = cv2.cvtColor(face_512, cv2.COLOR_RGB2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=1.8, tileGridSize=(8, 8))
        l_eq = clahe.apply(l_ch)
        face_512_eq = cv2.cvtColor(cv2.merge((l_eq, a_ch, b_ch)), cv2.COLOR_LAB2RGB)

        # 3. Normalización estándar ImageNet sobre la imagen ecualizada
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        face_norm = (face_512_eq / 255.0 - mean) / std
        face_tensor = np.transpose(face_norm, (2, 0, 1)).astype(np.float32)
        batch_pure = np.expand_dims(face_tensor, axis=0)  # Shape: [1, 3, 512, 512]

        input_name = ort_session.get_inputs()[0].name
        output_name = ort_session.get_outputs()[0].name

        # 3. Una sola pasada limpia y directa con la U-Net (assemble_super.onnx)
        raw_logits_512 = ort_session.run([output_name], {input_name: batch_pure})[0][0]  # Shape: [4, 512, 512]

        # Reconstruir los logits en la imagen completa de 512x512
        final_logits = np.zeros((4, 512, 512), dtype=np.float32)
        final_logits[0] = 2.0  # Logit de fondo neutro fuera del área facial
        final_logits[1:] = -10.0

        # Redimensionar logits de la inferencia al tamaño de la región facial recortada
        final_logits_face = np.zeros((4, h_face, w_face), dtype=np.float32)
        for c in range(4):
            final_logits_face[c] = cv2.resize(raw_logits_512[c], (w_face, h_face), interpolation=cv2.INTER_LINEAR)

        # Insertar los logits de la cara en sus coordenadas originales dentro del canvas 512x512
        final_logits[:, min_y_f : max_y_f, min_x_f : max_x_f] = final_logits_face

        # Calcular softmax para obtener probabilidades de confianza por píxel a 512x512
        logits_exp = np.exp(final_logits - np.max(final_logits, axis=0, keepdims=True))
        probs = logits_exp / np.sum(logits_exp, axis=0, keepdims=True)  # Shape: [4, 512, 512]

        # Obtener la predicción de la clase ganadora (argmax)
        prediction_scaled = np.argmax(final_logits, axis=0).astype(np.uint8)  # Shape: [512, 512]
        
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
        
        # Generar la máscara de segmentación en formato RGBA (base64)
        overlay_mask = np.zeros((512, 512, 4), dtype=np.uint8)
        
        color_map = {
            1: [115, 111, 231, 140],  # acne
            2: [131, 167, 72, 140],   # manchas
            3: [232, 117, 137, 140]   # arrugas
        }
        
        for class_id, class_name in classes_map.items():
            class_mask = (prediction_scaled == class_id).astype(np.uint8)
            
            # Descartar píxeles con confianza de probabilidad menor al 22% para mejorar sensibilidad
            class_mask[probs[class_id] < 0.22] = 0

            # Aplicar Apertura Morfológica (MORPH_OPEN) para limpiar hebras de cabello, contornos de oreja y artefactos delgados
            kernel_open = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
            class_mask = cv2.morphologyEx(class_mask, cv2.MORPH_OPEN, kernel_open)

            # Pintar la máscara correspondiente a este canal en el overlay
            overlay_mask[class_mask == 1] = color_map[class_id]
            
            # Contar píxeles activos en la resolución 512x512
            active_pixels = np.sum(class_mask)
            print(f"[DEBUG] Clase {class_name.upper()} (512x512): {active_pixels} píxeles")
            
            # Encontrar contornos sobre la máscara final
            contours, _ = cv2.findContours(class_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            class_overlays = []
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # Omitir ruidos o artefactos pequeños (< 15px)
                if area < 15:
                    continue
                
                # Calcular la confianza/intensidad media de los píxeles de este contorno
                single_contour_mask = np.zeros(class_mask.shape, dtype=np.uint8)
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
            
            # Ordenar por tamaño descendente y tomar hasta 8 focos por clase para detallar todas las zonas identificadas
            class_overlays.sort(key=lambda item: item["size"], reverse=True)
            for item in class_overlays[:8]:
                anomalies_detected.add(class_name)
                del item["size"]
                visual_overlay.append(item)
                
        # Codificar máscara a base64
        _, encoded_img = cv2.imencode(".png", overlay_mask)
        mask_base64 = base64.b64encode(encoded_img).decode("utf-8")
        mask_image_url = f"data:image/png;base64,{mask_base64}"

        return {
            "anomalies": list(anomalies_detected),
            "visualOverlay": visual_overlay,
            "maskImage": mask_image_url
        }
        
    except Exception as e:
        print(f"Error procesando inferencia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento de la imagen: {str(e)}")

if __name__ == "__main__":
    print("Iniciando el servidor de FastAPI ONNX con 4 workers en http://localhost:8000...")
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8000, workers=4)
