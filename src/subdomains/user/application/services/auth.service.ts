import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Config } from 'src/config/config';
import { CryptoService } from 'src/integration/blockchain/services/crypto.service';
import { JwtPayload } from 'src/shared/auth/jwt-payload.interface';
import { SignMessageDto } from 'src/subdomains/user/application/dto/sign-message.dto';
import { SignUpDto } from 'src/subdomains/user/application/dto/sign-up.dto';
import { WalletService } from 'src/subdomains/user/application/services/wallet.service';
import { Wallet } from 'src/subdomains/user/domain/entities/wallet.entity';
import { AuthResponseDto } from '../dto/auth-response.dto';
import { SignInDto } from '../dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly walletService: WalletService,
    private readonly jwtService: JwtService,
    private readonly cryptoService: CryptoService,
  ) {}

  async signUp(signUp: SignUpDto): Promise<AuthResponseDto> {
    const existingWallet = await this.walletService.getByAddress(signUp.address);
    if (existingWallet) throw new ConflictException('User already exists');

    if (!this.verifySignature(signUp.address, signUp.signature)) throw new BadRequestException('Invalid signature');

    const wallet = await this.walletService.create(signUp);

    return { accessToken: this.generateToken(wallet) };
  }

  async signIn({ address, signature }: SignInDto): Promise<AuthResponseDto> {
    const wallet = await this.walletService.getByAddress(address);
    if (!wallet) throw new NotFoundException('User not found');

    if (!this.verifySignature(address, signature)) throw new UnauthorizedException('Invalid credentials');

    return { accessToken: this.generateToken(wallet) };
  }

  getSignInfo(address: string): SignMessageDto {
    return {
      message: this.getSignMessage(address),
    };
  }

  private getSignMessage(address: string): string {
    return Config.auth.signMessage + address;
  }

  private verifySignature(address: string, signature: string): boolean {
    const message = this.getSignMessage(address);
    return this.cryptoService.verifySignature(message, address, signature);
  }

  private generateToken(wallet: Wallet): string {
    const payload: JwtPayload = {
      walletId: wallet.id,
      userId: wallet.user.id,
      address: wallet.address,
      role: wallet.role,
    };
    return this.jwtService.sign(payload);
  }
}
