import { Module } from '@nestjs/common';
import { VinylsService } from './vinyls.service';
import { VinylsController } from './vinyls.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vinyl } from './entities/vinyl.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Vinyl])],
    providers: [VinylsService],
    controllers: [VinylsController],
    exports: [VinylsService],
})
export class VinylsModule {}
