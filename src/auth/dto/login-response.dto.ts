export class LoginResponseDto {
    accessToken: string;

    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        avatar: string | null;
        role: string;
    };
}
