const axios = require('axios');

const f_testAnalyticsEndpoints = async () => {
  const v_baseUrl = 'http://localhost:3000/api';
  
  console.log('🧪 Iniciando pruebas de endpoints de analytics...\n');
  
  const v_tests = [
    {
      name: 'Resumen de Analytics',
      url: `${v_baseUrl}/analytics/summary`,
      method: 'GET'
    },
    {
      name: 'Métricas del Sistema',
      url: `${v_baseUrl}/analytics/system-metrics`,
      method: 'GET'
    },
    {
      name: 'Métricas de Rendimiento',
      url: `${v_baseUrl}/analytics/performance`,
      method: 'GET'
    },
    {
      name: 'Análisis de Comportamiento de Usuarios',
      url: `${v_baseUrl}/analytics/user-behavior`,
      method: 'GET'
    },
    {
      name: 'Métricas de Popularidad de Películas',
      url: `${v_baseUrl}/analytics/movie-popularity`,
      method: 'GET'
    },
    {
      name: 'Métricas de Tendencias',
      url: `${v_baseUrl}/analytics/trending`,
      method: 'GET'
    },
    {
      name: 'Análisis de Ingresos',
      url: `${v_baseUrl}/analytics/revenue`,
      method: 'GET'
    },
    {
      name: 'Crear Dashboard Personalizado',
      url: `${v_baseUrl}/analytics/dashboard`,
      method: 'POST',
      data: {
        dashboard_name: 'Dashboard de Prueba',
        user_role: 'admin',
        widgets: [
          { type: 'system_metrics', position: { x: 0, y: 0 } },
          { type: 'movie_popularity', position: { x: 1, y: 0 } }
        ],
        filters: { timeframe: '30d' }
      }
    },
    {
      name: 'Exportar Datos de Analytics',
      url: `${v_baseUrl}/analytics/export?data_type=user_behavior&format=json`,
      method: 'GET'
    },
    {
      name: 'Actualizar Consentimiento de Tracking',
      url: `${v_baseUrl}/analytics/tracking-consent`,
      method: 'PUT',
      data: {
        user_id: '507f1f77bcf86cd799439011',
        consent_given: true
      }
    }
  ];
  
  let v_passedTests = 0;
  let v_failedTests = 0;
  
  for (const v_test of v_tests) {
    try {
      console.log(`📋 Probando: ${v_test.name}`);
      
      const v_config = {
        method: v_test.method,
        url: v_test.url,
        headers: {
          'Content-Type': 'application/json',
          'x-tracking-consent': 'true',
          'x-user-id': '507f1f77bcf86cd799439011',
          'x-session-id': 'test-session-123'
        }
      };
      
      if (v_test.data) {
        v_config.data = v_test.data;
      }
      
      const v_response = await axios(v_config);
      
      if (v_response.status >= 200 && v_response.status < 300) {
        console.log(`✅ ${v_test.name} - Status: ${v_response.status}`);
        console.log(`   Respuesta: ${JSON.stringify(v_response.data).substring(0, 100)}...\n`);
        v_passedTests++;
      } else {
        console.log(`❌ ${v_test.name} - Status: ${v_response.status}\n`);
        v_failedTests++;
      }
    } catch (p_error) {
      console.log(`❌ ${v_test.name} - Error: ${p_error.message}`);
      if (p_error.response) {
        console.log(`   Status: ${p_error.response.status}`);
        console.log(`   Data: ${JSON.stringify(p_error.response.data)}`);
      }
      console.log('');
      v_failedTests++;
    }
  }
  
  console.log('📊 Resumen de Pruebas:');
  console.log(`✅ Pruebas exitosas: ${v_passedTests}`);
  console.log(`❌ Pruebas fallidas: ${v_failedTests}`);
  console.log(`📈 Total de pruebas: ${v_tests.length}`);
  
  if (v_failedTests === 0) {
    console.log('\n🎉 ¡Todas las pruebas de analytics pasaron exitosamente!');
  } else {
    console.log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.');
  }
};

if (require.main === module) {
  f_testAnalyticsEndpoints().catch(console.error);
}

module.exports = { f_testAnalyticsEndpoints };
