package co.biohouse.monolit.infraestructure.persistence.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;


@Entity
@Table(name = "materials")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class MaterialEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="type_material", nullable = false)
    private String typeMaterial;

    @Column(name="pos_x", nullable = false)
    private double posX;

    @Column(name="pos_y", nullable = false)
    private double posY;

    @Column(name="pos_z", nullable = false)
    private double posZ;

    @Column(name="rot_x", nullable = false)
    private double rotX;

    @Column(name="rot_y", nullable = false)
    private double rotY;

    @Column(name="rot_z", nullable = false)
    private double rotZ;

    @Column( nullable = false)
    private float opacity;

    @Column(name="asset_path", nullable = false)
    private String assetPath;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "model_id", nullable = false)
    private Model3DEntity model;
}
