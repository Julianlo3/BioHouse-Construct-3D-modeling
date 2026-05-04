package co.biohouse.monolit.aplication.ports.In;

import java.util.List;

import co.biohouse.monolit.domain.model.MaterialPrice;

public interface MaterialServicePort {

    public MaterialPrice createPrice(MaterialPrice materialPrice);
    public MaterialPrice updatePrice(MaterialPrice materialPrice);
    public List<MaterialPrice> getAllPrices();
    public MaterialPrice getPriceByType(String typeMaterial);

}
