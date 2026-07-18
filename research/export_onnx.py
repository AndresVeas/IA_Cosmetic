import torch
import segmentation_models_pytorch as smp
import sys

def main():
    try:
        print("Cargando arquitectura U-Net con ResNet34...")
        model = smp.Unet(
            encoder_name="resnet34",
            encoder_weights=None,
            in_channels=3,
            classes=4
        )
        
        print("Cargando pesos de best_model.pth...")
        model.load_state_dict(torch.load("best_model_iou.pth", map_location="cpu"))
        model.eval()
        
        print("Generando tensor dummy de entrada (1x3x256x256)...")
        # Usamos 256x256 como resolución estándar para una inferencia ultra-rápida en CPU
        dummy_input = torch.randn(1, 3, 256, 256)
        
        print("Exportando modelo a best_model.onnx...")
        torch.onnx.export(
            model,
            dummy_input,
            "best_model_iou.onnx",
            export_params=True,
            opset_version=11,
            do_constant_folding=True,
            input_names=["input"],
            output_names=["output"],
            dynamic_axes={"input": {0: "batch_size"}, "output": {0: "batch_size"}}
        )
        print("¡Éxito! El modelo ONNX se ha guardado en best_model.onnx")
    except Exception as e:
        print(f"Error durante la exportación a ONNX: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
