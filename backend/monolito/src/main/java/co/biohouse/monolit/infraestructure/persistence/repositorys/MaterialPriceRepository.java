package co.biohouse.monolit.infraestructure.persistence.repositorys;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import co.biohouse.monolit.aplication.ports.Out.MaterialRepositoryPort;
import co.biohouse.monolit.infraestructure.persistence.entity.MaterialPriceEntity;

//Repositorio que implementa el puerto de salida para materiales, utilizando JPA para la persistencia

@Repository
@RequiredArgsConstructor
public class MaterialPriceRepository implements MaterialRepositoryPort {

    // Inyectamos el JpaRepository
    private final MaterialPriceJpaRepository jpaRepository;

    @Override
    @SuppressWarnings("null")
    public MaterialPriceEntity savePrice(MaterialPriceEntity materialPrice) {
        return jpaRepository.save(materialPrice);
    }

    // Primero se busca el meterial utilizando uuid y luego se actualizan los campos necesarios
    @Override
    public MaterialPriceEntity updatePrice(MaterialPriceEntity materialPrice) {
        // 1. Buscamos la entidad real en la BD usando el UUID público
        return jpaRepository.findByUuid(materialPrice.getUuid())
            .map(existingEntity -> {
                // 2. Actualizamos los campos de la entidad encontrada con los nuevos datos
                existingEntity.setTypeMaterial(materialPrice.getTypeMaterial());
                existingEntity.setDescription(materialPrice.getDescription());
                existingEntity.setPrice(materialPrice.getPrice());

                return jpaRepository.save(existingEntity);
            })
            .orElseThrow(() -> new RuntimeException("No se encontró el material con UUID: " + materialPrice.getUuid()));
    }

    @Override
    public List<MaterialPriceEntity> getAllPrices() {
        return jpaRepository.findAll();
    }

    @Override
    public Optional<MaterialPriceEntity> getPriceByType(String typeMaterial) {
        return jpaRepository.findByTypeMaterial(typeMaterial);
    }

    @Override
    public MaterialPriceEntity getPriceByUuid(UUID uuid) {
        return jpaRepository.findByUuid(uuid).orElse(null);
    }
}