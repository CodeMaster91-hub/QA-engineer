import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('login')
  login(@Res() res: Response) {
    const urls = this.authService.getAuthentikUrls();
    const backendUrl = this.configService.get<string>(
      'BACKEND_URL',
      'http://localhost:3000',
    );
    const state = Math.random().toString(36).substring(7);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: urls.clientId || '',
      redirect_uri: `${backendUrl}/api/auth/callback`,
      state,
      scope: 'openid email profile groups',
    });
    res.redirect(`${urls.authorizeUrl}?${params.toString()}`);
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    try {
      const { code } = req.query;
      if (!code) {
        throw new UnauthorizedException('No code provided');
      }

      const urls = this.authService.getAuthentikUrls();
      const backendUrl = this.configService.get<string>(
        'BACKEND_URL',
        'http://localhost:3000',
      );
      const clientSecret = this.configService.get<string>(
        'AUTHENTIK_CLIENT_SECRET',
        '',
      );

      const tokenResponse = await fetch(urls.tokenUrl || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: `${backendUrl}/api/auth/callback`,
          client_id: urls.clientId || '',
          client_secret: clientSecret,
        }),
      });

      const tokens = await tokenResponse.json();
      if (!tokens.access_token) {
        throw new UnauthorizedException('Failed to get tokens');
      }

      const userinfoResponse = await fetch(urls.userinfoUrl || '', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      const profile = await userinfoResponse.json();

      const user = await this.authService.validateOidcUser({
        sub: profile.sub,
        email: profile.email,
        name: profile.name,
        preferred_username: profile.preferred_username,
        groups: profile.groups,
      });

      const { access_token } = await this.authService.login(user);

      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      );
      res.redirect(`${frontendUrl}/auth/callback?token=${access_token}`);
    } catch (error) {
      const frontendUrl = this.configService.get<string>(
        'FRONTEND_URL',
        'http://localhost:5173',
      );
      res.redirect(`${frontendUrl}/auth/error?message=${error.message}`);
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    const urls = this.authService.getAuthentikUrls();
    const frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:5173',
    );
    const idToken = (req.user as any)?.idToken;

    if (urls.logoutUrl && idToken) {
      const params = new URLSearchParams({
        id_token_hint: idToken,
        post_logout_redirect_uri: frontendUrl,
      });
      res.redirect(`${urls.logoutUrl}?${params.toString()}`);
    } else {
      res.redirect(frontendUrl);
    }
  }
}
