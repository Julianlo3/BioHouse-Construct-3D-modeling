package co.biohouse.monolit.infraestructure.persistence.repositorys;


import java.util.List;

import jakarta.persistence.NoResultException;
import org.springframework.stereotype.Repository;

import co.biohouse.monolit.aplication.ports.Out.*;
import co.biohouse.monolit.infraestructure.persistence.entity.MaterialEntity;
import co.biohouse.monolit.infraestructure.persistence.entity.Model3DEntity;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class Model3DRepository implements Model3DRepositoryPort {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    @Transactional
    public Model3DEntity saveModel(Model3DEntity model) {
        // Manejo de id
        if (model.getId() != null && model.getId() == 0L) {
            model.setId(null);
        }

        // Asignar la relación de todos los hijos (metriales) al modelo padre antes de persistir.
        if (model.getMaterials() != null) {
            for (MaterialEntity material : model.getMaterials()) {
                material.setModel(model);
            }
        }

        // Persistir modelo
        if (model.getId() == null) {
            entityManager.persist(model);
        } else {
            model = entityManager.merge(model);
        }

        // Soncronizar base de datos
        entityManager.flush();

        return model;
    }

    @Override
    @Transactional(readOnly = true)
    public Model3DEntity getModelById(Long id) {
        try {
            return entityManager.createQuery(
                            "SELECT m FROM Model3DEntity m LEFT JOIN FETCH m.materials WHERE m.id = :id",
                            Model3DEntity.class)
                    .setParameter("id", id)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    @Override
    public List<Model3DEntity> listModelByUser(Long userId) {
        return entityManager.createQuery("SELECT m FROM Model3DEntity m WHERE m.owner.id = :userId", Model3DEntity.class)
                .setParameter("userId", userId)
                .getResultList();
    }

    @Override
    public boolean deleteModelById(Long id) {
        Model3DEntity model = entityManager.find(Model3DEntity.class, id);
        if (model != null) {
            entityManager.remove(model);
            return true;
        }
        return false;
    }

    @Override
    public Model3DEntity updateModel(Long id, Model3DEntity model) {
        Model3DEntity existing = entityManager.find(Model3DEntity.class, id);
        if (existing != null) {
            // Eliminar materiales existentes
            deleteMaterialsByModelId(id);
            
            // Actualizar campos del modelo
            existing.setTitle(model.getTitle());
            existing.setDescription(model.getDescription());
            
            // Asignar el modelo a los nuevos materiales y guardarlos
            for (MaterialEntity material : model.getMaterials()) {
                material.setModel(existing);
            }
            saveListMaterials(model.getMaterials());
            
            return entityManager.merge(existing);
        }
        return null;
    }

    @Override
    public List<MaterialEntity> getMaterialsModel(Long modelId) {
        Model3DEntity model = entityManager.find(Model3DEntity.class, modelId);
        if (model != null) {
            return model.getMaterials();
        }
        return null;
    }

    @Override
    public boolean saveListMaterials(List<MaterialEntity> materials) {
        try {
            for (MaterialEntity material : materials) {
                if(!material.getTypeMaterial().isBlank()){
                    entityManager.persist(material);
                }
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    public boolean deleteMaterialsByModelId(Long modelId) {
        try {
            entityManager.createQuery("DELETE FROM MaterialEntity m WHERE m.model.id = :modelId")
                    .setParameter("modelId", modelId)
                    .executeUpdate();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
