package co.biohouse.monolit.infraestructure.persistence.repositorys;

import co.biohouse.monolit.infraestructure.persistence.entity.MaterialPriceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

// Interfaz intermediaria JPA para repositorio de materiales

public interface MaterialPriceJpaRepository extends JpaRepository<MaterialPriceEntity, Long> {
    Optional<MaterialPriceEntity> findByTypeMaterial(String typeMaterial);
    Optional<MaterialPriceEntity> findByUuid(UUID uuid);
}