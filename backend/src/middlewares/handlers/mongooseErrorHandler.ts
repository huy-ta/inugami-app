import { Request, Response, NextFunction } from 'express';
import { ApiErrorResponse } from '../../payload/response/ApiErrorResponse';
import { HTTPStatus } from '../../enums/HTTPStatusEnum';

interface IMongooseValidationError {
  errors?: {
    [key: string]: {
      message: string;
      name: string;
      properties: {
        message: string;
        type: string;
        enumValues?: string[];
        path: string;
        value: string;
      };
      kind: string;
      path: string;
      value: string;
    };
  };
  _message: string;
  message: string;
  name: string;
}

interface IMongooseDuplicationError {
  driver: boolean;
  name: string;
  index: number;
  code: number;
  errmsg: string;
}

interface ICustomErrors {
  [key: string]: string;
}

const isMongooseValidationError = (err: IMongooseValidationError) =>
  err.errors && err._message && err.message && err.name;

const isMongooseDuplicationError = (err: IMongooseDuplicationError) => err.code === 11000;

const mongooseErrorHandler = (
  err: IMongooseValidationError & IMongooseDuplicationError,
  req: Request,
  res: Response,
  next: NextFunction
): Response => {
  if (isMongooseValidationError(err)) {
    const customErrors: ICustomErrors = {};
    const keys = Object.keys(err.errors);

    keys.forEach(key => {
      let message: string = err.errors[key].message;

      if (err.errors[key].properties && err.errors[key].properties.message) {
        message = err.errors[key].properties.message.replace('`{PATH}`', key);
      }

      message = message
        .replace('Path', '')
        .replace('path', '')
        .replace(/\s+/g, ' ')
        .trim();
      customErrors[key] = message;
    });

    const apiErrorResponse = new ApiErrorResponse(false, 'Mongoose model validation failed.', customErrors);

    return res.status(HTTPStatus.BAD_REQUEST).json(apiErrorResponse);
  }
  
  if (isMongooseDuplicationError(err)) {
    const customErrors: ICustomErrors = {};
    const duplicatedFieldName = err.errmsg.slice(err.errmsg.indexOf('$') + 1, err.errmsg.indexOf('_'));

    customErrors[duplicatedFieldName] = 'Already existed.';

    const apiErrorResponse = new ApiErrorResponse(false, 'Mongoose model duplicated.', customErrors);

    return res.status(HTTPStatus.BAD_REQUEST).json(apiErrorResponse);
  }

  next(err);
};

export { mongooseErrorHandler };
