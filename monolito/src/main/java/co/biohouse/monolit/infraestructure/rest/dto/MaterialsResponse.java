package co.biohouse.monolit.infraestructure.rest.dto;


import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class MaterialsResponse {

    private String typeMaterial;
    private double positionX, positionY, positionZ;
    private double rotationX, rotationY, rotationZ;
    private double opacity;
    private String assetPath;
    private int floorLevel;

    public MaterialsResponse() {
        this.typeMaterial = "";
        this.positionX = 0;
        this.positionY = 0;
        this.positionZ = 0;
        this.rotationX = 0;
        this.rotationY = 0;
        this.rotationZ = 0;
        this.opacity = 0;
        this.assetPath = "";
        this.floorLevel = 0;
    }

}
