export function isValidPassword(password: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
}

export function getPasswordValidationMessage(): string {
  return "La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número";
}