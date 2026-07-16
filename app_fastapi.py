import os
import base64
import numpy as np
import cv2
import torch
import segmentation_models_pytorch as smp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Inicializar FastAPI
app = FastAPI(title="IA_Cosmetic U-Net Inference Server")

# Habilitar CORS para permitir peticiones desde el frontend de Next.js si se hace directo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Detectar dispositivo (CPU o CUDA/GPU)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Variable global para el modelo
model = None

@app.on_event("startup")
def load_model():
    global model
    model_path = "best_model.pth"
    if not os.path.exists(model_path):
        print(f"[!] ADVERTENCIA: No se encontró '{model_path}' en el directorio. La inferencia fallará hasta que esté presente.")
        return

    try:
        print(f"Cargando arquitectura U-Net con ResNet34 en {device}...")
        model = smp.Unet(
            encoder_name="resnet34",
            encoder_weights=None,
            in_channels=3,
            classes=4
        )
        print(f"Cargando pesos desde '{model_path}'...")
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        print("¡Modelo cargado en memoria exitosamente y listo para inferencias!")
    except Exception as e:
        print(f"Error crítico al cargar el modelo: {str(e)}")

class AnalysisRequest(BaseModel):
    image: str  # Base64 string

@app.post("/analyze")
async def analyze_skin(payload: AnalysisRequest):
    data_payload = payload
    if not data_payload or not data_payload.image:
        raise HTTPException(status_code=400, detail="No se recibió ninguna imagen en formato base64.")

    global model
    if model is None:
        raise HTTPException(status_code=503, detail="El modelo U-Net no está cargado. Verifica que best_model.pth exista en la raíz.")

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
        
        # Formatear a Tensor [1, 3, 256, 256]
        img_tensor = torch.tensor(img_normalized, dtype=torch.float32).permute(2, 0, 1).unsqueeze(0).to(device)
        
        # 3. Correr Inferencia
        with torch.no_grad():
            output = model(img_tensor)  # Logits shape [1, 4, 256, 256]
            preds = torch.argmax(output, dim=1).squeeze(0).cpu().numpy()  # Clases: 0, 1, 2, 3
            
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
    print("Iniciando el servidor de FastAPI en http://localhost:8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
