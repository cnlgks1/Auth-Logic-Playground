import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  // 프론트엔드 통신을 위한 CORS 활성화 (배포 및 로컬 모두 허용)
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'https://localhost:3000',
    'http://127.0.0.1:3000'
  ].filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`서버가 다음 주소에서 실행 중입니다: ${await app.getUrl()}`);
}
bootstrap();
