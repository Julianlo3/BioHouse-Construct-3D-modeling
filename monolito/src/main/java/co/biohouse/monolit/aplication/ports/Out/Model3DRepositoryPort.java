package co.biohouse.monolit.aplication.ports.Out;

import co.biohouse.monolit.infraestructure.persistence.entity.Model3DEntity;
import co.biohouse.monolit.infraestructure.persistence.entity.MaterialEntity;

import java.util.List;

public interface Model3DRepositoryPort {
    Model3DEntity saveModel(Model3DEntity model);
    Model3DEntity getModelById(Long id);
    List<Model3DEntity> listModelByUser(Long userId);
    boolean deleteModelById(Long id);
    Model3DEntity updateModel(Long id, Model3DEntity model);
    
    // Materiales
    List<MaterialEntity> getMaterialsModel(Long modelId);
    boolean saveListMaterials(List<MaterialEntity> materials);
    boolean deleteMaterialsByModelId(Long modelId);
}
