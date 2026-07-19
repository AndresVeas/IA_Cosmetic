import os
import sys
import time
import base64
import json
import urllib.request
import subprocess

def main():
    print("[+] Iniciando servidor FastAPI en segundo plano para prueba de integración...")
    # Ejecutar uvicorn
    env = os.environ.copy()
    env["PYTHONUTF8"] = "1"
    server_process = subprocess.Popen(
        [".venv/Scripts/python.exe", "backend/app_fastapi.py"],
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Esperar a que el servidor inicialice (5 segundos)
    time.sleep(5)
    
    # Comprobar si el proceso del servidor sigue vivo
    if server_process.poll() is not None:
        print("[!] Error: El servidor FastAPI no pudo iniciarse.")
        stdout, stderr = server_process.communicate()
        print("Stdout:", stdout.decode("utf-8", errors="ignore"))
        print("Stderr:", stderr.decode("utf-8", errors="ignore"))
        return
        
    try:
        # Cargar imagen y convertir a base64
        img_path = "public/hero-skin-natural.png"
        if not os.path.exists(img_path):
            print(f"[!] Error: No se encontró la imagen de prueba en {img_path}")
            return
            
        print(f"[+] Cargando imagen {img_path} y convirtiéndola a base64...")
        with open(img_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
            
        payload = json.dumps({"image": f"data:image/png;base64,{encoded_string}"}).encode('utf-8')
        
        # Enviar petición POST al endpoint /analyze
        url = "http://localhost:8000/analyze"
        req = urllib.request.Request(
            url,
            data=payload,
            headers={'Content-Type': 'application/json'}
        )
        
        print("[+] Enviando petición POST a /analyze...")
        start_time = time.time()
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            elapsed = time.time() - start_time
            print(f"[+] Respuesta recibida en {elapsed:.2f} segundos con código {response.status}")
            
            data = json.loads(res_body)
            
            # Validar estructura del JSON
            print("\n=== VALIDACIÓN DE LA RESPUESTA DEL SERVIDOR HÍBRIDO ===")
            print("1. Anomalías detectadas:", data.get("anomalies"))
            overlay = data.get("visualOverlay", [])
            print(f"2. Número de marcadores detectados (híbrido): {len(overlay)}")
            print("3. Primeros 3 marcadores:")
            for idx, marker in enumerate(overlay[:3]):
                print(f"   -> Marcador #{idx+1}: Tipo={marker.get('type')}, Severidad={marker.get('severity')}, Área={marker.get('area')}px, Confianza={marker.get('confidence')}%")
            print("4. ¿Máscara de segmentación (maskImage) presente?:", "Sí" if data.get("maskImage") else "No")
            print("="*50)
            
            # Assertions to confirm it works
            assert "anomalies" in data, "La clave 'anomalies' falta en la respuesta."
            assert "visualOverlay" in data, "La clave 'visualOverlay' falta en la respuesta."
            assert "maskImage" in data, "La clave 'maskImage' falta en la respuesta."
            print("[+] ¡Prueba de integración exitosa! El pipeline híbrido funciona a la perfección.")
            
    except Exception as e:
        print("[!] Error durante la prueba de integración:", str(e))
    finally:
        print("[+] Apagando servidor FastAPI...")
        server_process.terminate()
        server_process.wait()
        print("[+] Servidor cerrado.")

if __name__ == "__main__":
    main()
