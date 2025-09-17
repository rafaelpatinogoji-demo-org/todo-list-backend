# Plan de Reorganización de Rutas por Método HTTP

## Objetivo
Separar las rutas de la API en archivos distintos según el tipo de petición HTTP (GET, POST, PUT, DELETE) para mejorar la organización y mantenibilidad del código.

## Estructura Actual
```
src/routes/
├── commentRoutes.js (contiene GET, POST, PUT, DELETE)
└── movieRoutes.js (contiene GET, POST, PUT, DELETE)
```

## Nueva Estructura Propuesta
```
src/routes/
├── comments/
│   ├── commentGetRoutes.js (rutas GET)
│   ├── commentPostRoutes.js (rutas POST)
│   ├── commentPutRoutes.js (rutas PUT)
│   └── commentDeleteRoutes.js (rutas DELETE)
├── movies/
│   ├── movieGetRoutes.js (rutas GET)
│   ├── moviePostRoutes.js (rutas POST)
│   ├── moviePutRoutes.js (rutas PUT)
│   └── movieDeleteRoutes.js (rutas DELETE)
└── index.js (archivo principal que combina todas las rutas)
```

## Detalles de Implementación

### 1. Rutas de Comments

#### commentGetRoutes.js
- `GET /` - Obtener todos los comentarios (f_getAllComments)
- `GET /:id` - Obtener comentario por ID (f_getCommentById)
- `GET /movie/:movieId` - Obtener comentarios por película (f_getCommentsByMovie)

#### commentPostRoutes.js
- `POST /` - Crear nuevo comentario (f_createComment)

#### commentPutRoutes.js
- `PUT /:id` - Actualizar comentario (f_updateComment)

#### commentDeleteRoutes.js
- `DELETE /:id` - Eliminar comentario (f_deleteComment)

### 2. Rutas de Movies

#### movieGetRoutes.js
- `GET /` - Obtener todas las películas (f_getAllMovies)
- `GET /search` - Buscar películas (f_searchMovies)
- `GET /:id` - Obtener película por ID (f_getMovieById)

#### moviePostRoutes.js
- `POST /` - Crear nueva película (f_createMovie)

#### moviePutRoutes.js
- `PUT /:id` - Actualizar película (f_updateMovie)

#### movieDeleteRoutes.js
- `DELETE /:id` - Eliminar película (f_deleteMovie)

### 3. Archivo Principal de Rutas (index.js)
Este archivo combinará todas las rutas y las exportará de manera organizada:
```javascript
const express = require('express');
const router = express.Router();

// Importar rutas de comments
const commentGetRoutes = require('./comments/commentGetRoutes');
const commentPostRoutes = require('./comments/commentPostRoutes');
const commentPutRoutes = require('./comments/commentPutRoutes');
const commentDeleteRoutes = require('./comments/commentDeleteRoutes');

// Importar rutas de movies
const movieGetRoutes = require('./movies/movieGetRoutes');
const moviePostRoutes = require('./movies/moviePostRoutes');
const moviePutRoutes = require('./movies/moviePutRoutes');
const movieDeleteRoutes = require('./movies/movieDeleteRoutes');

// Configurar rutas de comments
router.use('/comments', commentGetRoutes);
router.use('/comments', commentPostRoutes);
router.use('/comments', commentPutRoutes);
router.use('/comments', commentDeleteRoutes);

// Configurar rutas de movies
router.use('/movies', movieGetRoutes);
router.use('/movies', moviePostRoutes);
router.use('/movies', moviePutRoutes);
router.use('/movies', movieDeleteRoutes);

module.exports = router;
```

## Pasos de Implementación

### Fase 1: Crear Estructura de Directorios
1. Crear directorio `src/routes/comments/`
2. Crear directorio `src/routes/movies/`

### Fase 2: Crear Archivos de Rutas por Método HTTP
1. Crear archivos para rutas GET de comments y movies
2. Crear archivos para rutas POST de comments y movies
3. Crear archivos para rutas PUT de comments y movies
4. Crear archivos para rutas DELETE de comments y movies

### Fase 3: Migrar Código
1. Mover las rutas correspondientes de los archivos originales a los nuevos archivos
2. Asegurar que todas las importaciones de controladores estén correctas
3. Verificar que cada archivo exporte correctamente su router

### Fase 4: Crear Archivo Principal
1. Crear `src/routes/index.js` que combine todas las rutas
2. Configurar las rutas con sus prefijos correspondientes

### Fase 5: Actualizar app.js
1. Modificar `app.js` para usar el nuevo archivo principal de rutas
2. Eliminar las importaciones de los archivos antiguos

### Fase 6: Limpieza
1. Eliminar archivos antiguos `commentRoutes.js` y `movieRoutes.js`
2. Probar que todas las rutas funcionen correctamente

## Ventajas de esta Estructura

1. **Organización Clara**: Cada tipo de operación HTTP está en su propio archivo
2. **Mantenibilidad**: Es más fácil encontrar y modificar rutas específicas
3. **Escalabilidad**: Fácil agregar nuevas rutas sin afectar otras
4. **Separación de Responsabilidades**: Cada archivo tiene una responsabilidad específica
5. **Legibilidad**: El código es más fácil de leer y entender

## Consideraciones

- Mantener la misma funcionalidad existente
- Asegurar que todas las rutas mantengan sus paths originales
- Verificar que los middlewares se apliquen correctamente
- Probar exhaustivamente después de la migración

¿Estás de acuerdo con este plan? ¿Te gustaría que proceda con la implementación o hay algo que quieras modificar?
