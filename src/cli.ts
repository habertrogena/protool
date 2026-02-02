import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapingService } from './scraping/scraping.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const scraper = app.get(ScrapingService);

  const query = process.argv[2] || 'business Nairobi';

  const count = await scraper.run(query);
  console.log(`✅ Saved ${count} leads`);

  await app.close();
}

bootstrap();
