import torch
import os

def main():
    path_iou = "best_model_iou.pth"
    path_loss = "best_model_loos.pth"
    path_out = "best_model_ensemble.pth"
    
    if not os.path.exists(path_iou) or not os.path.exists(path_loss):
        print("[!] Error: No se encontraron los archivos best_model_iou.pth y best_model_loos.pth.")
        return
        
    print("Cargando checkpoints de ambos modelos...")
    state_dict_iou = torch.load(path_iou, map_location="cpu")
    state_dict_loss = torch.load(path_loss, map_location="cpu")
    
    print("Promediando pesos de los parámetros (50% IoU / 50% Loss)...")
    state_dict_ensemble = {}
    
    # Promediar capa por capa
    for key in state_dict_iou.keys():
        if key in state_dict_loss:
            state_dict_ensemble[key] = 0.5 * state_dict_iou[key] + 0.5 * state_dict_loss[key]
        else:
            print(f"[!] Capa omitida o ausente en el segundo modelo: {key}")
            state_dict_ensemble[key] = state_dict_iou[key]
            
    print(f"Guardando supermodelo fusionado en '{path_out}'...")
    torch.save(state_dict_ensemble, path_out)
    print("¡Supermodelo promediado creado con éxito!")

if __name__ == "__main__":
    main()
