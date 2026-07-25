import torch
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    path_iou = os.path.join(base_dir, "best_model_iou.pth")
    path_super = os.path.join(base_dir, "assemble_super.pth")
    path_out = os.path.join(base_dir, "assemble_iou.pth")
    
    if not os.path.exists(path_iou) or not os.path.exists(path_super):
        print(f"[!] Error: No se encontraron los archivos '{path_iou}' y/o '{path_super}'.")
        return
        
    print(f"Cargando checkpoints de '{path_iou}' y '{path_super}'...")
    state_dict_iou = torch.load(path_iou, map_location="cpu")
    state_dict_super = torch.load(path_super, map_location="cpu")
    
    print("Promediando pesos de los parámetros (50% Best IoU + 50% Assemble Super)...")
    state_dict_ensemble = {}
    
    # Promediar capa por capa
    for key in state_dict_iou.keys():
        if key in state_dict_super:
            state_dict_ensemble[key] = 0.5 * state_dict_iou[key] + 0.5 * state_dict_super[key]
        else:
            print(f"[!] Capa omitida o ausente en el segundo modelo: {key}")
            state_dict_ensemble[key] = state_dict_iou[key]
            
    print(f"Guardando supermodelo promediado en '{path_out}'...")
    torch.save(state_dict_ensemble, path_out)
    print(f"[+] ¡Supermodelo promediado 'assemble_iou.pth' creado con éxito!")

if __name__ == "__main__":
    main()
