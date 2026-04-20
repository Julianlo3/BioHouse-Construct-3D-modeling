package co.biohouse.monolit.infraestructure.rest.mapper;

import co.biohouse.monolit.domain.model.Material;
import co.biohouse.monolit.domain.model.Model3D;
import co.biohouse.monolit.domain.model.User;
import co.biohouse.monolit.infraestructure.rest.dto.*;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class MapperDTO {

    public MapperDTO() {
    }

    // --- USER MAPPING ---

    public User userRequestToUser(UserRequest request) {
        if (request == null) return null;
        return new User(
                request.getId(),
                request.getUsername(),
                request.getEmail()
        );
    }

    public UserRequest userToUserRequest(User request) {
        if (request == null) return null;
        return new UserRequest(
                request.getId(),
                request.getUsername(),
                request.getEmail()
        );
    }

    // --- MATERIALS MAPPING ---

    public List<Material> materialsResponseListToMaterialList(List<MaterialsResponse> responses) {
        if (responses == null) return new ArrayList<>();
        return responses.stream().map(dto -> new Material(
                dto.getTypeMaterial(),
                dto.getPositionX(), dto.getPositionY(), dto.getPositionZ(),
                dto.getRotationX(), dto.getRotationY(), dto.getRotationZ(),
                dto.getOpacity(),
                dto.getAssetPath()
        )).collect(Collectors.toList());
    }

    public List<MaterialsResponse> materialListToMaterialsResponseList(List<Material> materials) {
        if (materials == null) return new ArrayList<>();
        return materials.stream().map(m -> {
            MaterialsResponse dto = new MaterialsResponse();
            dto.setTypeMaterial(m.getTypeMaterial());
            dto.setPositionX(m.getPositionX());
            dto.setPositionY(m.getPositionY());
            dto.setPositionZ(m.getPositionZ());
            dto.setRotationX(m.getRotationX());
            dto.setRotationY(m.getRotationY());
            dto.setRotationZ(m.getRotationZ());
            dto.setOpacity(m.getOpacity());
            dto.setAssetPath(m.getAssetPath());
            return dto;
        }).collect(Collectors.toList());
    }

    // --- MODEL3D MAPPING ---

    public Model3D model3DRequestToModel3D(Model3DRequest request) {
        if (request == null) return null;
        Model3D model = new Model3D();
        model.setId(request.getId());
        model.setTitle(request.getTitle());
        model.setDescription(request.getDescription());
        // El request no suele traer materiales en tu DTO Model3DRequest, se inicializa vacío
        model.setMaterials(new ArrayList<>());
        return model;
    }

    public Model3D model3DResponseToModel3D(Model3DResponse response) {
        if (response == null) return null;
        Model3D model = new Model3D();
        model.setId(response.getId());
        model.setTitle(response.getTitle());
        model.setDescription(response.getDescription());
        model.setOwner(userRequestToUser(response.getOwner()));
        // Usamos la función de mapeo de lista de materiales definida arriba
        model.setMaterials(materialsResponseListToMaterialList(response.getMaterials()));
        return model;
    }

    public Model3DResponse model3DToModel3DResponse(Model3D model) {
        if (model == null) return null;
        Model3DResponse response = new Model3DResponse();
        response.setId(model.getId());
        response.setTitle(model.getTitle());
        response.setDescription(model.getDescription());
        // Usamos la función de mapeo de lista a DTO
        response.setMaterials(materialListToMaterialsResponseList(model.getMaterials()));
        response.setOwner(userToUserRequest(model.getOwner()));
        return response;
    }

    // --- MODEL3D UNIQUE MAPPING (LISTS) ---

    public List<Model3DResponseUnique> modelListToModelResponseUniqueList(List<Model3D> models) {
        if (models == null) return new ArrayList<>();
        return models.stream().map(m -> {
            Model3DResponseUnique dto = new Model3DResponseUnique();
            dto.setId(m.getId());
            dto.setTitle(m.getTitle());
            dto.setDescription(m.getDescription());
            return dto;
        }).collect(Collectors.toList());
    }

    public List<Model3D> modelResponseUniqueListToModelList(List<Model3DResponseUnique> dtos) {
        if (dtos == null) return new ArrayList<>();
        return dtos.stream().map(dto -> {
            Model3D model = new Model3D();
            model.setId(dto.getId());
            model.setTitle(dto.getTitle());
            model.setDescription(dto.getDescription());
            model.setMaterials(new ArrayList<>()); // Los Unique no tienen materiales
            return model;
        }).collect(Collectors.toList());
    }
}