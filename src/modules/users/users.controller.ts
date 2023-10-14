import { type user } from '@prisma/client';
import { HttpStatusCode } from 'axios';
import bcrypt from 'bcrypt';
import { type Response, type NextFunction, type Request } from 'express';
import {
  type LoginDto,
  type CreateUserDto,
  type ResetPasswordInitiateDto,
  type PerformPasswordResetDto,
} from './user.dto';
import UserService from './users.service';
import { UserStatus } from './types';
import { type CustomResponse } from '@/types/common.type';
import Api from '@/lib/api';
import {
  generateRefreshToken,
  generateToken,
} from '@/middlewares/token-manager';
import { setAuthCookies } from '@/middlewares/cookies';

export default class UserController extends Api {
  private readonly userService = new UserService();

  public signup = async (
    req: Request,
    res: CustomResponse<user>,
    next: NextFunction
  ) => {
    try {
      const userData: CreateUserDto = req.body;

      const hashedPassword: string = await bcrypt.hash(userData.password, 10);

      const user = await this.userService.createUser({
        ...userData,
        password: hashedPassword,
        status: UserStatus.PENDING,
      });

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      setAuthCookies(res, token, refreshToken);

      this.send(res, { user, token }, HttpStatusCode.Created, 'signup');
    } catch (e) {
      console.log(e);
      next(e);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as LoginDto;

      const user = await this.userService.validateUserCredentials(
        email,
        password
      );

      if (!user) {
        // Handle login failure
        return this.send(
          res,
          null,
          HttpStatusCode.Unauthorized,
          'Invalid email or password'
        );
      }

      const token = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      setAuthCookies(res, token, refreshToken);

      return res.status(HttpStatusCode.Ok).json({ user });
    } catch (e) {
      next(e);
    }
  };

  public initiateResetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { email } = req.body as ResetPasswordInitiateDto;
      await this.userService.initiatePasswordReset(email);
      res.status(200).json({ message: 'Password reset email sent' });
    } catch (e) {
      next(e);
    }
  };

  public performPasswordReset = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { token, password } = req.body as PerformPasswordResetDto;
      await this.userService.performPasswordReset(token, password);
      res.status(200).json({ message: 'Password reset successful' });
    } catch (e) {
      next(e);
    }
  };

  public requestPasswordReset = async (req, res, next) => {
    try {
      await this.userService.sendOtpToUser(req.body.email);
      this.send(res, {}, HttpStatusCode.Ok, 'OTP sent to email');
    } catch (e) {
      next(e);
    }
  };

  public verifyOtp = async (req, res, next) => {
    try {
      const isValidOtp = await this.userService.verifyOtp(
        req.body.email,
        req.body.otp
      );
      this.send(
        res,
        {},
        isValidOtp ? HttpStatusCode.Ok : HttpStatusCode.BadRequest,
        isValidOtp ? 'OTP verified' : 'Invalid OTP'
      );
    } catch (e) {
      next(e);
    }
  };

  public resetPassword = async (req, res, next) => {
    try {
      await this.userService.resetPassword(
        req.body.email,
        req.body.newPassword
      );
      this.send(res, {}, HttpStatusCode.Ok, 'Password updated successfully');
    } catch (e) {
      next(e);
    }
  };

  public deleteAccount = async (
    req: Request,
    res: CustomResponse<user>,
    next: NextFunction
  ) => {
    try {
      await this.userService.deleteAccount(req.user?.id);
      this.send(res, null, HttpStatusCode.Ok, 'Account deleted successfully');
    } catch (e) {
      next(e);
    }
  };

  public changeUserStatus = async (
    req: Request,
    res: CustomResponse<user>,
    next: NextFunction
  ) => {
    try {
      await this.userService.changeUserStatus(req.body);
      this.send(
        res,
        null,
        HttpStatusCode.Ok,
        'User status updated successfully'
      );
    } catch (e) {
      next(e);
    }
  };

  public fetchUsersByStatus = async (
    req: Request,
    res: CustomResponse<user[]>,
    next: NextFunction
  ) => {
    try {
      const users = await this.userService.fetchUsersByStatus(
        req.query.status as UserStatus
      );
      this.send(
        res,
        users,
        HttpStatusCode.Ok,
        `${users.length} users fetched successfully`
      );
    } catch (e) {
      next(e);
    }
  };

  public fetchCurrentUser = async (
    req: Request,
    res: CustomResponse<user>,
    next: NextFunction
  ) => {
    try {
      const user = await this.userService.fetchUserById(req.user?.id);
      this.send(res, user, HttpStatusCode.Ok, `user fetched successfully`);
    } catch (e) {
      next(e);
    }
  };

  public fetchUserById = async (
    req: Request,
    res: CustomResponse<user>,
    next: NextFunction
  ) => {
    try {
      const users = await this.userService.fetchUserById(req.params.id);
      this.send(res, users, HttpStatusCode.Ok, `user fetched successfully`);
    } catch (e) {
      next(e);
    }
  };
}
