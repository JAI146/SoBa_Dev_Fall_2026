import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { config as loadDotenv } from 'dotenv';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { corsOrigins, validateEnv } from './config/env.validation';

const GLOBAL_PREFIX = 'api';

async function bootstrap() {
  loadDotenv();

  // Fail before anything is wired up. A missing JWT_ACCESS_SECRET or
  // DATABASE_URL should stop the process, not surface as a 500 later.
  const env = validateEnv(process.env);
  const isProduction = env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      // Swagger UI at /api/docs runs inline scripts, which helmet's default
      // CSP blocks. Docs are dev-only, and so is this exemption.
      contentSecurityPolicy: isProduction,
    }),
  );
  app.use(cookieParser());
  // Needed for `request.ip` to be the caller rather than the load balancer,
  // which is what the throttler and the audit trail key on.
  app.set('trust proxy', 1);

  app.setGlobalPrefix(GLOBAL_PREFIX);
  app.enableCors({
    origin: corsOrigins(env),
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  if (!isProduction) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('PurposeMint API')
        .setDescription('Auth and user endpoints')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup(`${GLOBAL_PREFIX}/docs`, app, document);
  }

  await app.listen(env.PORT);
  Logger.log(
    `PurposeMint API listening on http://localhost:${env.PORT}/${GLOBAL_PREFIX}`,
    'Bootstrap',
  );
}

void bootstrap();
