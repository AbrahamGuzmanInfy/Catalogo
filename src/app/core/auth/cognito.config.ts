export interface CognitoFrontendConfig {
  userPoolId: string;
  userPoolClientId: string;
  loginWithEmail: boolean;
}

export const COGNITO_CONFIG: CognitoFrontendConfig = {
  userPoolId: 'us-east-2_wje8JyiEC',
  userPoolClientId: '4lt75ap9i2sal6si41pjuourou',
  loginWithEmail: true,
};

export function isCognitoConfigured(): boolean {
  return Boolean(COGNITO_CONFIG.userPoolId && COGNITO_CONFIG.userPoolClientId);
}
