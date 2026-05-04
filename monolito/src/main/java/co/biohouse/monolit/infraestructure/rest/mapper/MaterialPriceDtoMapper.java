package co.biohouse.monolit.infraestructure.rest.mapper;

import co.biohouse.monolit.domain.model.MaterialPrice;
import co.biohouse.monolit.infraestructure.rest.dto.MaterialPriceDTO;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MaterialPriceDtoMapper {
    MaterialPrice toDomain(MaterialPriceDTO dto);
    MaterialPriceDTO toDto(MaterialPrice domain);
}
