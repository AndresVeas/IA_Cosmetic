import torch
import os

def main():
    path_iou = "best_model_iou.pth"
    path_loss = "best_model_loos.pth"
    path_out = "assemble_super.pth"
    
    if not os.path.exists(path_iou) or not os.path.exists(path_loss):
        print("[!] Error: No se encontraron los archivos best_model_iou.pth y best_model_loos.pth.")
        return
        
    print("Cargando checkpoints de ambos modelos...")
    state_dict_iou = torch.load(path_iou, map_location="cpu")
    state_dict_loss = torch.load(path_loss, map_location="cpu")
    
    print("Fusionando pesos de forma adaptativa y específica por clase...")
    state_dict_super = {}
    
    # 1. Copiar y promediar los pesos de las capas del feature extractor / encoder / decoder (50/50)
    for key in state_dict_iou.keys():
        if key in state_dict_loss:
            if "segmentation_head" not in key:
                state_dict_super[key] = 0.5 * state_dict_iou[key] + 0.5 * state_dict_loss[key]
        else:
            print(f"[!] Capa ausente en Loss model, copiando directa de IoU model: {key}")
            state_dict_super[key] = state_dict_iou[key]
            
    # 2. Fusión específica por canal/clase en la capa final (segmentation_head)
    # Clase 0: Fondo/Sana -> 50% IoU, 50% Loss
    # Clase 1: Acné -> 85% IoU, 15% Loss (IoU model es excelente en acné)
    # Clase 2: Manchas -> 85% IoU, 15% Loss (IoU model es excelente en manchas)
    # Clase 3: Arrugas -> 15% IoU, 85% Loss (Loss model es excelente en arrugas)
    
    weight_key = "segmentation_head.0.weight"
    bias_key = "segmentation_head.0.bias"
    
    # Inicializar tensores de salida vacíos con el mismo shape
    state_dict_super[weight_key] = state_dict_iou[weight_key].clone()
    state_dict_super[bias_key] = state_dict_iou[bias_key].clone()
    
    alphas = {
        0: 0.50,  # Fondo / Sano
        1: 0.85,  # Acné (Prioriza IoU)
        2: 0.85,  # Manchas (Prioriza IoU)
        3: 0.15   # Arrugas (Prioriza Loss)
    }
    
    print("Aplicando alphas por clase en el cabezal de segmentación:")
    for class_id, alpha in alphas.items():
        print(f" -> Clase {class_id}: {int(alpha*100)}% IoU model + {int((1-alpha)*100)}% Loss model")
        
        # Mezclar pesos de los filtros convolucionales para esta clase
        state_dict_super[weight_key][class_id] = (
            alpha * state_dict_iou[weight_key][class_id] + 
            (1.0 - alpha) * state_dict_loss[weight_key][class_id]
        )
        # Mezclar sesgo (bias) para esta clase
        state_dict_super[bias_key][class_id] = (
            alpha * state_dict_iou[bias_key][class_id] + 
            (1.0 - alpha) * state_dict_loss[bias_key][class_id]
        )
        
    print(f"Guardando supermodelo fusionado por canal en '{path_out}'...")
    torch.save(state_dict_super, path_out)
    print("¡Supermodelo 'assemble_super.pth' creado exitosamente!")

if __name__ == "__main__":
    main()
