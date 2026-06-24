import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

export interface AuthentikUser {
  sub: string;
  email: string;
  name: string;
  preferred_username: string;
  groups?: string[];
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  getAuthentikUrls() {
    const issuer = this.configService.get<string>('AUTHENTIK_ISSUER');
    return {
      authorizeUrl: this.configService.get<string>('AUTHENTIK_AUTHORIZE_URL'),
      tokenUrl: this.configService.get<string>('AUTHENTIK_TOKEN_URL'),
      userinfoUrl: this.configService.get<string>('AUTHENTIK_USERINFO_URL'),
      logoutUrl: this.configService.get<string>('AUTHENTIK_LOGOUT_URL'),
      clientId: this.configService.get<string>('AUTHENTIK_CLIENT_ID'),
      issuer,
    };
  }

  async validateOidcUser(profile: AuthentikUser) {
    const adminGroup = this.configService.get<string>(
      'AUTHENTIK_ADMIN_GROUP',
      'QA-Platform-Admins',
    );
    const roles = profile.groups?.includes(adminGroup) ? ['admin'] : ['user'];

    let user = await this.usersService.findByExternalId(profile.sub);
    if (!user) {
      user = await this.usersService.create({
        externalId: profile.sub,
        email: profile.email,
        displayName: profile.name,
        login: profile.preferred_username,
        roles,
      });
    } else {
      user = await this.usersService.update(user.id, {
        email: profile.email,
        displayName: profile.name,
        roles,
      });
    }

    return user;
  }

  async login(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.displayName,
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        roles: user.roles,
      },
    };
  }

  async validateJwtPayload(payload: JwtPayload) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}
