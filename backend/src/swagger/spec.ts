/**
 * OpenAPI 3.0 specification for Port Digital Twin backend API
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Port Digital Twin API',
    description: 'API for the Port Digital Twin visualization system. Handles authentication, power flow simulations, vessel analysis, converters, and PV modelling.',
    version: '1.0.0',
    contact: {
      name: 'Port Digital Twin'
    }
  },
  servers: [
    { url: 'http://localhost:5001', description: 'Local development' },
    { url: 'https://portdt.prsma.com', description: 'Production' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token obtained from /api/auth/login'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 }
        }
      },
      VerifyEmailRequest: {
        type: 'object',
        required: ['email', 'code'],
        properties: {
          email: { type: 'string', format: 'email' },
          code: { type: 'string' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          token: { type: 'string' },
          refreshToken: { type: 'string' },
          user: { type: 'object' }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'Login, registration, token management' },
    { name: 'Simulation', description: 'Power flow simulation' },
    { name: 'Vessel', description: 'Vessel energy analysis' },
    { name: 'Converters', description: 'Converter monitoring' },
    { name: 'PV Model', description: 'Photovoltaic system' },
    { name: 'Power Flow', description: 'Stored power flow simulations' },
    { name: 'Health', description: 'Health checks' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API health status',
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { status: { type: 'string', example: 'OK' } }
                }
              }
            }
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login',
        description: 'Authenticate with email and password',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } }
          }
        },
        responses: {
          '200': { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          '400': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Start registration',
        description: 'Register with email verification (restricted to port staff)',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } }
          }
        },
        responses: {
          '200': { description: 'Verification code sent', content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, message: { type: 'string' }, nextStep: { type: 'string' } } } } } },
          '400': { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '403': { description: 'Access restricted', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify email',
        description: 'Verify email with code sent during registration',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/VerifyEmailRequest' } }
          }
        },
        responses: {
          '200': { description: 'Email verified, user created' },
          '400': { description: 'Invalid code', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/resend-code': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend verification code',
        requestBody: {
          content: {
            'application/json': { schema: { type: 'object', properties: { email: { type: 'string' } } } }
          }
        },
        responses: {
          '200': { description: 'Code resent' },
          '400': { description: 'Error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/auth/validate': {
      get: {
        tags: ['Authentication'],
        summary: 'Validate token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Token valid' },
          '401': { description: 'Invalid or expired token' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh token',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'New tokens issued' },
          '401': { description: 'Invalid token' }
        }
      }
    },
    '/api/simulation': {
      post: {
        tags: ['Simulation'],
        summary: 'Run simulation',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Simulation started' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/simulation/timesteps-results': {
      get: {
        tags: ['Simulation'],
        summary: 'Get timestep results',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Timestep data' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/simulation/start-service': {
      post: {
        tags: ['Simulation'],
        summary: 'Start simulation service',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Service started' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/simulation/update-device-data': {
      post: {
        tags: ['Simulation'],
        summary: 'Update device data',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Device data updated' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/simulation/devices': {
      get: {
        tags: ['Simulation'],
        summary: 'Get all devices',
        responses: {
          '200': { description: 'List of devices' }
        }
      }
    },
    '/api/vessel/registered': {
      post: {
        tags: ['Vessel'],
        summary: 'Process registered vessel',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Vessel processed' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/vessel/custom': {
      post: {
        tags: ['Vessel'],
        summary: 'Process custom vessel',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Vessel processed' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/vessel/available': {
      get: {
        tags: ['Vessel'],
        summary: 'Get available vessels',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of available vessels' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/vessel/simulations': {
      get: {
        tags: ['Vessel'],
        summary: 'Get vessel simulations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Vessel simulations' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/vessel/simulations/{date}': {
      get: {
        tags: ['Vessel'],
        summary: 'Get simulations by date',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'date', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          '200': { description: 'Simulations for date' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/vessel/current-simulations': {
      get: {
        tags: ['Vessel'],
        summary: 'Get current simulations',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current simulations' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/converters/nodes': {
      get: {
        tags: ['Converters'],
        summary: 'Get converter nodes',
        description: 'List of converter nodes (public)',
        responses: {
          '200': { description: 'List of converter nodes' }
        }
      }
    },
    '/api/converters/latest': {
      get: {
        tags: ['Converters'],
        summary: 'Get latest converter data',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Latest converter data for all nodes' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/converters/historical': {
      get: {
        tags: ['Converters'],
        summary: 'Get historical converter data',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'nodeId', in: 'query', schema: { type: 'string' } },
          { name: 'start', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'end', in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          '200': { description: 'Historical converter data' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/converters/stats': {
      get: {
        tags: ['Converters'],
        summary: 'Get converter statistics',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Converter statistics' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/pv-model/configure': {
      post: {
        tags: ['PV Model'],
        summary: 'Configure PV system',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'PV system configured' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/pv-model/status': {
      get: {
        tags: ['PV Model'],
        summary: 'Get PV system status',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'PV system status' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/pv-model/power-series': {
      post: {
        tags: ['PV Model'],
        summary: 'Calculate power series',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Power series data' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/pv-model/health': {
      get: {
        tags: ['PV Model'],
        summary: 'PV model service health',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'PV model healthy' },
          '401': { description: 'Unauthorized' }
        }
      }
    },
    '/api/powerflow/simulations': {
      get: {
        tags: ['Power Flow'],
        summary: 'List simulations',
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: {
          '200': {
            description: 'List of simulations with summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    data: { type: 'array' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/powerflow/simulations/latest': {
      get: {
        tags: ['Power Flow'],
        summary: 'Get latest simulation',
        description: 'Returns most recent simulation with all timestep data',
        responses: {
          '200': { description: 'Latest simulation with timesteps' },
          '404': { description: 'No simulations found' }
        }
      }
    },
    '/api/powerflow/simulations/{id}': {
      get: {
        tags: ['Power Flow'],
        summary: 'Get simulation by ID',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } }
        ],
        responses: {
          '200': { description: 'Simulation with timesteps' },
          '404': { description: 'Simulation not found' }
        }
      }
    },
    '/api/powerflow/simulations/timerange': {
      get: {
        tags: ['Power Flow'],
        summary: 'Get simulations by time range',
        parameters: [
          { name: 'start', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } },
          { name: 'end', in: 'query', required: true, schema: { type: 'string', format: 'date-time' } }
        ],
        responses: {
          '200': { description: 'Simulations in time range' },
          '400': { description: 'Missing start or end' }
        }
      }
    },
    '/api/powerflow/bus/{busId}/timesteps': {
      get: {
        tags: ['Power Flow'],
        summary: 'Get timesteps for bus',
        parameters: [
          { name: 'busId', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 100 } }
        ],
        responses: {
          '200': { description: 'Timesteps for the specified bus' }
        }
      }
    },
    '/api/powerflow/statistics': {
      get: {
        tags: ['Power Flow'],
        summary: 'Database statistics',
        responses: {
          '200': {
            description: 'Simulation counts, date range, etc.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        total_simulations: { type: 'integer' },
                        unique_days: { type: 'integer' },
                        first_simulation: { type: 'string' },
                        last_simulation: { type: 'string' },
                        total_timesteps: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/powerflow/simulations/cleanup': {
      delete: {
        tags: ['Power Flow'],
        summary: 'Delete old simulations',
        description: 'Data retention - deletes simulations older than N days',
        parameters: [
          { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } }
        ],
        responses: {
          '200': {
            description: 'Deleted count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    deletedCount: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
