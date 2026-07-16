# Usar una imagen oficial de Python slim para mantener el tamaño bajo
FROM python:3.10-slim

# Evitar que Python escriba archivos .pyc y habilitar logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar dependencias del sistema mínimas requeridas por OpenCV y PyTorch
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copiar e instalar requerimientos
COPY requirements_fastapi.txt .
RUN pip install --no-cache-dir -r requirements_fastapi.txt

# Copiar el código de la aplicación y el modelo de pesos
COPY app_fastapi.py .
COPY best_model.pth .

# Exponer el puerto de FastAPI
EXPOSE 8000

# Ejecutar el servidor de FastAPI
CMD ["uvicorn", "app_fastapi:app", "--host", "0.0.0.0", "--port", "8000"]
