import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePaymentIntentDto {
    @IsString()
    @IsNotEmpty()
    vinylId: string;
}
