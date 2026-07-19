import cv2
import numpy as np
import onnxruntime as ort
import os

def main():
    # 1. Cargar imagen de prueba
    img_path = "../public/hero-skin-natural.png"
    if not os.path.exists(img_path):
        # Intentar ruta alternativa
        img_path = "public/hero-skin-natural.png"
        if not os.path.exists(img_path):
            print("[!] Error: No se encontró hero-skin-natural.png")
            return
            
    print(f"Cargando imagen de prueba: {img_path}")
    orig_bgr = cv2.imread(img_path)
    orig_rgb = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2RGB)
    
    # 2. Cargar modelo ONNX (usaremos assemble_super.onnx)
    model_path = "assemble_super.onnx"
    if not os.path.exists(model_path):
        model_path = "research/assemble_super.onnx"
        if not os.path.exists(model_path):
            print("[!] Error: No se encontró assemble_super.onnx")
            return
            
    print(f"Cargando sesión ONNX: {model_path}")
    session = ort.InferenceSession(model_path, providers=["CPUExecutionProvider"])
    
    # 3. Preprocesar para U-Net (256x256)
    h, w = 256, 256
    resized = cv2.resize(orig_rgb, (w, h), interpolation=cv2.INTER_LINEAR)
    mean = np.array([0.485, 0.456, 0.406])
    std = np.array([0.229, 0.224, 0.225])
    normalized = (resized / 255.0 - mean) / std
    input_data = np.transpose(normalized, (2, 0, 1))
    input_data = np.expand_dims(input_data, axis=0).astype(np.float32)
    
    # 4. Inferencia U-Net
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name
    raw_outputs = session.run([output_name], {input_name: input_data})
    logits = raw_outputs[0][0]
    unet_pred = np.argmax(logits, axis=0).astype(np.uint8)
    
    # Escalar la predicción U-Net al tamaño original de la imagen para fusionar con alta resolución
    orig_h, orig_w = orig_rgb.shape[:2]
    unet_pred_scaled = cv2.resize(unet_pred, (orig_w, orig_h), interpolation=cv2.INTER_NEAREST)
    
    # 5. Algoritmos Clásicos de Visión por Computadora (CV Enhancers)
    print("Aplicando realzadores clásicos de Visión por Computadora...")
    
    # Segmentación de Piel en YCrCb
    img_ycrcb = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2YCrCb)
    lower_skin = np.array([0, 133, 77], dtype=np.uint8)
    upper_skin = np.array([255, 173, 127], dtype=np.uint8)
    skin_mask = cv2.inRange(img_ycrcb, lower_skin, upper_skin)
    
    # A. Realzador de Manchas (Hyperpigmentation) en LAB
    lab = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2LAB)
    l_channel, _, _ = cv2.split(lab)
    bg_l = cv2.bilateralFilter(l_channel, 25, 100, 100)
    diff_l = cv2.subtract(bg_l, l_channel)
    _, cv_spots = cv2.threshold(diff_l, 10, 255, cv2.THRESH_BINARY)
    cv_spots = cv2.bitwise_and(cv_spots, skin_mask)
    
    # B. Realzador de Arrugas en escala de grises usando Morphological Black-Hat
    gray = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2GRAY)
    smoothed = cv2.bilateralFilter(gray, 9, 75, 75)
    kernel_wrinkles = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15))
    blackhat_wrinkles = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, kernel_wrinkles)
    _, cv_wrinkles = cv2.threshold(blackhat_wrinkles, 4, 255, cv2.THRESH_BINARY)
    cv_wrinkles = cv2.bitwise_and(cv_wrinkles, skin_mask)
    
    # C. Realzador de Acné (Rojo y Grisáceo/Blemishes)
    # Acné rojo (Contraste en canal Cr)
    _, cr_channel, _ = cv2.split(img_ycrcb)
    bg_cr = cv2.medianBlur(cr_channel, 15)
    diff_cr = cv2.subtract(cr_channel, bg_cr)
    _, cv_acne_red = cv2.threshold(diff_cr, 8, 255, cv2.THRESH_BINARY)
    # Acné grisáceo/imperfección pequeña (Black-Hat de radio pequeño)
    kernel_acne = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    blackhat_acne = cv2.morphologyEx(smoothed, cv2.MORPH_BLACKHAT, kernel_acne)
    _, cv_acne_dull = cv2.threshold(blackhat_acne, 6, 255, cv2.THRESH_BINARY)
    
    cv_acne = cv2.bitwise_or(cv_acne_red, cv_acne_dull)
    cv_acne = cv2.bitwise_and(cv_acne, skin_mask)
    
    # 6. Fusión Híbrida: U-Net + Realzadores CV
    hybrid_pred = unet_pred_scaled.copy()
    
    # Fusionar Acné (Clase 1)
    hybrid_pred[(unet_pred_scaled == 1) | (cv_acne > 0)] = 1
    # Fusionar Manchas (Clase 2)
    hybrid_pred[(unet_pred_scaled == 2) | (cv_spots > 0)] = 2
    # Fusionar Arrugas (Clase 3)
    hybrid_pred[(unet_pred_scaled == 3) | (cv_wrinkles > 0)] = 3
    
    # Limpiar predicciones híbridas para que las manchas no tapen las arrugas en argmax
    # Prioridad: Arrugas > Acné > Manchas > Fondo
    
    # 7. Renderizar overlays
    color_palette_bgr = np.array([
        [0, 0, 0],         # Fondo (Clase 0)
        [115, 111, 231],   # Acné (Rojo #e76f73 en BGR: [115, 111, 231])
        [131, 167, 72],    # Manchas (Verde #48a783 en BGR: [131, 167, 72])
        [232, 117, 137]    # Arrugas (Morado #8975e8 en BGR: [232, 117, 137])
    ], dtype=np.uint8)
    
    alpha = 0.45
    
    # Overlay U-Net
    overlay_unet = orig_bgr.copy()
    mask_unet = (unet_pred_scaled > 0).astype(np.uint8)
    color_unet = color_palette_bgr[unet_pred_scaled]
    for c in range(3):
        overlay_unet[:, :, c] = np.where(
            mask_unet == 1,
            (alpha * color_unet[:, :, c] + (1 - alpha) * orig_bgr[:, :, c]).astype(np.uint8),
            orig_bgr[:, :, c]
        )
        
    # Overlay Híbrido
    overlay_hybrid = orig_bgr.copy()
    mask_hybrid = (hybrid_pred > 0).astype(np.uint8)
    color_hybrid = color_palette_bgr[hybrid_pred]
    for c in range(3):
        overlay_hybrid[:, :, c] = np.where(
            mask_hybrid == 1,
            (alpha * color_hybrid[:, :, c] + (1 - alpha) * orig_bgr[:, :, c]).astype(np.uint8),
            orig_bgr[:, :, c]
        )
        
    # Combinar horizontalmente
    combined = np.hstack([orig_bgr, overlay_unet, overlay_hybrid])
    
    # Ruta de guardado en los artefactos del chat
    artifact_path = "C:/Users/AndresV/.gemini/antigravity-ide/brain/71a95877-2362-42c9-88ce-19d07e3cc79e/media_hybrid_comparison.png"
    cv2.imwrite(artifact_path, combined)
    
    print(f"[+] Comparación híbrida guardada correctamente en: {artifact_path}")

if __name__ == "__main__":
    main()
