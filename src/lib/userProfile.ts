import type { User } from '@supabase/supabase-js';

/**
 * Extrai o nome de exibição mais humano e preciso do utilizador, priorizando:
 * 1. Nome completo e apelido oriundos do Google OAuth (user_metadata / identities)
 * 2. Display Name personalizado gravado na tabela profiles do Supabase
 * 3. Nome formatado elegante derivado do email
 * 4. Fallback fraternal cristão ("Irmão(ã)" ou "Visitante")
 */
export function getEffectiveDisplayName(
  user: User | null | undefined,
  profile?: { display_name?: string | null } | null
): string {
  if (!user && !profile?.display_name) return 'Visitante';

  const meta = user?.user_metadata || {};
  const identities = user?.identities || [];
  const identityData = (identities.length > 0 && identities[0]?.identity_data)
    ? (identities[0].identity_data as Record<string, any>)
    : {};
  const emailPrefix = user?.email?.split('@')[0]?.toLowerCase().trim() || '';

  // 1. Google OAuth / Metadados de Autenticação — Nome Completo (Nome + Apelido do Google)
  const fullName = String(
    meta.full_name ||
    meta.name ||
    identityData.full_name ||
    identityData.name ||
    [meta.given_name || identityData.given_name, meta.family_name || identityData.family_name].filter(Boolean).join(' ') ||
    ''
  ).trim();

  if (fullName && fullName.toLowerCase() !== emailPrefix) {
    return fullName;
  }

  // 2. Profile display_name do Supabase (se o utilizador configurou ou foi sincronizado)
  const profileName = String(profile?.display_name || '').trim();
  if (profileName && profileName.toLowerCase() !== emailPrefix) {
    return profileName;
  }

  // 3. Custom display_name se diferente do email
  const customDisplay = String(meta.display_name || identityData.display_name || '').trim();
  if (customDisplay && customDisplay.toLowerCase() !== emailPrefix) {
    return customDisplay;
  }

  // 4. Se tiver fullName mesmo com coincidência de prefixo
  if (fullName) return fullName;
  if (profileName) return profileName;

  // 5. Fallback com o prefixo do e-mail capitalizado
  if (emailPrefix) {
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  return 'Irmão(ã)';
}

/**
 * Extrai estritamente o primeiro nome da conta Google ou do perfil do utilizador.
 * Exemplo: "João Carlos Chissano" -> "João"
 */
export function getFirstName(
  user: User | null | undefined,
  profile?: { display_name?: string | null } | null
): string {
  const meta = user?.user_metadata || {};
  const identities = user?.identities || [];
  const identityData = (identities.length > 0 && identities[0]?.identity_data)
    ? (identities[0].identity_data as Record<string, any>)
    : {};

  // 1. Given name direto do Google OAuth
  const given = String(meta.given_name || identityData.given_name || '').trim();
  if (given) {
    return given.charAt(0).toUpperCase() + given.slice(1);
  }

  // 2. Primeiro nome derivado do nome completo
  const fullName = getEffectiveDisplayName(user, profile);
  if (fullName && fullName !== 'Irmão(ã)' && fullName !== 'Visitante') {
    const firstWord = fullName.split(' ')[0]?.trim();
    if (firstWord) {
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
    }
  }

  return 'Irmão';
}
