// src/shared/localization.ts
// T505: Localization framework for UI strings and keyword dictionaries

/**
 * Localized keyword dictionaries for urgency and scam detection
 * Supports multiple languages with fallback to English
 */

export interface LocalizedKeywords {
  urgencyKeywords: string[];
  scamKeywords: string[];
  threatKeywords: string[];
  paymentKeywords: string[];
}

// English keyword dictionary
const EN_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'urgent', 'immediate', 'immediately', 'action required', 'asap', 'hurry', 'rush', 'quickly', 'fast',
    'now', 'today', 'expires', 'deadline', 'limited time', 'act now',
    'don\'t wait', 'right away', 'immediately', 'time sensitive',
    'expire', 'expiring', 'final notice', 'last chance', 'ending soon'
  ],
  scamKeywords: [
    'verify account', 'suspended', 'confirm identity', 'unusual activity',
    'click here', 'act now', 'limited offer', 'congratulations',
    'you\'ve won', 'claim your', 'free gift', 'risk-free', 'guaranteed',
    'no credit check', 'work from home', 'earn money fast', 'investment opportunity',
    'refund', 'tax refund', 'government grant', 'inheritance', 'lottery',
    'wire transfer', 'western union', 'moneygram', 'bitcoin', 'cryptocurrency'
  ],
  threatKeywords: [
    'legal action', 'lawsuit', 'arrest', 'warrant', 'police', 'fbi', 'irs',
    'debt collection', 'overdue', 'unpaid', 'suspended', 'frozen account',
    'court', 'subpoena', 'summons', 'penalty', 'fine', 'prosecution'
  ],
  paymentKeywords: [
    'bank account', 'credit card', 'social security', 'ssn', 'password',
    'pin', 'account number', 'routing number', 'wire transfer', 'payment',
    'billing', 'invoice', 'transaction', 'verify payment', 'update payment'
  ]
};

// Spanish keyword dictionary
const ES_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'urgente', 'inmediato', 'rápido', 'ahora', 'hoy', 'expira', 'fecha límite',
    'tiempo limitado', 'actúa ahora', 'no esperes', 'de inmediato',
    'sensible al tiempo', 'caduca', 'último aviso', 'última oportunidad',
    'terminando pronto', 'apúrate', 'prisa', 'rápidamente'
  ],
  scamKeywords: [
    'verificar cuenta', 'suspendido', 'confirmar identidad', 'actividad inusual',
    'haz clic aquí', 'actúa ahora', 'oferta limitada', 'felicitaciones',
    'has ganado', 'reclama tu', 'regalo gratis', 'sin riesgo', 'garantizado',
    'sin verificación de crédito', 'trabajar desde casa', 'ganar dinero rápido',
    'oportunidad de inversión', 'reembolso', 'devolución de impuestos',
    'subvención gubernamental', 'herencia', 'lotería', 'transferencia bancaria',
    'western union', 'moneygram', 'bitcoin', 'criptomoneda'
  ],
  threatKeywords: [
    'acción legal', 'demanda', 'arresto', 'orden', 'policía', 'fbi', 'irs',
    'cobro de deudas', 'vencido', 'impago', 'suspendido', 'cuenta congelada',
    'tribunal', 'citación', 'comparendo', 'penalización', 'multa', 'procesamiento'
  ],
  paymentKeywords: [
    'cuenta bancaria', 'tarjeta de crédito', 'seguro social', 'ssn', 'contraseña',
    'pin', 'número de cuenta', 'número de ruta', 'transferencia bancaria', 'pago',
    'facturación', 'factura', 'transacción', 'verificar pago', 'actualizar pago'
  ]
};

// French keyword dictionary
const FR_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'urgent', 'immédiat', 'vite', 'rapidement', 'maintenant', 'aujourd\'hui',
    'expire', 'date limite', 'temps limité', 'agissez maintenant', 'n\'attendez pas',
    'immédiatement', 'sensible au temps', 'expire', 'dernier avis',
    'dernière chance', 'se termine bientôt', 'dépêchez-vous'
  ],
  scamKeywords: [
    'vérifier compte', 'suspendu', 'confirmer identité', 'activité inhabituelle',
    'cliquez ici', 'agissez maintenant', 'offre limitée', 'félicitations',
    'vous avez gagné', 'réclamez votre', 'cadeau gratuit', 'sans risque', 'garanti',
    'sans vérification de crédit', 'travail à domicile', 'gagner argent rapidement',
    'opportunité d\'investissement', 'remboursement', 'remboursement d\'impôt',
    'subvention gouvernementale', 'héritage', 'loterie', 'virement bancaire',
    'western union', 'moneygram', 'bitcoin', 'cryptomonnaie'
  ],
  threatKeywords: [
    'action en justice', 'procès', 'arrestation', 'mandat', 'police', 'fbi',
    'recouvrement de créances', 'échu', 'impayé', 'suspendu', 'compte gelé',
    'tribunal', 'assignation', 'citation', 'pénalité', 'amende', 'poursuite'
  ],
  paymentKeywords: [
    'compte bancaire', 'carte de crédit', 'sécurité sociale', 'ssn', 'mot de passe',
    'code pin', 'numéro de compte', 'numéro de routage', 'virement bancaire', 'paiement',
    'facturation', 'facture', 'transaction', 'vérifier paiement', 'mettre à jour paiement'
  ]
};

// German keyword dictionary
const DE_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'dringend', 'sofort', 'schnell', 'jetzt', 'heute', 'läuft ab', 'frist',
    'begrenzte zeit', 'handeln sie jetzt', 'warten sie nicht', 'sofort',
    'zeitkritisch', 'verfällt', 'letzte mitteilung', 'letzte chance',
    'endet bald', 'beeilen sie sich'
  ],
  scamKeywords: [
    'konto verifizieren', 'gesperrt', 'identität bestätigen', 'ungewöhnliche aktivität',
    'hier klicken', 'handeln sie jetzt', 'begrenztes angebot', 'glückwunsch',
    'sie haben gewonnen', 'fordern sie ihr', 'kostenloses geschenk', 'risikofrei',
    'garantiert', 'keine bonitätsprüfung', 'heimarbeit', 'schnell geld verdienen',
    'investitionsmöglichkeit', 'rückerstattung', 'steuerrückerstattung',
    'staatliche förderung', 'erbschaft', 'lotterie', 'überweisung',
    'western union', 'moneygram', 'bitcoin', 'kryptowährung'
  ],
  threatKeywords: [
    'rechtliche schritte', 'klage', 'verhaftung', 'haftbefehl', 'polizei',
    'inkasso', 'überfällig', 'unbezahlt', 'gesperrt', 'konto eingefroren',
    'gericht', 'vorladung', 'strafe', 'geldstrafe', 'strafverfolgung'
  ],
  paymentKeywords: [
    'bankkonto', 'kreditkarte', 'sozialversicherung', 'passwort', 'pin',
    'kontonummer', 'bankleitzahl', 'überweisung', 'zahlung', 'abrechnung',
    'rechnung', 'transaktion', 'zahlung verifizieren', 'zahlung aktualisieren'
  ]
};

// Italian keyword dictionary
const IT_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'urgente', 'immediato', 'veloce', 'adesso', 'oggi', 'scade', 'scadenza',
    'tempo limitato', 'agisci ora', 'non aspettare', 'immediatamente',
    'sensibile al tempo', 'scadenza', 'ultimo avviso', 'ultima possibilità',
    'finisce presto', 'sbrigati'
  ],
  scamKeywords: [
    'verifica account', 'sospeso', 'conferma identità', 'attività insolita',
    'clicca qui', 'agisci ora', 'offerta limitata', 'congratulazioni',
    'hai vinto', 'richiedi il tuo', 'regalo gratis', 'senza rischi', 'garantito',
    'nessun controllo credito', 'lavoro da casa', 'guadagnare soldi velocemente',
    'opportunità di investimento', 'rimborso', 'rimborso fiscale',
    'sovvenzione governativa', 'eredità', 'lotteria', 'bonifico bancario',
    'western union', 'moneygram', 'bitcoin', 'criptovaluta'
  ],
  threatKeywords: [
    'azione legale', 'causa', 'arresto', 'mandato', 'polizia', 'recupero crediti',
    'scaduto', 'non pagato', 'sospeso', 'conto congelato', 'tribunale',
    'citazione', 'multa', 'ammenda', 'procedimento penale'
  ],
  paymentKeywords: [
    'conto bancario', 'carta di credito', 'sicurezza sociale', 'password', 'pin',
    'numero di conto', 'numero di routing', 'bonifico bancario', 'pagamento',
    'fatturazione', 'fattura', 'transazione', 'verifica pagamento', 'aggiorna pagamento'
  ]
};

// Portuguese keyword dictionary
const PT_KEYWORDS: LocalizedKeywords = {
  urgencyKeywords: [
    'urgente', 'imediato', 'rápido', 'agora', 'hoje', 'expira', 'prazo',
    'tempo limitado', 'aja agora', 'não espere', 'imediatamente',
    'sensível ao tempo', 'vence', 'último aviso', 'última chance',
    'terminando em breve', 'apresse-se'
  ],
  scamKeywords: [
    'verificar conta', 'suspenso', 'confirmar identidade', 'atividade incomum',
    'clique aqui', 'aja agora', 'oferta limitada', 'parabéns', 'você ganhou',
    'reivindique seu', 'presente grátis', 'sem risco', 'garantido',
    'sem verificação de crédito', 'trabalho em casa', 'ganhar dinheiro rápido',
    'oportunidade de investimento', 'reembolso', 'restituição de imposto',
    'subsídio governamental', 'herança', 'loteria', 'transferência bancária',
    'western union', 'moneygram', 'bitcoin', 'criptomoeda'
  ],
  threatKeywords: [
    'ação legal', 'processo', 'prisão', 'mandado', 'polícia', 'cobrança de dívida',
    'vencido', 'não pago', 'suspenso', 'conta congelada', 'tribunal',
    'intimação', 'multa', 'penalidade', 'processo criminal'
  ],
  paymentKeywords: [
    'conta bancária', 'cartão de crédito', 'segurança social', 'senha', 'pin',
    'número da conta', 'número de roteamento', 'transferência bancária', 'pagamento',
    'faturamento', 'fatura', 'transação', 'verificar pagamento', 'atualizar pagamento'
  ]
};

// Language code mapping
const KEYWORD_DICTIONARIES: { [key: string]: LocalizedKeywords } = {
  'en': EN_KEYWORDS,
  'es': ES_KEYWORDS,
  'fr': FR_KEYWORDS,
  'de': DE_KEYWORDS,
  'it': IT_KEYWORDS,
  'pt': PT_KEYWORDS,
};

/**
 * Get keywords for the current browser locale
 * Falls back to English if locale is not supported
 */
export function getLocalizedKeywords(): LocalizedKeywords {
  const locale =
    typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage
      ? chrome.i18n.getUILanguage().split('-')[0].toLowerCase()
      : 'en';
  return KEYWORD_DICTIONARIES[locale] || EN_KEYWORDS;
}

/**
 * Get keywords for a specific locale
 */
export function getKeywordsForLocale(locale: string): LocalizedKeywords {
  const lang = locale ? locale.split('-')[0].toLowerCase() : 'en';
  return KEYWORD_DICTIONARIES[lang] || EN_KEYWORDS;
}

/**
 * Get all supported locales
 */
export function getSupportedLocales(): string[] {
  return Object.keys(KEYWORD_DICTIONARIES);
}

/**
 * Merge custom keywords with localized defaults
 */
export function mergeWithCustomKeywords(
  customUrgency: string[] = [],
  customScam: string[] = []
): LocalizedKeywords {
  const localized = getLocalizedKeywords();

  return {
    urgencyKeywords: [...new Set([...localized.urgencyKeywords, ...customUrgency])],
    scamKeywords: [...new Set([...localized.scamKeywords, ...customScam])],
    threatKeywords: localized.threatKeywords,
    paymentKeywords: localized.paymentKeywords,
  };
}

/**
 * Check if text contains any keywords from a category
 */
export function containsKeywords(
  text: string,
  keywords: string[],
  caseSensitive: boolean = false
): { found: boolean; matches: string[] } {
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchKeywords = caseSensitive ? keywords : keywords.map(k => k.toLowerCase());

  const matches = searchKeywords.filter(keyword => searchText.includes(keyword));

  return {
    found: matches.length > 0,
    matches: matches
  };
}

/**
 * Get keyword match score (0-100)
 * Higher score = more keywords matched
 */
export function getKeywordMatchScore(text: string, keywords: string[]): number {
  const result = containsKeywords(text, keywords);
  if (!result.found) return 0;

  // Calculate score based on number and uniqueness of matches
  const uniqueMatches = new Set(result.matches);
  const matchRatio = uniqueMatches.size / keywords.length;

  return Math.min(100, Math.round(matchRatio * 100 * 1.5));
}
