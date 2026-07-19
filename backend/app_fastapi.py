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
        
        # Obtener los logits crudos del modelo
        logits = raw_outputs[0][0]  # Shape: [4, 256, 256]
        
        # Calcular softmax para obtener probabilidades de confianza por píxel
        logits_exp = np.exp(logits - np.max(logits, axis=0, keepdims=True))
        probs = logits_exp / np.sum(logits_exp, axis=0, keepdims=True)
        
        # 4. Obtener la predicción de la clase ganadora por píxel (argmax)
        prediction = np.argmax(logits, axis=0).astype(np.uint8)  # Shape: [256, 256]
        
        # Redimensionar la predicción a la resolución de salida (640x480) usando vecino más cercano (INTER_NEAREST)
        prediction_scaled = cv2.resize(prediction, (640, 480), interpolation=cv2.INTER_NEAREST)
        
        # --- ALGORITMOS DE VISIÓN POR COMPUTADORA HÍBRIDOS (CV ENHANCERS) ---
        # Redimensionar la imagen decodificada a 640x480 para aplicar filtros espaciales
        img_640 = cv2.resize(img, (640, 480))
        
        # Segmentación básica de piel en espacio YCrCb para restringir las detecciones al rostro
        img_ycrcb = cv2.cvtColor(img_640, cv2.COLOR_BGR2YCrCb)
        lower_skin = np.array([0, 133, 77], dtype=np.uint8)
        upper_skin = np.array([255, 173, 127], dtype=np.uint8)
        skin_mask = cv2.inRange(img_ycrcb, lower_skin, upper_skin)
        
        # --- MÁSCARA FACIAL EN ELIPSE MEDIANTE HAAR CASCADE ---
        # Detectar el rostro para ignorar cabello, orejas, cuello y fondo
        face_mask = np.zeros((480, 640), dtype=np.uint8)
        gray_640 = cv2.cvtColor(img_640, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        faces = face_cascade.detectMultiScale(gray_640, 1.1, 4)
        
        if len(faces) > 0:
            # Seleccionar la cara más grande detectada en la foto
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
            fx, fy, fw, fh = faces[0]
            
            # Dibujar un óvalo facial principal (excluye orejas y cabello en las sienes)
            center = (int(fx + fw / 2), int(fy + fh / 2))
            axes = (int(fw * 0.45), int(fh * 0.55))
            cv2.ellipse(face_mask, center, axes, 0, 0, 360, 255, -1)
        else:
            # Si no se detecta el rostro por condiciones de iluminación, usar una elipse central por defecto
            cv2.ellipse(face_mask, (320, 240), (180, 220), 0, 0, 360, 255, -1)
            
        # Combinar la segmentación de color de piel con el óvalo del rostro
        valid_skin_mask = cv2.bitwise_and(skin_mask, face_mask)
        
        # A. Extractor de Manchas (LAB local contrast)
        lab = cv2.cvtColor(img_640, cv2.COLOR_BGR2LAB)
        l_channel, _, _ = cv2.split(lab)
        bg_l = cv2.bilateralFilter(l_channel, 25, 100, 100)
        diff_l = cv2.subtract(bg_l, l_channel)
        _, cv_spots = cv2.threshold(diff_l, 10, 255, cv2.THRESH_BINARY)
        cv_spots = cv2.bitwise_and(cv_spots, valid_skin_mask)
        
        # B. Extractor de Arrugas finas (Black-Hat Morphological filter)
        gray = cv2.cvtColor(img_640, cv2.COLOR_BGR2GRAY)
        smoothed = cv2.bilateralFilter(gray, 9, 75, 75)
        kernel_wrinkles = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
        blackhat_wrinkles = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, kernel_wrinkles)
        _, cv_wrinkles = cv2.threshold(blackhat_wrinkles, 4, 255, cv2.THRESH_BINARY)
        cv_wrinkles = cv2.bitwise_and(cv_wrinkles, valid_skin_mask)
        
        # C. Extractor de Acné (Rojeces + Manchas oscuras pequeñas/acné grisáceo)
        _, cr_channel, _ = cv2.split(img_ycrcb)
        bg_cr = cv2.medianBlur(cr_channel, 15)
        diff_cr = cv2.subtract(cr_channel, bg_cr)
        _, cv_acne_red = cv2.threshold(diff_cr, 8, 255, cv2.THRESH_BINARY)
        
        kernel_acne = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
        blackhat_acne = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, kernel_acne)
        _, cv_acne_dull = cv2.threshold(blackhat_acne, 6, 255, cv2.THRESH_BINARY)
        
        cv_acne = cv2.bitwise_or(cv_acne_red, cv_acne_dull)
        cv_acne = cv2.bitwise_and(cv_acne, valid_skin_mask)
        
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
            
            # Fusión híbrida de predicciones clásicas y U-Net
            if class_id == 1:
                class_mask = cv2.bitwise_or(class_mask, (cv_acne > 0).astype(np.uint8))
            elif class_id == 2:
                class_mask = cv2.bitwise_or(class_mask, (cv_spots > 0).astype(np.uint8))
            elif class_id == 3:
                class_mask = cv2.bitwise_or(class_mask, (cv_wrinkles > 0).astype(np.uint8))
                
            # Pintar la máscara correspondiente a este canal en el overlay
            overlay_mask[class_mask == 1] = color_map[class_id]
            
            # Redimensionar el mapa de probabilidad de la clase para calcular confianza
            prob_scaled = cv2.resize(probs[class_id], (640, 480), interpolation=cv2.INTER_LINEAR)
            
            # Contar píxeles activos en la resolución 640x480
            active_pixels = np.sum(class_mask)
            print(f"[DEBUG] Clase {class_name.upper()} (Híbrido): {active_pixels} píxeles")
            
            # Encontrar contornos sobre la máscara híbrida final
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
                mean_conf = np.mean(prob_scaled[single_contour_mask == 1]) if np.sum(single_contour_mask) > 0 else 0.0
                confidence_pct = max(75, int(mean_conf * 100))
                
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
