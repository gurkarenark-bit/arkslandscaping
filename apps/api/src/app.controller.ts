import { Controller, Get } from '@nestjs/common';
import { Client } from 'pg';

@Controller()
export class AppController {
  @Get('health')
  async health() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      return {
        status: 'ok',
        database: {
          configured: false,
          connected: false,
          message: 'DATABASE_URL is not set',
        },
      };
    }

    const client = new Client({ connectionString: databaseUrl });

    try {
      await client.connect();
      await client.query('SELECT 1');

      return {
        status: 'ok',
        database: {
          configured: true,
          connected: true,
        },
      };
    } catch (error) {
      return {
        status: 'ok',
        database: {
          configured: true,
          connected: false,
          message: error instanceof Error ? error.message : 'Unknown database error',
        },
      };
    } finally {
      await client.end().catch(() => undefined);
    }
  }
}
