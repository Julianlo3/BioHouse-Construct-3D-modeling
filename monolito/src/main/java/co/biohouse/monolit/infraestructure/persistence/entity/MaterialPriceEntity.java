package co.biohouse.monolit.infraestructure.persistence.entity;

import java.util.UUID;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Table(name = "material_price")
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class MaterialPriceEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // UUID público. Se genera automáticamente al crear la entidad.
    @Column(unique = true, nullable = false, updatable = false)
    private UUID uuid = UUID.randomUUID();

    @Column
    private String typeMaterial;
    @Column
    private String description;
    @Column
    private Double price;
    
    @PrePersist
    public void ensureUuid() {
        if (this.uuid == null) {
            this.uuid = UUID.randomUUID();
        }
    }

}
