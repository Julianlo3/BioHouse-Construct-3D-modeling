package co.biohouse.monolit.infraestructure.rest.dto;

import java.util.UUID;

import lombok.Data;

@Data
public class MaterialPriceDTO {
    private UUID uuid;
    private String typeMaterial;
    private String description;
    private Double price;
}
