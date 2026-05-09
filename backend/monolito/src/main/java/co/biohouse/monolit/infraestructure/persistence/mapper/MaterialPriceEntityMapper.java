package co.biohouse.monolit.infraestructure.persistence.mapper;

import co.biohouse.monolit.domain.model.MaterialPrice;
import co.biohouse.monolit.infraestructure.persistence.entity.MaterialPriceEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping; // Importante

// Mapear entre clases de dominio y las entidades, ignorando id y conservando uuid publico para las actualizacion

@Mapper(componentModel = "spring")
public interface MaterialPriceEntityMapper {
    MaterialPrice toDomain(MaterialPriceEntity entity);
    // Indicamos que el campo 'id' no debe ser mapeado
    @Mapping(target = "id", ignore = true)
    MaterialPriceEntity toEntity(MaterialPrice domain);
}