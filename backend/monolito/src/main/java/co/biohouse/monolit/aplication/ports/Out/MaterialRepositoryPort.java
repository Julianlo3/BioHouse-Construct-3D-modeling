package co.biohouse.monolit.aplication.ports.Out;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import co.biohouse.monolit.infraestructure.persistence.entity.MaterialPriceEntity;


public interface MaterialRepositoryPort {
    public MaterialPriceEntity savePrice(MaterialPriceEntity materialPrice);
    public MaterialPriceEntity updatePrice(MaterialPriceEntity materialPrice);
    public List<MaterialPriceEntity> getAllPrices();
    Optional<MaterialPriceEntity> getPriceByType(String typeMaterial);

    MaterialPriceEntity getPriceByUuid(UUID uuid);
}