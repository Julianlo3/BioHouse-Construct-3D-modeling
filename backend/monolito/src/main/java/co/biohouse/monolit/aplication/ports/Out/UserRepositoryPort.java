package co.biohouse.monolit.aplication.ports.Out;

import co.biohouse.monolit.infraestructure.persistence.entity.UserEntity;

public interface UserRepositoryPort {
    UserEntity findUserByEmail(String email);
    UserEntity findUserById(Long id);
    UserEntity saveUser(UserEntity user);
    UserEntity UpdateUser(UserEntity user);
    void deleteUser(UserEntity user);
    boolean userExists(Long id);
}
