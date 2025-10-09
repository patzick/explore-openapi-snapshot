import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { sendSchemaToApi } from '../api.js';

// Load environment variables from .env file
function loadEnvFile() {
  try {
    const envContent = readFileSync('.env', 'utf-8');
    const envVars: Record<string, string> = {};

    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });

    return envVars;
  } catch (error) {
    throw new Error('Failed to load .env file. Make sure it exists and contains required variables.');
  }
}

describe('E2E Tests', () => {
  const envVars = loadEnvFile();

  const requiredVars = ['API_URL', 'API_AUTH_TOKEN', 'TEST_PROJECT', 'TEST_SNAPSHOT_NAME'];

  // Check if all required environment variables are present
  requiredVars.forEach(varName => {
    if (!envVars[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });

  const testSchema = {
    openapi: '3.0.0',
    info: {
      title: 'Test API',
      version: '1.0.0',
      description: 'E2E test schema for explore-openapi-snapshot'
    },
    paths: {
      '/test': {
        get: {
          summary: 'Test endpoint',
          responses: {
            '200': {
              description: 'Success',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string',
                        example: 'Hello World'
                      }
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

  it('should successfully send schema to API and receive valid response', async () => {
    const response = await sendSchemaToApi(
      envVars.API_URL,
      testSchema,
      envVars.API_AUTH_TOKEN,
      envVars.TEST_PROJECT,
      envVars.TEST_SNAPSHOT_NAME
    );

    // Verify response has expected structure (without snapshotting dynamic values)
    expect(response).toHaveProperty('id');
    expect(response).toHaveProperty('name');
    expect(response).toHaveProperty('projectId');
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('hash');
    expect(response).toHaveProperty('createdAt');

    expect(typeof response.id).toBe('string');
    expect(typeof response.name).toBe('string');
    expect(typeof response.projectId).toBe('string');
    expect(typeof response.status).toBe('string');
    expect(typeof response.hash).toBe('string');
    expect(typeof response.createdAt).toBe('string');

    // Verify specific expected values
    expect(response.name).toBe(envVars.TEST_SNAPSHOT_NAME);
    expect(response.status).toBe('available');
    // Note: projectId might be different from TEST_PROJECT if TEST_PROJECT is a name, not ID
    expect(typeof response.projectId).toBe('string');
    expect(response.projectId).toMatch(/^[0-9a-f-]+$/); // UUID format

    // Snapshot only the structure (with dynamic values normalized)
    const normalizedResponse = {
      ...response,
      id: '[UUID]',
      projectId: '[PROJECT_ID]',
      createdAt: '[TIMESTAMP]',
      modifiedAt: '[TIMESTAMP]'
    };
    expect(normalizedResponse).toMatchSnapshot('api-response-structure.json');

    // Log response for debugging
    console.log('API Response:', JSON.stringify(response, null, 2));
  }, 30000); // 30 second timeout for API call
});
