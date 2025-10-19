import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { GoogleUser } from 'src/auth/interfaces/google-user.interface';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>
    ) {}

    async findByGoogleId(googleId: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { googleId, isDeleted: false },
        });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { email, isDeleted: false },
        });
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id, isDeleted: false },
        });
    }

    async createFromGoogle(googleUser: GoogleUser): Promise<User> {
        const user = this.userRepository.create({
            googleId: googleUser.googleId,
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            avatar: googleUser.avatar,
        });

        return this.userRepository.save(user);
    }

    async updateFromGoogle(user: User, googleUser: GoogleUser): Promise<User> {
        user.email = googleUser.email;
        user.firstName = googleUser.firstName;
        user.lastName = googleUser.lastName;
        user.avatar = googleUser.avatar;

        return this.userRepository.save(user);
    }

    async getProfile(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId, isDeleted: false },
            relations: ['reviews', 'orders'],
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(
        userId: string,
        updateData: {
            firstName?: string;
            lastName?: string;
            birthDate?: string;
            avatar?: string;
        }
    ): Promise<User> {
        const user = await this.findById(userId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (updateData.firstName !== undefined) {
            user.firstName = updateData.firstName;
        }
        if (updateData.lastName !== undefined) {
            user.lastName = updateData.lastName;
        }
        if (updateData.birthDate !== undefined) {
            user.birthDate = new Date(updateData.birthDate);
        }
        if (updateData.avatar !== undefined) {
            user.avatar = updateData.avatar;
        }

        return this.userRepository.save(user);
    }

    async deleteAccount(userId: string): Promise<void> {
        const user = await this.findById(userId);

        if (!user) {
            throw new NotFoundException('User not found');
        }

        user.isDeleted = true;
        await this.userRepository.save(user);
    }
}
