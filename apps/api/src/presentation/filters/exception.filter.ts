import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { Request, Response } from "express";
import { JobNotFoundException } from "../../domain/exceptions/job-not-found.exception";
import { InvalidUrlException } from "../../domain/exceptions/invalid-url.exception";

const isProduction = process.env.NODE_ENV === "production";

const FRIENDLY_MESSAGES: Record<number, string> = {
  [HttpStatus.TOO_MANY_REQUESTS]: "Rate limit exceeded. Please try again in a moment.",
  [HttpStatus.UNAUTHORIZED]: "Please sign in to continue.",
  [HttpStatus.FORBIDDEN]: "You don't have permission to do that.",
  [HttpStatus.NOT_FOUND]: "The requested resource was not found.",
  [HttpStatus.BAD_REQUEST]: "Invalid request. Please check your input.",
  [HttpStatus.PAYLOAD_TOO_LARGE]: "File too large. Please upload a smaller file.",
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    if (exception instanceof ThrottlerException) {
      status = HttpStatus.TOO_MANY_REQUESTS;
      message = FRIENDLY_MESSAGES[status];
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      const rawMessage = typeof res === "string" ? res : (res as { message?: string }).message ?? exception.message;
      message = FRIENDLY_MESSAGES[status] ?? rawMessage;
    } else if (exception instanceof JobNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof InvalidUrlException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (!isProduction && exception instanceof Error) {
      message = exception.message;
    } else if (isProduction) {
      message = "Internal server error";
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception instanceof Error ? exception.stack : undefined
    );

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
