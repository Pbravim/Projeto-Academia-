import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';
import { assertJwtSecret } from './auth/jwt.config';
import { buildValidationPipe } from './validation';

async function bootstrap() {
  assertJwtSecret();
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(buildValidationPipe());
  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Academia API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
