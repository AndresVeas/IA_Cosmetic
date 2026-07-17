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
        
        # Obtener predicciones (Argmax sobre las clases)
        preds = np.argmax(raw_outputs[0], axis=1)[0]  # Shape: [256, 256]
        
        # Depuración: Contar píxeles predichos de cada clase
        print(f"[DEBUG] Píxeles predichos en resolución 256x256 -> Acné: {np.sum(preds == 1)}, Manchas: {np.sum(preds == 2)}, Arrugas: {np.sum(preds == 3)} (de {preds.size} píxeles totales)")
            
        # 4. Detección de anomalías con OpenCV (escalando a 640x480)
        visual_overlay = []
        anomalies_detected = set()
        
        classes_map = {1: "acne", 2: "manchas", 3: "arrugas"}
        labels_map = {1: "Acné", 2: "Hiperpigmentación", 3: "Línea/Arruga"}
        
        preds_scaled = cv2.resize(preds.astype(np.uint8), (640, 480), interpolation=cv2.INTER_NEAREST)
        
        for class_id, class_name in classes_map.items():
            mask = (preds_scaled == class_id).astype(np.uint8)
            # Encontrar las islas o imperfecciones conectadas
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            class_overlays = []
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # Omitir ruidos pequeños (menos de 15 píxeles en resolución 640x480)
                if area < 15:
                    continue
                
                # Obtener el círculo contenedor mínimo
                (x, y), radius = cv2.minEnclosingCircle(cnt)
                
                class_overlays.append({
                    "type": class_name,
                    "x": int(x),
                    "y": int(y),
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
                
        return {
            "anomalies": list(anomalies_detected),
            "visualOverlay": visual_overlay
        }
        
    except Exception as e:
        print(f"Error procesando inferencia: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error durante el procesamiento de la imagen: {str(e)}")

if __name__ == "__main__":
    print("Iniciando el servidor de FastAPI ONNX con 4 workers en http://localhost:8000...")
    uvicorn.run("app_fastapi:app", host="0.0.0.0", port=8000, workers=4)
