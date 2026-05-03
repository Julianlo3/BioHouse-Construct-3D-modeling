package co.biohouse.monolit.infraestructure.persistence.mapper;

import java.util.List;
import java.util.stream.Collectors;
import java.util.ArrayList;

import co.biohouse.monolit.domain.model.*;
import co.biohouse.monolit.infraestructure.persistence.entity.*;
import org.springframework.stereotype.Component;

@Component
public class MapperEntity {

    public MapperEntity() {
    }

    // --- MAPEO DE DOMINIO A ENTIDAD ---

    public UserEntity userToUserEntity(User user) {
        if (user == null) return null;
        UserEntity entity = new UserEntity();
        entity.setId(user.getId());
        entity.setUsername(user.getUsername());
        entity.setEmail(user.getEmail());
        // La lista de modelos se suele manejar por separado para evitar ciclos infinitos
        return entity;
    }

    public Model3DEntity model3DToModel3DEntity(Model3D model, User owner) {
        if (model == null) return null;
        Model3DEntity entity = new Model3DEntity();
        entity.setId(model.getId());
        entity.setTitle(model.getTitle());
        entity.setDescription(model.getDescription());
        entity.setOwner(userToUserEntity(owner));
        
        // Mapeamos los materiales usando la segunda función
        entity.setMaterials(materialListToMaterialEntityList(model.getMaterials(), entity));
        
        return entity;
    }

    public List<MaterialEntity> materialListToMaterialEntityList(List<Material> materials, Model3DEntity modelEntity) {
        if (materials == null) return new ArrayList<>();
        return materials.stream().map(m -> {
            MaterialEntity me = new MaterialEntity();
            me.setTypeMaterial(m.getTypeMaterial());
            me.setPosX(m.getPositionX());
            me.setPosY(m.getPositionY());
            me.setPosZ(m.getPositionZ());
            me.setRotX(m.getRotationX());
            me.setRotY(m.getRotationY());
            me.setRotZ(m.getRotationZ());
            me.setOpacity((float) m.getOpacity());
            me.setAssetPath(m.getAssetPath());
            me.setFloorLevel(m.getFloorLevel());
            me.setBlockSize(m.getBlockSize());
            me.setScaleX(m.getScaleX());
            me.setScaleY(m.getScaleY());
            me.setScaleZ(m.getScaleZ());
            me.setIsStarterBlock(m.getIsStarterBlock());
            me.setModel(modelEntity); // Referencia circular necesaria para JPA
            return me;
        }).collect(Collectors.toList());
    }

    // --- MAPEO DE ENTIDAD A DOMINIO ---

    public User userEntityToUser(UserEntity entity) {
        if (entity == null) return null;
        return new User(entity.getId(), entity.getUsername(), entity.getEmail());
    }

    public Model3D model3DEntityToModel3D(Model3DEntity entity) {
        if (entity == null) return null;
        Model3D domainModel = new Model3D();
        domainModel.setId(entity.getId());
        domainModel.setTitle(entity.getTitle());
        domainModel.setDescription(entity.getDescription());
        domainModel.setOwner(userEntityToUser(entity.getOwner()));
        
        // Mapeamos los materiales de entidad a dominio
        domainModel.setMaterials(materialEntityListToMaterialList(entity.getMaterials()));
        
        return domainModel;
    }

    public List<Material> materialEntityListToMaterialList(List<MaterialEntity> entities) {
        if (entities == null) return new ArrayList<>();
        return entities.stream().map(e -> {
            Material material = new Material(
                e.getTypeMaterial(),
                e.getPosX(), e.getPosY(), e.getPosZ(),
                e.getRotX(), e.getRotY(), e.getRotZ(),
                e.getOpacity(),
                e.getAssetPath()
            );
            material.setFloorLevel(e.getFloorLevel());
            material.setBlockSize(e.getBlockSize());
            material.setScaleX(e.getScaleX());
            material.setScaleY(e.getScaleY());
            material.setScaleZ(e.getScaleZ());
            material.setIsStarterBlock(e.getIsStarterBlock());
            return material;
        }).collect(Collectors.toList());
    }
}