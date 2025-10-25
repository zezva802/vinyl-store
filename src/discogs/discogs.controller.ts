import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { DiscogsService } from './discogs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
import {
    DiscogsSearchResponse,
    DiscogsRelease,
} from './interfaces/discogs.interface';

@ApiTags('discogs')
@Controller('discogs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class DiscogsController {
    constructor(private readonly discogsService: DiscogsService) {}

    @Get('search')
    @ApiOperation({
        summary: 'Search Discogs for vinyl records (Admin only)',
        description: 'Search the Discogs database for vinyl releases',
    })
    @ApiQuery({ name: 'q', description: 'Search query', example: 'Pink Floyd' })
    @ApiQuery({
        name: 'page',
        description: 'Page number',
        required: false,
        example: 1,
    })
    @ApiResponse({
        status: 200,
        description: 'Returns Discogs search results',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    async search(
        @Query('q') query: string,
        @Query('page') page?: number
    ): Promise<DiscogsSearchResponse> {
        return this.discogsService.searchVinyls(query, page);
    }

    @Get('release/:id')
    @ApiOperation({
        summary: 'Get Discogs release details (Admin only)',
        description: 'Get detailed information about a specific Discogs release',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns Discogs release details',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    @ApiResponse({ status: 404, description: 'Release not found' })
    async getRelease(@Param('id') id: string): Promise<DiscogsRelease> {
        return this.discogsService.getRelease(id);
    }
}