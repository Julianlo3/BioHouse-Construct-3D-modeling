package co.biohouse.monolit.infraestructure.rest.controller;

import co.biohouse.monolit.domain.model.Model3D;
import co.biohouse.monolit.domain.model.User;
import co.biohouse.monolit.domain.service.Model3DService;
import co.biohouse.monolit.infraestructure.rest.dto.*;
import co.biohouse.monolit.infraestructure.rest.mapper.MapperDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/models")
@CrossOrigin("*")
public class Model3DController {

    @Autowired
    private Model3DService modelService;

    private final MapperDTO mapperDTO = new MapperDTO();

    
    @PostMapping("/save")
    public ResponseEntity<Model3DResponse> saveModel(@RequestBody Model3DResponse responseDTO) {
        Model3D modelDomain = mapperDTO.model3DResponseToModel3D(responseDTO);
        Model3D savedModel = modelService.createModel(modelDomain);
        return new ResponseEntity<>(mapperDTO.model3DToModel3DResponse(savedModel), HttpStatus.CREATED);
    }

    @PutMapping("update")
    public ResponseEntity<Model3DResponse> updateModel(@RequestBody Model3DResponse responseDTO) {
        Model3D modelDomain = mapperDTO.model3DResponseToModel3D(responseDTO);
        Model3D savedModel = modelService.updateModel(modelDomain);
        return new ResponseEntity<>(mapperDTO.model3DToModel3DResponse(savedModel), HttpStatus.OK);
    }


    @PostMapping("/user/list")
    public ResponseEntity<List<Model3DResponseUnique>> listModelsByUser(@RequestBody UserRequest userRequest) {
        User userDomain = mapperDTO.userRequestToUser(userRequest);
        List<Model3D> models = modelService.getListModels(userDomain);
        List<Model3DResponseUnique> response = mapperDTO.modelListToModelResponseUniqueList(models);
        return ResponseEntity.ok(response);
    }


    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteModel(@RequestBody Model3DRequest request) {
        Model3D modelDomain = mapperDTO.model3DRequestToModel3D(request);
        boolean deleted = modelService.deleteModel(modelDomain);
        return deleted ? ResponseEntity.noContent().build() : ResponseEntity.notFound().build();
    }


    @PostMapping("/search")
    public ResponseEntity<Model3DResponse> findModel(@RequestBody Model3DRequest request) {
        Model3D response = this.modelService.getModelById(request.getId());
        return ResponseEntity.ok(mapperDTO.model3DToModel3DResponse(response));
    }
}