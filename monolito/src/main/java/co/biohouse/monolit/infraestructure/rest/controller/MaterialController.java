package co.biohouse.monolit.infraestructure.rest.controller;

import co.biohouse.monolit.aplication.ports.In.MaterialServicePort;
import co.biohouse.monolit.infraestructure.rest.dto.MaterialPriceDTO;
import co.biohouse.monolit.infraestructure.rest.mapper.MaterialPriceDtoMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/materials")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialServicePort servicePort;
    private final MaterialPriceDtoMapper dtoMapper;

    @PostMapping
    public MaterialPriceDTO create(@RequestBody MaterialPriceDTO dto) {
        return dtoMapper.toDto(servicePort.createPrice(dtoMapper.toDomain(dto)));
    }

    @GetMapping
    public List<MaterialPriceDTO> getAll() {
        return servicePort.getAllPrices().stream()
                .map(dtoMapper::toDto)
                .collect(Collectors.toList());
    }

    @PutMapping("/{uuid}")
    public MaterialPriceDTO update(@PathVariable UUID uuid, @RequestBody MaterialPriceDTO dto) {
        dto.setUuid(uuid); // Aseguramos que use el UUID de la URL
        return dtoMapper.toDto(servicePort.updatePrice(dtoMapper.toDomain(dto)));
    }

    @GetMapping("/{type}")
    public MaterialPriceDTO getByType(@PathVariable String type) {
        return dtoMapper.toDto(servicePort.getPriceByType(type));
    }
}