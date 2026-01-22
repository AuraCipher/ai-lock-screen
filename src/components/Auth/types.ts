export type AuthMode = 'signin' | 'signup';
export type SignUpStep = 'email' | 'name' | 'username' | 'dob' | 'password' | 'confirmation';

export interface SignUpData {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  dateOfBirth: string;
  password: string;
  confirmPassword: string;
}
