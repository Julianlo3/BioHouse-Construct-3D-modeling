package co.biohouse.monolit.infraestructure.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class Model3DResponse {
    private Long id;
    private String title;
    private String description;
    private List<MaterialsResponse> materials;
    private UserRequest owner;

    public Model3DResponse() {
        this.id = null;
        this.title = "";
        this.description = "";
        this.materials = new ArrayList<>();
        this.owner = new UserRequest();
    }
}
