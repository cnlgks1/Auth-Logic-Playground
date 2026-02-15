import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // Enable CORS for frontend communication
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Frontend URL
    credentials: true,
  });
  await app.listen(3001); // Backend runs on 3001
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
