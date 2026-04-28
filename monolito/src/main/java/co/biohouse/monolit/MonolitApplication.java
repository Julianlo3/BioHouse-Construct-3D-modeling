package co.biohouse.monolit;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.PropertySource;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication
@PropertySource("classpath:application.yml") // Forzando lectura del archivo
@EntityScan(basePackages = "co.biohouse.monolit.infraestructure.persistence.entity")
@EnableJpaRepositories(basePackages = "co.biohouse.monolit.infraestructure.persistence.repositorys") 
public class MonolitApplication {

    public static void main(String[] args) {
        SpringApplication.run(MonolitApplication.class, args);
    }
}