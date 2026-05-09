package co.biohouse.monolit.infraestructure.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
public class Model3DRequest {
    private Long id;
    private String Title;
    private String description;

    public Model3DRequest() {
        this.id = 0L;
        this.Title = "";
        this.description = "";
    }
}
