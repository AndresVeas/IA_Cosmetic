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
    model_path = os.path.join(base_dir, "best_model.onnx")
    if not os.path.exists(model_path):
        print(f"[!] ADVERTENCIA: No se encontró '{model_path}' en el directorio. La inferencia fallará hasta que esté presente.")
        return

    try:
        print(f"Cargando modelo ONNX desde '{model_path}' en CPU...")
        # Carga el modelo optimizado utilizando el proveedor de CPU para inferencia ultra-rápida y ligera
        ort_session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
        print("¡Modelo ONNX cargado en memoria exitosamente y listo para inferencias!")
    except Exception as e:
        print(f"Error crítico al cargar el modelo ONNX: {str(e)}")

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
        
        # 2. Preprocesar: Obtener dimensiones originales de la imagen
        h_orig, w_orig = img_rgb.shape[:2]
        
        # Definir tamaño del parche (mitad de la resolución original para simular acercamientos de cuadrantes)
        patch_w = w_orig // 2
        patch_h = h_orig // 2
        
        # Grid de offsets adaptados para cubrir hasta el último píxel de la imagen con solapamiento
        x_offsets = [0, w_orig // 4, w_orig - patch_w]
        y_offsets = [0, h_orig // 4, h_orig - patch_h]
        
        patches = []
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        
        for y in y_offsets:
            for x in x_offsets:
                # Extraer parche de la imagen original en alta resolución
                patch = img_rgb[y : y + patch_h, x : x + patch_w]
                # Redimensionar a 256x256 (tamaño esperado por la U-Net)
                patch_resized = cv2.resize(patch, (256, 256), interpolation=cv2.INTER_LINEAR)
                # Normalizar
                patch_normalized = (patch_resized / 255.0 - mean) / std
                patch_tensor = np.transpose(patch_normalized, (2, 0, 1)).astype(np.float32)
                patches.append(patch_tensor)
                
        # Apilar todos los parches en un lote de shape: [9, 3, 256, 256]
        batch_tensor = np.stack(patches, axis=0)
        
        # 3. Correr Inferencia en Batch con ONNX Runtime
        input_name = ort_session.get_inputs()[0].name
        output_name = ort_session.get_outputs()[0].name
        raw_outputs = ort_session.run([output_name], {input_name: batch_tensor})
        batch_logits = raw_outputs[0]  # Shape: [9, 4, 256, 256]
        
        # 4. Reconstrucción y Mezcla (Blending) a la resolución original de la imagen
        accum_logits = np.zeros((4, h_orig, w_orig), dtype=np.float32)
        accum_count = np.zeros((h_orig, w_orig), dtype=np.float32)
        
        # Crear ventana coseno 2D para suavizar bordes del parche
        t_w = np.sin(np.linspace(0, np.pi, patch_w))
        t_h = np.sin(np.linspace(0, np.pi, patch_h))
        weight_2d = np.outer(t_h, t_w).astype(np.float32)
        weight_2d = np.maximum(weight_2d, 0.05)  # Evitar división por cero en bordes extremos
        
        idx = 0
        for y in y_offsets:
            for x in x_offsets:
                patch_logits_256 = batch_logits[idx]  # Shape: [4, 256, 256]
                
                # Redimensionar logits del parche a su tamaño original (patch_h x patch_w)
                patch_logits_orig = np.zeros((4, patch_h, patch_w), dtype=np.float32)
                for c in range(4):
                    patch_logits_orig[c] = cv2.resize(patch_logits_256[c], (patch_w, patch_h), interpolation=cv2.INTER_LINEAR)
                
                # Acumular logits ponderados
                for c in range(4):
                    accum_logits[c, y : y + patch_h, x : x + patch_w] += patch_logits_orig[c] * weight_2d
                accum_count[y : y + patch_h, x : x + patch_w] += weight_2d
                idx += 1
                
        # Promediar logits solapados a resolución original
        final_logits_orig = accum_logits / np.expand_dims(accum_count, axis=0)
        
        # Redimensionar logits globales a 640x480 para el frontend
        final_logits_640 = np.zeros((4, 480, 640), dtype=np.float32)
        for c in range(4):
            final_logits_640[c] = cv2.resize(final_logits_orig[c], (640, 480), interpolation=cv2.INTER_LINEAR)
            
        # Calcular softmax para obtener probabilidades de confianza por píxel a 640x480
        logits_exp = np.exp(final_logits_640 - np.max(final_logits_640, axis=0, keepdims=True))
        probs = logits_exp / np.sum(logits_exp, axis=0, keepdims=True)  # Shape: [4, 480, 640]
        
        # Obtener la predicción de la clase ganadora (argmax)
        prediction_scaled = np.argmax(final_logits_640, axis=0).astype(np.uint8)  # Shape: [480, 640]
        
        # --- FILTRAR DETECCIONES FUERA DE LA GUÍA FACIAL ---
        # Creamos una máscara ovalada estática que coincide exactamente con la silueta/guía visual del Frontend
        face_guide_mask = np.zeros((480, 640), dtype=np.uint8)
        cv2.ellipse(face_guide_mask, (320, 230), (165, 195), 0, 0, 360, 255, -1)
        
        # Todo lo que esté fuera del óvalo facial se fuerza a clase 0 (Fondo/Piel Sana)
        prediction_scaled[face_guide_mask == 0] = 0
        for c in range(1, 4):
            probs[c][face_guide_mask == 0] = 0.0
            
        visual_overlay = []
        anomalies_detected = set()
        
        classes_map = {1: "acne", 2: "manchas", 3: "arrugas"}
        labels_map = {1: "Acné", 2: "Hiperpigmentación", 3: "Línea/Arruga"}
        
        # Generar la máscara de segmentación en formato RGBA (base64)
        overlay_mask = np.zeros((480, 640, 4), dtype=np.uint8)
        
        color_map = {
            1: [115, 111, 231, 140],  # acne
            2: [131, 167, 72, 140],   # manchas
            3: [232, 117, 137, 140]   # arrugas
        }
        
        for class_id, class_name in classes_map.items():
            class_mask = (prediction_scaled == class_id).astype(np.uint8)
            
            # Pintar la máscara correspondiente a este canal en el overlay
            overlay_mask[class_mask == 1] = color_map[class_id]
            
            # Contar píxeles activos en la resolución 640x480
            active_pixels = np.sum(class_mask)
            print(f"[DEBUG] Clase {class_name.upper()} (U-Net Patches): {active_pixels} píxeles")
            
            # Encontrar contornos sobre la máscara final
            contours, _ = cv2.findContours(class_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            class_overlays = []
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # Omitir ruidos extremadamente pequeños (menos de 8 píxeles en resolución 640x480)
                if area < 8:
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
            
            # Ordenar por tamaño descendente y tomar máximo 3 por clase para no saturar la UI con marcadores
            class_overlays.sort(key=lambda item: item["size"], reverse=True)
            for item in class_overlays[:3]:
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
