package co.biohouse.monolit.aplication.ports.In;

import co.biohouse.monolit.domain.model.*;

import java.util.List;

public interface ModelServicePort {
    Model3D createModel(Model3D model);
    Model3D updateModel(Model3D model);
    List<Model3D> getListModels(User user);
    boolean deleteModel(Model3D model);
    Model3D getModelById(Long id);
}
