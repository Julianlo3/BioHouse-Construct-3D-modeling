package co.biohouse.monolit.domain.model;

import java.util.UUID;

public class MaterialPrice {
    private UUID uuid;
    private String typeMaterial;
    private String description;
    private Double price;

    public MaterialPrice(UUID uuid, String typeMaterial, String description, Double price) {
        this.uuid = uuid;
        this.typeMaterial = typeMaterial;
        this.description = description;
        this.price = price;
    }

    // Getters and setters
    public UUID getUuid() {
        return uuid;
    }

    public String getTypeMaterial() {
        return typeMaterial;
    }

    public void setTypeMaterial(String typeMaterial) {
        this.typeMaterial = typeMaterial;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }
}
