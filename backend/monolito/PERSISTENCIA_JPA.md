# 📊 Guía Completa de Persistencia JPA en BioHouse Monolit

## 📋 Índice
1. [Arquitectura](#arquitectura)
2. [Entidades](#entidades)
3. [Relaciones Implementadas](#relaciones-implementadas)
4. [Repositorios](#repositorios)
5. [Servicios](#servicios)
6. [Controladores](#controladores)
7. [Configuración](#configuración)
8. [Ejemplo de Uso](#ejemplo-de-uso)

---

## 🏗️ Arquitectura

```
Controller (REST API)
    ↓
Service (Lógica de Negocio)
    ↓
Repository (JPA - Acceso a BD)
    ↓
Entity (Mapeo ORM)
    ↓
PostgreSQL (Base de Datos)
```

---

## 🔧 Entidades

### 1. **UserEntity** (Usuario)
```java
@Entity
@Table(name = "users")
public class UserEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String username;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password;
    
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Model3DEntity> models;
}
```

**Características:**
- ID autogenerado (IDENTITY - secuencia en PostgreSQL)
- Username y email únicos
- Contraseña requerida
- Relación 1→N con Model3DEntity

### 2. **MaterialEntity** (Material 3D)
```java
@Entity
@Table(name = "materials")
public class MaterialEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String typeMaterial;
    
    @Column(nullable = false)
    private float posX, posY, posZ;
    
    @Column(nullable = false)
    private float rotX, rotY, rotZ;
    
    @Column(nullable = false)
    private float opacity;
    
    @Column(nullable = false)
    private String assetPath;
    
    @ManyToMany(mappedBy = "materials", fetch = FetchType.LAZY)
    private List<Model3DEntity> models;
}
```

**Características:**
- Propiedades de transformación 3D (posición, rotación)
- Relación N→N con Model3DEntity
- Lado inverso de la relación Many-to-Many

### 3. **Model3DEntity** (Modelo 3D)
```java
@Entity
@Table(name = "models_3d")
public class Model3DEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE}, fetch = FetchType.LAZY)
    @JoinTable(
        name = "model_materials",
        joinColumns = @JoinColumn(name = "model_id"),
        inverseJoinColumns = @JoinColumn(name = "material_id")
    )
    private List<MaterialEntity> materials;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserEntity owner;
}
```

**Características:**
- Relación N→1 con UserEntity (Propietario)
- Relación N→N con MaterialEntity
- Tabla de unión: `model_materials`
- Cascade PERSIST y MERGE para materiales

---

## 🔗 Relaciones Implementadas

### 1. **Relación UNO-A-MUCHOS (1→N)**
**Entre UserEntity y Model3DEntity**

```
┌─────────────┐          ┌──────────────┐
│   User      │          │   Model3D    │
├─────────────┤          ├──────────────┤
│ id (PK)     │ 1    →   │ id (PK)      │
│ username    │ N        │ title        │
│ email       │          │ owner_id(FK) │
└─────────────┘          └──────────────┘
```

**Propiedades:**
- **Lado Propietario:** Model3DEntity (tiene la FK `owner_id`)
- **Lado Inverso:** UserEntity (`mappedBy = "owner"`)
- **Cascade:** REMOVE + PERSIST (orphanRemoval = true)
- **Fetch:** LAZY (carga perezosa)

**Inserción en BD:**
```sql
-- Tabla users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL
);

-- Tabla models_3d
CREATE TABLE models_3d (
    id SERIAL PRIMARY KEY,
    title VARCHAR NOT NULL,
    description TEXT,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
);
```

### 2. **Relación MUCHOS-A-MUCHOS (N→N)**
**Entre Model3DEntity y MaterialEntity**

```
┌──────────────┐        ┌───────────────────┐        ┌──────────────┐
│   Model3D    │ N  ┌─ →│ model_materials   │ ← ─  N │  Material    │
├──────────────┤    │   ├───────────────────┤        ├──────────────┤
│ id (PK)      │    │   │ model_id (FK)     │        │ id (PK)      │
│ title        │    │   │ material_id (FK)  │        │ typeMaterial │
│ owner_id(FK) │    │   └───────────────────┘        │ posX, Y, Z   │
└──────────────┘    │   (Tabla de Unión)             │ rotX, Y, Z   │
                    │                                 │ opacity      │
                    └─────────────────────────────────┘ assetPath    │
                                                      └──────────────┘
```

**Propiedades:**
- **Lado Propietario:** Model3DEntity (@JoinTable define la tabla de unión)
- **Lado Inverso:** MaterialEntity (`mappedBy = "materials"`)
- **Tabla de Unión:** `model_materials`
- **Cascade:** PERSIST + MERGE (para operaciones de BD)
- **Fetch:** LAZY

**Inserción en BD:**
```sql
-- Tabla materials
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    type_material VARCHAR NOT NULL,
    pos_x FLOAT NOT NULL,
    pos_y FLOAT NOT NULL,
    pos_z FLOAT NOT NULL,
    rot_x FLOAT NOT NULL,
    rot_y FLOAT NOT NULL,
    rot_z FLOAT NOT NULL,
    opacity FLOAT NOT NULL,
    asset_path VARCHAR NOT NULL
);

-- Tabla de unión (generada automáticamente por Hibernate)
CREATE TABLE model_materials (
    model_id BIGINT NOT NULL REFERENCES models_3d(id),
    material_id BIGINT NOT NULL REFERENCES materials(id),
    PRIMARY KEY (model_id, material_id)
);
```

---

## 📦 Repositorios (JpaRepository)

### UserRepository
```java
@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    Optional<UserEntity> findByUsername(String username);
    Optional<UserEntity> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```

### MaterialJpaRepository
```java
public interface MaterialJpaRepository extends JpaRepository<MaterialEntity, Long> {
}
```

### Model3DJpaRepository
```java
public interface Model3DJpaRepository extends JpaRepository<Model3DEntity, Long> {
    List<Model3DEntity> findByOwnerId(Long ownerId);
}
```

**Métodos disponibles (heredados de JpaRepository):**
- `save()` - Insertar/actualizar
- `findById()` - Buscar por ID
- `findAll()` - Obtener todos
- `delete()` - Eliminar
- `existsById()` - Verificar existencia

---

## 🎯 Servicios (@Service)

### UserService
```java
@Service
@RequiredArgsConstructor
@Transactional
public class UserService {
    private final UserRepository userRepository;
    
    public UserEntity saveUser(UserEntity user) { ... }
    public Optional<UserEntity> getUserById(Long id) { ... }
    public UserEntity updateUser(Long id, UserEntity userDetails) { ... }
    public void deleteUser(Long id) { ... }
}
```

### MaterialService
```java
@Service
@Transactional
public class MaterialService {
    public MaterialEntity saveMaterial(MaterialEntity material) { ... }
    public Optional<MaterialEntity> getMaterialById(Long id) { ... }
    public List<MaterialEntity> getAllMaterials() { ... }
}
```

### Model3DService
```java
@Service
@Transactional
public class Model3DService {
    public Model3DEntity saveModel(Model3DEntity model) { ... }
    public List<Model3DEntity> getModelsByUserId(Long userId) { ... }
    public Model3DEntity addMaterialToModel(Long modelId, Long materialId) { ... }
}
```

**@Transactional:**
- Abre una transacción en cada operación
- Realiza rollback si hay excepciones
- Cierra automáticamente la sesión de Hibernate

---

## 🌐 Controladores REST

### UserController
```java
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;
    
    @PostMapping
    public ResponseEntity<UserEntity> createUser(@RequestBody UserEntity user) { ... }
    
    @GetMapping("/{id}")
    public ResponseEntity<UserEntity> getUserById(@PathVariable Long id) { ... }
    
    @GetMapping
    public ResponseEntity<List<UserEntity>> getAllUsers() { ... }
    
    @PutMapping("/{id}")
    public ResponseEntity<UserEntity> updateUser(@PathVariable Long id, @RequestBody UserEntity userDetails) { ... }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) { ... }
}
```

### MaterialController
Similar a UserController con endpoints para materiales

### Model3DController
```java
@GetMapping("/user/{userId}")
public ResponseEntity<List<Model3DEntity>> getModelsByUserId(@PathVariable Long userId) { ... }
```

---

## ⚙️ Configuración (application.properties)

```properties
# Base de datos PostgreSQL
spring.datasource.url=jdbc:postgresql://localhost:5432/biohouse
spring.datasource.username=postgres
spring.datasource.password=postgres

# JPA/Hibernate
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Optimización
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true

# Logging
logging.level.org.hibernate.SQL=DEBUG
logging.level.org.hibernate.type.descriptor.sql.BasicBinder=TRACE
```

**Opciones de `ddl-auto`:**
- `validate` - Solo valida
- `update` - Crea/actualiza tablas
- `create` - Borra y crea tablas
- `create-drop` - Borra al cerrar

---

## 💡 Ejemplo de Uso

### 1. Crear un Usuario
```bash
POST /api/users
Content-Type: application/json

{
  "username": "juan_perez",
  "email": "juan@example.com",
  "password": "password123"
}

# Response 201 Created
{
  "id": 1,
  "username": "juan_perez",
  "email": "juan@example.com",
  "models": []
}
```

### 2. Crear Materiales
```bash
POST /api/materials
Content-Type: application/json

{
  "typeMaterial": "Madera",
  "posX": 0.0,
  "posY": 0.0,
  "posZ": 0.0,
  "rotX": 0.0,
  "rotY": 0.0,
  "rotZ": 0.0,
  "opacity": 1.0,
  "assetPath": "/assets/wood.gltf"
}

# Response
{
  "id": 1,
  "typeMaterial": "Madera",
  ...
}
```

### 3. Crear Modelo 3D con Materiales
```bash
POST /api/models
Content-Type: application/json

{
  "title": "Casa Bioclimática",
  "description": "Diseño moderno sostenible",
  "owner": { "id": 1 },
  "materials": [
    { "id": 1 },
    { "id": 2 }
  ]
}

# Response 201 Created
{
  "id": 1,
  "title": "Casa Bioclimática",
  "description": "Diseño moderno sostenible",
  "owner": { "id": 1, ... },
  "materials": [...]
}
```

### 4. Obtener Modelos del Usuario
```bash
GET /api/models/user/1

# Response 200 OK
[
  {
    "id": 1,
    "title": "Casa Bioclimática",
    "materials": [...]
  }
]
```

### 5. Actualizar Modelo
```bash
PUT /api/models/1
Content-Type: application/json

{
  "title": "Casa Bioclimática v2",
  "description": "Mejorado",
  "materials": [...]
}

# Response 200 OK
```

### 6. Eliminar Usuario (elimina modelos en cascada)
```bash
DELETE /api/users/1

# Response 204 No Content
# (Los modelos del usuario también se eliminan por cascade)
```

---

## 🔒 Consideraciones de Seguridad

1. **Contraseña:** Debe hashearse con BCrypt
2. **Validación:** Agregar @Valid en controladores
3. **CORS:** Configurar si es necesario acceso desde frontend
4. **Autenticación:** Implementar JWT o Spring Security

---

## 📊 Consultas SQL Generadas

**Listar todos los modelos de un usuario:**
```sql
SELECT m.* FROM models_3d m
WHERE m.owner_id = 1;
```

**Listar materiales de un modelo:**
```sql
SELECT mat.* FROM materials mat
INNER JOIN model_materials mm ON mat.id = mm.material_id
WHERE mm.model_id = 1;
```

**Eliminar modelo (eliminará registros de model_materials automáticamente):**
```sql
DELETE FROM models_3d WHERE id = 1;
-- Las filas en model_materials se eliminarán por ON DELETE CASCADE
```

---

## ✅ Checklist de Implementación

- ✅ Entidades con anotaciones JPA
- ✅ Relación 1→N (User ← Model3D)
- ✅ Relación N→N (Model3D ↔ Material)
- ✅ Repositorios JpaRepository
- ✅ Servicios con @Transactional
- ✅ Controladores REST
- ✅ Configuración PostgreSQL
- ✅ Cascade y FetchType optimizados
- ✅ DTOs para respuestas API

---

## 🚀 Próximos Pasos

1. Implementar validación con `@Valid` y `@NotNull`
2. Agregar manejo de excepciones personalizado
3. Implementar autenticación JWT
4. Agregar mappers Entity ↔ DTO
5. Crear tests unitarios
6. Documentar con Swagger/OpenAPI
