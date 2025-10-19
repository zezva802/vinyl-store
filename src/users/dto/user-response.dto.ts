export class UserResponseDto {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    birthDate: Date | null;
    avatar: string | null;
    role: string;
    createdAt: Date;
}
