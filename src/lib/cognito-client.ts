"use client";

import {
  CognitoUserPool,
  CognitoUser,
  CognitoUserAttribute,
  AuthenticationDetails,
  CognitoUserSession,
  ISignUpResult,
} from "amazon-cognito-identity-js";

const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const ClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;

function getPool(): CognitoUserPool {
  if (!UserPoolId || !ClientId) {
    throw new Error(
      "Cognito not configured: set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID in .env.local."
    );
  }
  return new CognitoUserPool({ UserPoolId, ClientId });
}

export interface AuthTokens {
  idToken: string;
  accessToken: string;
  refreshToken: string;
}

/** Sign in with email + password via SRP. Resolves with Cognito-issued JWTs. */
export function cognitoSignIn(email: string, password: string): Promise<AuthTokens> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    const details = new AuthenticationDetails({ Username: email, Password: password });
    user.authenticateUser(details, {
      onSuccess: (session: CognitoUserSession) => {
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          accessToken: session.getAccessToken().getJwtToken(),
          refreshToken: session.getRefreshToken().getToken(),
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () => {
        // Admin-invited users need to reset their password on first login.
        // Surface this clearly rather than silently hanging.
        reject(new Error("NEW_PASSWORD_REQUIRED"));
      },
      mfaRequired: () => reject(new Error("MFA_REQUIRED")),
      totpRequired: () => reject(new Error("MFA_REQUIRED")),
    });
  });
}

export interface SignUpParams {
  email: string;
  password: string;
  name?: string;
}

/** Create an account. Cognito will email a verification code. */
export function cognitoSignUp({ email, password, name }: SignUpParams): Promise<ISignUpResult> {
  return new Promise((resolve, reject) => {
    const attrs: CognitoUserAttribute[] = [
      new CognitoUserAttribute({ Name: "email", Value: email }),
    ];
    if (name) attrs.push(new CognitoUserAttribute({ Name: "name", Value: name }));
    getPool().signUp(email, password, attrs, [], (err, result) => {
      if (err || !result) return reject(err ?? new Error("Sign up failed"));
      resolve(result);
    });
  });
}

export function cognitoConfirmSignUp(email: string, code: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.confirmRegistration(code, true, (err) => (err ? reject(err) : resolve()));
  });
}

export function cognitoResendCode(email: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: getPool() });
    user.resendConfirmationCode((err) => (err ? reject(err) : resolve()));
  });
}

/** Map Cognito's error.code / message to friendly UI copy. */
export function describeCognitoError(err: unknown, fallback = "Something went wrong."): string {
  if (!err) return fallback;
  const e = err as { code?: string; name?: string; message?: string };
  const code = e.code ?? e.name ?? "";
  const msg = e.message ?? "";
  if (code === "NotAuthorizedException") return "Incorrect email or password.";
  if (code === "UserNotFoundException") return "No account found for this email.";
  if (code === "UserNotConfirmedException") return "Please verify your email first — enter the code we sent you.";
  if (code === "UsernameExistsException") return "An account with this email already exists.";
  if (code === "CodeMismatchException") return "That verification code is incorrect.";
  if (code === "ExpiredCodeException") return "This code has expired — request a new one.";
  if (code === "InvalidPasswordException")
    return "Password doesn't meet requirements (min 8 chars, mix of upper/lower/number/symbol).";
  if (code === "InvalidParameterException") return msg || "Please check your input and try again.";
  if (code === "LimitExceededException") return "Too many attempts — please wait a minute and try again.";
  if (msg === "NEW_PASSWORD_REQUIRED") return "Your account needs a new password. Use the Cognito hosted UI or contact support.";
  if (msg === "MFA_REQUIRED") return "MFA isn't supported in-app yet. Contact support.";
  return msg || fallback;
}
