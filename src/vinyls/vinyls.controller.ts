import {
    Controller,
    Post,
    UseGuards,
    Body,
    Get,
    Query,
    Param,
    Patch,
    HttpCode,
    HttpStatus,
    Delete,
    UseInterceptors,
} from '@nestjs/common';
import { VinylsService } from './vinyls.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { UserRole } from 'src/users/entities/user.entity';
import { CreateVinylDto } from './dto/create-vinyl.dto';
import { Vinyl } from './entities/vinyl.entity';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { QueryVinylDto } from './dto/query-vinyl.dto';
import { PaginatedVinyls } from './interfaces/paginated-vinyls.interface';
import { Public } from 'src/auth/decorators/public.decorator';
import { UpdateVinylDto } from './dto/update-vinyl.dto';
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';

@Controller('vinyls')
@UseInterceptors(AuditInterceptor)
export class VinylsController {
    constructor(private readonly vinylsService: VinylsService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async create(@Body() createVinylDto: CreateVinylDto): Promise<Vinyl> {
        return this.vinylsService.create(createVinylDto);
    }

    @Get()
    @Public()
    async findAll(@Query() query: QueryVinylDto): Promise<PaginatedVinyls> {
        return this.vinylsService.findAll(query);
    }

    @Get(':id')
    @Public()
    async findOne(
        @Param('id') id: string
    ): Promise<Vinyl & { averageScore: number }> {
        return this.vinylsService.findOneWithAverageScore(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async update(
        @Param('id') id: string,
        @Body() updateVinylDto: UpdateVinylDto
    ): Promise<Vinyl> {
        return this.vinylsService.update(id, updateVinylDto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    async remove(@Param('id') id: string): Promise<void> {
        return this.vinylsService.remove(id);
    }
}
