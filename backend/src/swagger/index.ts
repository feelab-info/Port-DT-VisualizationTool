import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { openApiSpec } from './spec';

/**
 * Set up Swagger UI at /api-docs
 * OpenAPI spec is available at /api-docs.json
 */
export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    explorer: true,
    customSiteTitle: 'Port Digital Twin API',
    customCss: '.swagger-ui .topbar { display: none }',
  }));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (_, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(openApiSpec);
  });
}
