package co.biohouse.monolit.infraestructure.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class Model3DResponseUnique {
    private Long id;
    private String Title;
    private String description;

    public Model3DResponseUnique() {
        this.id = 0L;
        this.Title = "";
        this.description = "";
    }
}
