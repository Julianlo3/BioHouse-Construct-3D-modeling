package co.biohouse.monolit.infraestructure.persistence.repositorys;

import org.springframework.stereotype.Repository;

import co.biohouse.monolit.aplication.ports.Out.*;
import co.biohouse.monolit.infraestructure.persistence.entity.UserEntity;

import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import jakarta.persistence.PersistenceContext;

@Repository 
public class UserRepository implements UserRepositoryPort {

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public UserEntity findUserByEmail(String email) {
        try {
            return entityManager.createQuery("SELECT u FROM UserEntity u WHERE u.email = :email", UserEntity.class)
                    .setParameter("email", email)
                    .getSingleResult();
        } catch (NoResultException e) {
            return null;
        }
    }

    @Override
    public UserEntity findUserById(Long id) {
        return entityManager.find(UserEntity.class, id);
    }

    @Override
    public UserEntity saveUser(UserEntity user) {
        if (!userExists(user.getId())) {
            entityManager.persist(user);
            return user;
        } else {
            return entityManager.merge(user);
        }
    }

    @Override
    public UserEntity UpdateUser(UserEntity user) {
        return entityManager.merge(user);
    }

    @Override
    public void deleteUser(UserEntity user) {
        entityManager.remove(entityManager.contains(user) ? user : entityManager.merge(user));
    }

    @Override
    public boolean userExists(Long id) {
        return entityManager.find(UserEntity.class, id) != null;
    }
}
