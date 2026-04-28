package co.biohouse.monolit.domain.model;

import java.util.ArrayList;
import java.util.List;

// The model 3D have materials with data how position, rotation and type material

public class Model3D {
    private Long id;
    private String title;
    private String description;
    private List<Material> materials = new ArrayList<>();
    private User owner;

    public Model3D() {
    }

    public Model3D(Long id, String title, String description, List<Material> materials) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.materials = materials != null ? materials : new ArrayList<>();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public List<Material> getMaterials() {
        return materials;
    }

    public void setMaterials(List<Material> materials) {
        this.materials = materials;
    }

    public User getOwner() {
        return owner;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }
}
