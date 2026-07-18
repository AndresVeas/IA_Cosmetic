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
    model_path = os.path.join(base_dir, "best_model_iou.onnx")
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
        raise HTTPException(status_code=503, detail="El modelo ONNX no está cargado. Verifica que best_model_iou.onnx exista en la raíz.")

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
        
        # 2. Preprocesar: redimensionar a 256x256
        img_resized = cv2.resize(img_rgb, (256, 256))
        
        # Normalizar con estadísticas de ImageNet
        mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
        std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
        img_normalized = (img_resized / 255.0 - mean) / std
        
        # Formatear a tensor [1, 3, 256, 256] para ONNX (numpy float32)
        img_tensor = np.transpose(img_normalized, (2, 0, 1))
        img_tensor = np.expand_dims(img_tensor, axis=0).astype(np.float32)
        
        # 3. Correr Inferencia con ONNX Runtime
        input_name = ort_session.get_inputs()[0].name
        output_name = ort_session.get_outputs()[0].name
        raw_outputs = ort_session.run([output_name], {input_name: img_tensor})
        
        # Obtener los logits crudos del modelo
        logits = raw_outputs[0][0]  # Shape: [4, 256, 256]
        
        # Aplicar Softmax para obtener las probabilidades normalizadas por píxel
        logits_exp = np.exp(logits - np.max(logits, axis=0, keepdims=True))
        probs = logits_exp / np.sum(logits_exp, axis=0, keepdims=True) # Shape: [4, 256, 256]
        
        # 4. Detección de anomalías con OpenCV (escalando a 640x480)
        visual_overlay = []
        anomalies_detected = set()
        
        classes_map = {1: "acne", 2: "manchas", 3: "arrugas"}
        labels_map = {1: "Acné", 2: "Hiperpigmentación", 3: "Línea/Arruga"}
        
        # Umbrales de probabilidad personalizados para detectar anomalías con mayor sensibilidad
        thresholds = {
            1: 0.20,  # Acné (Muy sensible para detectar pequeños brotes)
            2: 0.20,  # Manchas / Hiperpigmentación (Sensible)
            3: 0.25   # Arrugas (Evita falsas detecciones por líneas muy tenues)
        }
        
        for class_id, class_name in classes_map.items():
            # Redimensionar el mapa de probabilidad de la clase usando interpolación bilineal (más suave y precisa)
            prob_scaled = cv2.resize(probs[class_id], (640, 480), interpolation=cv2.INTER_LINEAR)
            
            # Crear la máscara binaria aplicando el umbral
            mask = (prob_scaled > thresholds[class_id]).astype(np.uint8)
            
            # Contar píxeles activos en la resolución 640x480
            active_pixels = np.sum(mask)
            print(f"[DEBUG] Clase {class_name.upper()}: {active_pixels} píxeles superaron el umbral {thresholds[class_id]}")
            
            # Encontrar las islas o imperfecciones conectadas
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            class_overlays = []
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # Omitir ruidos pequeños (menos de 15 píxeles en resolución 640x480)
                if area < 15:
                    continue
                
                # Obtener momentos del contorno para encontrar el centro de masa de la concentración (Centroide)
                M = cv2.moments(cnt)
                if M["m00"] != 0:
                    cx = int(M["m10"] / M["m00"])
                    cy = int(M["m01"] / M["m00"])
                else:
                    # Fallback al centro del círculo contenedor mínimo
                    (circle_x, circle_y), _ = cv2.minEnclosingCircle(cnt)
                    cx, cy = int(circle_x), int(circle_y)
                
                # Obtener el radio del círculo contenedor para dibujar la cobertura
                (_, _), radius = cv2.minEnclosingCircle(cnt)
                
                class_overlays.append({
                    "type": class_name,
                    "x": cx,
                    "y": cy,
                    "radius": max(6, int(radius)),
                    "label": f"{labels_map[class_id]} ({int(area)} px)",
                    "size": int(area)
                })
            
            # Ordenar por tamaño descendente y tomar máximo 3 para evitar saturar la interfaz
            class_overlays.sort(key=lambda item: item["size"], reverse=True)
            for item in class_overlays[:3]:
                anomalies_detected.add(class_name)
                del item["size"]  # Eliminar clave temporal de ordenamiento
                visual_overlay.append(item)

        # Si no se detectó nada con los umbrales normales (por ejemplo, por mala iluminación),
        # ejecutamos un escaneo con ultra-sensibilidad para detectar imperfecciones sutiles.
        if len(anomalies_detected) == 0:
            print("[DEBUG] No se detectaron anomalías con los umbrales estándar. Ejecutando escaneo ultra-sensible...")
            sensitive_thresholds = {1: 0.04, 2: 0.04, 3: 0.06}
            for class_id, class_name in classes_map.items():
                prob_scaled = cv2.resize(probs[class_id], (640, 480), interpolation=cv2.INTER_LINEAR)
                mask = (prob_scaled > sensitive_thresholds[class_id]).astype(np.uint8)
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                class_overlays = []
                for i, cnt in enumerate(contours):
                    area = cv2.contourArea(cnt)
                    if area < 8:  # Área mínima más pequeña para detectar pequeños detalles
                        continue
                    
                    (circle_x, circle_y), radius = cv2.minEnclosingCircle(cnt)
                    cx, cy = int(circle_x), int(circle_y)
                    
                    class_overlays.append({
                        "type": class_name,
                        "x": cx,
                        "y": cy,
                        "radius": max(5, int(radius)),
                        "label": f"{labels_map[class_id]} (Sensible)",
                        "size": int(area)
                    })
                
                class_overlays.sort(key=lambda item: item["size"], reverse=True)
                for item in class_overlays[:2]:
                    anomalies_detected.add(class_name)
                    del item["size"]
                    visual_overlay.append(item)
                
        # 5. Generar la máscara de segmentación UNET en formato RGBA (base64)
        active_thresholds = thresholds if len(anomalies_detected) > 0 else {1: 0.04, 2: 0.04, 3: 0.06}
        overlay_mask = np.zeros((480, 640, 4), dtype=np.uint8)
        
        # Colores RGBA en formato BGRA para OpenCV:
        # Acné: Rojo (#e76f73) -> rgb(231, 111, 115) -> [115, 111, 231, 140]
        # Manchas: Verde (#48a783) -> rgb(72, 167, 131) -> [131, 167, 72, 140]
        # Arrugas: Morado/Líneas (#8975e8) -> rgb(137, 117, 232) -> [232, 117, 137, 140]
        color_map = {
            1: [115, 111, 231, 140],  # acne
            2: [131, 167, 72, 140],   # manchas
            3: [232, 117, 137, 140]   # arrugas
        }
        
        for class_id, color in color_map.items():
            prob_scaled = cv2.resize(probs[class_id], (640, 480), interpolation=cv2.INTER_LINEAR)
            mask_indices = prob_scaled > active_thresholds[class_id]
            overlay_mask[mask_indices] = color
            
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
