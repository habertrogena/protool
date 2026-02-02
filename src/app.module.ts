import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './common/prisma/prisma.module';
import { ScrapingModule } from './scraping/scraping.module';
import { LeadsModule } from './leads/leads.module';

@Module({
  imports: [PrismaModule, ScrapingModule, LeadsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
