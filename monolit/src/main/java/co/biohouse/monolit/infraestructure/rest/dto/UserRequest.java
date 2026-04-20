package co.biohouse.monolit.infraestructure.rest.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class UserRequest {
    private Long id;
    private String username;
    private String email;

    public UserRequest() {
        this.id = 0L;
        this.username = "";
        this.email = "";
    }
}
