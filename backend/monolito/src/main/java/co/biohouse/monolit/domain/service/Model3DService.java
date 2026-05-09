package co.biohouse.monolit.domain.service;

import co.biohouse.monolit.aplication.ports.In.ModelServicePort;
import co.biohouse.monolit.domain.model.Model3D;
import co.biohouse.monolit.domain.model.User;

import co.biohouse.monolit.infraestructure.persistence.entity.Model3DEntity;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import co.biohouse.monolit.aplication.ports.Out.Model3DRepositoryPort;
import co.biohouse.monolit.infraestructure.persistence.mapper.*;
import java.util.List;

import org.springframework.transaction.annotation.Transactional;

@Service
public class Model3DService implements ModelServicePort {

    @Autowired
    private  Model3DRepositoryPort model3DRepository;

    private final MapperEntity model3DMapper = new MapperEntity();

    @Override
    @Transactional
    public Model3D createModel(Model3D model) {
        Model3DEntity response = new Model3DEntity();
        response = this.model3DRepository.saveModel(model3DMapper.model3DToModel3DEntity(model, model.getOwner())); // El owner se asignará en el controlador
        return this.model3DMapper.model3DEntityToModel3D(response);
    }

    @Override
    @Transactional
    public Model3D updateModel(Model3D model) {
        this.model3DRepository.updateModel(model.getId(),model3DMapper.model3DToModel3DEntity(model, model.getOwner()));
        return model;
    }

    @Override
    public List<Model3D> getListModels(User user) {
        return model3DRepository.listModelByUser(user.getId()).stream()
                .map(entity -> model3DMapper.model3DEntityToModel3D(entity))
                .toList();
    }

    @Override
    @Transactional
    public boolean deleteModel(Model3D model) {
        return this.model3DRepository.deleteModelById(model.getId());
    }

    @Override
    public Model3D getModelById(Long id){
        return this.model3DMapper.model3DEntityToModel3D(this.model3DRepository.getModelById(id));
    }
}
