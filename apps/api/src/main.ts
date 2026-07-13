import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:3001",
      "http://localhost:3000",
      process.env.DASHBOARD_URL,
      process.env.LANDING_URL,
    ].filter(Boolean) as string[],
    credentials: true,
  });

  app.setGlobalPrefix("api");

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}/api`);
}
bootstrap();
