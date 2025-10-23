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
import {
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

@ApiTags('vinyls')
@Controller('vinyls')
@UseInterceptors(AuditInterceptor)
export class VinylsController {
    constructor(private readonly vinylsService: VinylsService) {}

    @Post()
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a new vinyl record (Admin only)' })
    @ApiResponse({ status: 201, description: 'Vinyl created successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    async create(@Body() createVinylDto: CreateVinylDto): Promise<Vinyl> {
        return this.vinylsService.create(createVinylDto);
    }

    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Get all vinyl records with pagination and filters',
        description:
            'Authentication is optional. If authenticated, shows first review from other users.',
    })
    @ApiResponse({ status: 200, description: 'Returns paginated vinyls' })
    async findAll(
        @Query() query: QueryVinylDto,
        @CurrentUser() user?: User
    ): Promise<PaginatedVinyls> {
        return this.vinylsService.findAll(query, user?.id);
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get a specific vinyl record by ID' })
    @ApiResponse({
        status: 200,
        description: 'Returns vinyl with average score',
    })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
    async findOne(
        @Param('id') id: string
    ): Promise<Vinyl & { averageScore: number }> {
        return this.vinylsService.findOneWithAverageScore(id);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(UserRole.ADMIN)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Update a vinyl record (Admin only)' })
    @ApiResponse({ status: 200, description: 'Vinyl updated successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Delete a vinyl record (Admin only)' })
    @ApiResponse({ status: 204, description: 'Vinyl deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
    async remove(@Param('id') id: string): Promise<void> {
        return this.vinylsService.remove(id);
    }
}
