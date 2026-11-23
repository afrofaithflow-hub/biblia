export function translateAuthError(error: unknown): string {
  const rawMessage =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message || '')
      : '';

  const msg = rawMessage.toLowerCase();

  if (!rawMessage) {
    return 'Não foi possível concluir a autenticação. Tente novamente.';
  }
  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'E-mail ou palavra-passe incorretos.';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Já existe uma conta registada com este e-mail. Tente iniciar sessão.';
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirme o seu e-mail antes de entrar (verifique a caixa de entrada ou spam).';
  }
  if (msg.includes('password should be at least') || msg.includes('weak_password')) {
    return 'A palavra-passe deve ter pelo menos 6 caracteres.';
  }
  if (
    msg.includes('token has expired') ||
    msg.includes('otp_expired') ||
    msg.includes('invalid token') ||
    msg.includes('otp') && msg.includes('invalid')
  ) {
    return 'Código incorreto ou expirado. Peça um novo código.';
  }
  if (
    msg.includes('rate limit') ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('for security purposes, you can only request this after')
  ) {
    return 'Aguarde cerca de um minuto antes de pedir outro e-mail.';
  }
  if (msg.includes('same_password') || msg.includes('different from the old password')) {
    return 'A nova palavra-passe deve ser diferente da anterior.';
  }
  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('fetch')) {
    return 'Sem ligação ao servidor. Verifique a sua internet e tente novamente.';
  }
  if (msg.includes('signup is disabled')) {
    return 'O registo de novas contas está temporariamente desativado.';
  }
  if (msg.includes('provider is not enabled')) {
    return 'Este método de entrada ainda não está ativado no servidor.';
  }

  return rawMessage;
}
