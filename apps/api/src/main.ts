import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const emailEnabled = process.env.EMAIL_ENABLED === 'true';
  const hasPostmarkToken = Boolean(process.env.POSTMARK_API_TOKEN);

  if (!emailEnabled) {
    console.warn('EMAIL_ENABLED is false; email sending is disabled.');
  } else if (!hasPostmarkToken) {
    console.warn('POSTMARK_API_TOKEN is missing; email sending is disabled.');
  }

  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on port ${port}`);
}

bootstrap();
