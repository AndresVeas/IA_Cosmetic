import torch
import segmentation_models_pytorch as smp
import sys
import os

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
            ("best_model_iou.pth", "best_model_iou.onnx"),
            ("best_model_loos.pth", "best_model_loss.onnx"),
            ("best_model.pth", "best_model.onnx"),
            ("best_model_ensemble.pth", "best_model_ensemble.onnx"),
            ("assemble_super.pth", "assemble_super.onnx")
        ]
        
        # Generar tensor dummy de entrada (1x3x256x256)
        # Usamos 256x256 como resolución estándar para una inferencia ultra-rápida en CPU
        dummy_input = torch.randn(1, 3, 256, 256)
        
        for pth_name, onnx_name in models_to_export:
            if not os.path.exists(pth_name):
                print(f"[!] ADVERTENCIA: No se encontró '{pth_name}', omitiendo...")
                continue
                
            # Si el archivo ONNX ya existe y es más nuevo que el archivo .pth, omitimos
            if os.path.exists(onnx_name) and os.path.getmtime(onnx_name) > os.path.getmtime(pth_name):
                print(f"---> '{onnx_name}' ya está actualizado, omitiendo exportación.")
                continue
                
            print(f"\n---> Cargando pesos de '{pth_name}'...")
            model.load_state_dict(torch.load(pth_name, map_location="cpu"))
            model.eval()
            
            print(f"---> Exportando modelo a '{onnx_name}'...")
            torch.onnx.export(
                model,
                dummy_input,
                onnx_name,
                export_params=True,
                opset_version=11,
                do_constant_folding=True,
                input_names=["input"],
                output_names=["output"],
                dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
            )
            print(f"¡Éxito! El modelo se ha guardado en '{onnx_name}'")
            
        print("\n[+] Todos los modelos disponibles han sido procesados y exportados a ONNX.")
        
    except Exception as e:
        print(f"Error durante la exportación a ONNX: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
