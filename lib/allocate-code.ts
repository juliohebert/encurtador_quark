export const MAX_CODE_ATTEMPTS = 5;

export class CodeAllocationError extends Error {
  constructor(attempts: number) {
    super(`Não foi possível gerar um código livre após ${attempts} tentativas.`);
    this.name = "CodeAllocationError";
  }
}

/**
 * Gera códigos até que `tryInsert` consiga persistir um deles.
 * `tryInsert` deve retornar `false` quando o código já existir (colisão).
 */
export async function allocateCode(
  tryInsert: (code: string) => Promise<boolean>,
  generate: () => string,
  maxAttempts = MAX_CODE_ATTEMPTS,
): Promise<string> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const code = generate();
    if (await tryInsert(code)) {
      return code;
    }
  }
  throw new CodeAllocationError(maxAttempts);
}
