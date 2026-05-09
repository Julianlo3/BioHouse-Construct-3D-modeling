package co.biohouse.monolit.domain.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import co.biohouse.monolit.aplication.ports.In.MaterialServicePort;
import co.biohouse.monolit.aplication.ports.Out.MaterialRepositoryPort;
import co.biohouse.monolit.domain.model.MaterialPrice;
import co.biohouse.monolit.infraestructure.persistence.entity.MaterialPriceEntity;
import co.biohouse.monolit.infraestructure.persistence.mapper.MaterialPriceEntityMapper;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MaterialPriceService implements MaterialServicePort {

    private final MaterialRepositoryPort repositoryPort;
    private final MaterialPriceEntityMapper entityMapper;

    @Override
    public MaterialPrice createPrice(MaterialPrice materialPrice) {
        MaterialPriceEntity entity = entityMapper.toEntity(materialPrice);
        return entityMapper.toDomain(repositoryPort.savePrice(entity));
    }

    @Override
    public MaterialPrice updatePrice(MaterialPrice materialPrice) {
        MaterialPriceEntity entity = entityMapper.toEntity(materialPrice);
        return entityMapper.toDomain(repositoryPort.updatePrice(entity));
    }

    @Override
    public List<MaterialPrice> getAllPrices() {
        return repositoryPort.getAllPrices().stream()
                .map(entityMapper::toDomain)
                .collect(Collectors.toList());
    }

    @Override
    public MaterialPrice getPriceByType(String typeMaterial) {
        return entityMapper.toDomain(repositoryPort.getPriceByType(typeMaterial).get());
    }
}
