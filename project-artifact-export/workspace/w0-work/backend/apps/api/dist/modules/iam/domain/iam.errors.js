"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionInvalidError = exports.UserAlreadyExistsError = exports.InvalidCredentialsError = void 0;
class InvalidCredentialsError extends Error {
}
exports.InvalidCredentialsError = InvalidCredentialsError;
class UserAlreadyExistsError extends Error {
}
exports.UserAlreadyExistsError = UserAlreadyExistsError;
class SessionInvalidError extends Error {
}
exports.SessionInvalidError = SessionInvalidError;
