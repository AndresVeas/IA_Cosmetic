import torch
import segmentation_models_pytorch as smp
import sys
import os
import shutil

# Configurar codificación UTF-8 para la consola en Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def main():
    try:
        print("Inicializando arquitectura U-Net con ResNet34...")
        model = smp.Unet(
            encoder_name="resnet34",
            encoder_weights=None,
            in_channels=3,
            classes=4
        )
        
        # Lista de tuplas: (archivo_pth, archivo_onnx_salida)
        models_to_export = [
            ("assemble_iou.pth", "assemble_iou.onnx"),
            ("best_model_iou.pth", "best_model_iou.onnx"),
            ("assemble_super.pth", "assemble_super.onnx")
        ]
        
        # Generar tensor dummy de entrada en resolución nativa del dataset (1x3x512x512)
        dummy_input = torch.randn(1, 3, 512, 512)
        
        base_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.abspath(os.path.join(base_dir, "..", "backend"))
        
        for pth_name, onnx_name in models_to_export:
            pth_path = os.path.join(base_dir, pth_name)
            onnx_path = os.path.join(base_dir, onnx_name)

            if not os.path.exists(pth_path):
                print(f"[!] ADVERTENCIA: No se encontro '{pth_name}' en '{base_dir}', omitiendo...")
                continue
                
            print(f"\n---> Cargando pesos de '{pth_name}'...")
            model.load_state_dict(torch.load(pth_path, map_location="cpu"))
            model.eval()
            
            print(f"---> Exportando modelo a '{onnx_name}'...")
            torch.onnx.export(
                model,
                dummy_input,
                onnx_path,
                export_params=True,
                opset_version=14,
                do_constant_folding=True,
                input_names=["input"],
                output_names=["output"],
                dynamic_axes={
                    "input": {0: "batch_size", 2: "height", 3: "width"},
                    "output": {0: "batch_size", 2: "height", 3: "width"}
                },
                dynamo=False
            )
            print(f"[+] Exito! El modelo se ha guardado en '{onnx_path}'")

            # Copiar modelo resultante a la carpeta backend para despliegue
            if os.path.exists(backend_dir):
                target_backend_path = os.path.join(backend_dir, onnx_name)
                shutil.copy2(onnx_path, target_backend_path)
                print(f"    -> Copiado a backend: '{target_backend_path}'")
            
        print("\n[+] Todos los modelos disponibles han sido procesados y exportados a ONNX.")
        
    except Exception as e:
        print(f"Error durante la exportacion a ONNX: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
