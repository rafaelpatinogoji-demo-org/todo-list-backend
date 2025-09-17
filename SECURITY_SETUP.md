# Configuración de Revisión de Seguridad con Devin

Este repositorio incluye un workflow de GitHub Actions que utiliza Devin AI para realizar revisiones automáticas de seguridad en cada commit.

## 🔧 Configuración Inicial

### 1. Configurar el API Key de Devin

1. Ve a la configuración de tu repositorio en GitHub
2. Navega a **Settings** > **Secrets and variables** > **Actions**
3. Crea un nuevo secret llamado `DEVIN_API_KEY`
4. Pega tu token de API de Devin (obtenlo desde [Devin Dashboard](https://app.devin.ai))

### 2. Variables de Entorno Locales

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus valores reales:

```env
# Devin API Configuration
DEVIN_API_KEY=tu_api_key_de_devin_aqui

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/todolist
MONGODB_DATABASE=todolist

# Other environment variables
NODE_ENV=development
PORT=3000
```

## 🚀 Cómo Funciona

### Triggers del Workflow

El workflow se ejecuta automáticamente cuando:
- Se hace push a las ramas `main` o `develop`
- Se crea o actualiza un Pull Request hacia `main` o `develop`

### Proceso de Revisión

1. **Checkout del código**: Descarga el código del repositorio
2. **Obtención de información del commit**: Extrae el SHA y URL del commit
3. **Activación de Devin**: Crea una sesión de Devin con un prompt específico para revisar seguridad
4. **Comentario en PR**: Si es un PR, agrega un comentario con el enlace a la sesión de Devin
5. **Status del commit**: Actualiza el estado del commit con el resultado

### Qué Revisa Devin

- ✅ Vulnerabilidades de seguridad en el código
- ✅ Exposición de secretos o credenciales
- ✅ Inyección de código malicioso
- ✅ Configuraciones inseguras
- ✅ Dependencias con vulnerabilidades conocidas

## 📋 Ejemplo de Prompt

Devin recibe un prompt similar a este:

```
Revisa este repositorio y verifica que el commit que se está haciendo 
(https://github.com/usuario/repo/commit/abc123) no contenga ninguna 
vulnerabilidad de seguridad.

Por favor analiza:
1. Vulnerabilidades de seguridad en el código
2. Exposición de secretos o credenciales
3. Inyección de código malicioso
4. Configuraciones inseguras
5. Dependencias con vulnerabilidades conocidas

Si encuentras algún problema, agrega un comentario detallado explicando 
qué vulnerabilidad encontraste, dónde se encuentra y cómo solucionarla.
```

## 🔍 Monitoreo y Resultados

### En Pull Requests

Cuando se crea o actualiza un PR, verás:
- Un comentario automático con el enlace a la sesión de Devin
- Un status check que indica si la revisión se inició correctamente

### En el Dashboard de Actions

- Ve a la pestaña **Actions** de tu repositorio
- Busca el workflow "Devin Security Review"
- Revisa los logs y el resumen de cada ejecución

### En Devin

- Accede a [app.devin.ai](https://app.devin.ai)
- Busca las sesiones con título "Security Review - Commit [SHA]"
- Revisa los resultados y recomendaciones de Devin

## 🛠️ Personalización

### Modificar el Prompt

Edita el archivo `.github/workflows/devin-security-review.yml` y modifica la variable `PROMPT` para ajustar qué debe revisar Devin.

### Cambiar Triggers

Modifica la sección `on:` del workflow para cambiar cuándo se ejecuta:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # Agregar más ramas
  pull_request:
    branches: [ main ]  # Solo PRs a main
```

### Agregar Más Validaciones

Puedes agregar steps adicionales antes o después de la revisión de Devin:

```yaml
- name: Run security scan
  run: npm audit

- name: Check for secrets
  uses: trufflesecurity/trufflehog@main
```

## 🚨 Troubleshooting

### Error: "Invalid API Key"
- Verifica que el secret `DEVIN_API_KEY` esté configurado correctamente
- Asegúrate de que el API key sea válido y tenga permisos

### Error: "Session creation failed"
- Revisa los logs del workflow para más detalles
- Verifica que la API de Devin esté disponible
- Comprueba que el formato del prompt sea correcto

### No se ejecuta el workflow
- Verifica que el archivo esté en `.github/workflows/`
- Asegúrate de que la sintaxis YAML sea correcta
- Comprueba que los triggers coincidan con tus acciones

## 📞 Soporte

Si tienes problemas con la configuración:
1. Revisa los logs del workflow en GitHub Actions
2. Consulta la [documentación de Devin API](https://docs.devin.ai)
3. Verifica la configuración de secrets en tu repositorio
