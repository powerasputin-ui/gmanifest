/**
 * Validation types supported by the platform.
 */
type ValidationType = 'email' | 'phone' | 'inn' | 'kpp' | 'date' | 'amount' | 'required' | 'regex';

interface ValidationRule {
  type: ValidationType;
  pattern?: string; // for regex type
}

export interface FieldValidation {
  isValid: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  fieldResults: Record<string, FieldValidation>;
}

// --- Validators ---

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value: string): FieldValidation {
  if (!value) return { isValid: true }; // null/empty is ok for non-required
  if (emailRegex.test(value)) return { isValid: true };
  return { isValid: false, error: 'Invalid email format' };
}

const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;

function validatePhone(value: string): FieldValidation {
  if (!value) return { isValid: true };
  const cleaned = value.replace(/[\s\-()]/g, '');
  if (/^\+?\d{7,15}$/.test(cleaned)) return { isValid: true };
  return { isValid: false, error: 'Invalid phone number format' };
}

function validateInn(value: string): FieldValidation {
  if (!value) return { isValid: true };
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 12) return { isValid: true };
  return { isValid: false, error: 'ИНН must be 10 or 12 digits' };
}

function validateKpp(value: string): FieldValidation {
  if (!value) return { isValid: true };
  const digits = value.replace(/\D/g, '');
  if (digits.length === 9) return { isValid: true };
  return { isValid: false, error: 'КПП must be 9 digits' };
}

function validateDate(value: string): FieldValidation {
  if (!value) return { isValid: true };
  // Try common date formats
  const datePatterns = [
    /^\d{4}[-/]\d{2}[-/]\d{2}/, // ISO
    /^\d{2}\.\d{2}\.\d{4}/, // Russian DD.MM.YYYY
    /^\d{2}\/\d{2}\/\d{4}/, // US MM/DD/YYYY
  ];
  const isDateLike = datePatterns.some((p) => p.test(value.trim()));
  if (isDateLike) return { isValid: true };
  // Also try parsing
  const parsed = Date.parse(value);
  if (!isNaN(parsed)) return { isValid: true };
  return { isValid: false, error: 'Invalid date format' };
}

function validateAmount(value: string): FieldValidation {
  if (!value) return { isValid: true };
  // Allow numbers with optional thousands separators and decimal
  const cleaned = value.replace(/[^\d.,-]/g, '');
  if (/^-?[\d]+([.,]\d{1,2})?$/.test(cleaned)) return { isValid: true };
  return { isValid: false, error: 'Invalid amount format' };
}

function validateRequired(value: string | null | undefined): FieldValidation {
  if (value !== null && value !== undefined && value.toString().trim().length > 0) {
    return { isValid: true };
  }
  return { isValid: false, error: 'Field is required' };
}

function validateRegex(value: string, pattern: string): FieldValidation {
  if (!value) return { isValid: true };
  try {
    const regex = new RegExp(pattern);
    if (regex.test(value)) return { isValid: true };
    return { isValid: false, error: `Value does not match required pattern` };
  } catch {
    return { isValid: true }; // If regex is invalid, skip validation
  }
}

const validatorMap: Record<string, (v: string) => FieldValidation> = {
  email: validateEmail,
  phone: validatePhone,
  inn: validateInn,
  kpp: validateKpp,
  date: validateDate,
  amount: validateAmount,
  required: validateRequired,
};

/**
 * Validate extracted fields based on validation rules.
 * @param fields - Object of fieldName -> value
 * @param validationRulesJson - JSON string of { fieldName: [ValidationType, ...] }
 */
export function validateFields(
  fields: Record<string, unknown>,
  validationRulesJson: string | null | undefined
): ValidationResult {
  const fieldResults: Record<string, FieldValidation> = {};
  const errors: Record<string, string> = {};
  let allValid = true;

  // Parse validation rules
  let rules: Record<string, ValidationRule[]> = {};
  if (validationRulesJson) {
    try {
      const parsed = JSON.parse(validationRulesJson);
      for (const [fieldName, ruleList] of Object.entries(parsed)) {
        if (Array.isArray(ruleList)) {
          rules[fieldName] = ruleList.map((r) => {
            if (typeof r === 'string') return { type: r } as ValidationRule;
            if (typeof r === 'object' && r !== null) return r as ValidationRule;
            return { type: 'required' } as ValidationRule;
          });
        }
      }
    } catch (e) {
      console.error('Failed to parse validation rules:', e);
    }
  }

  // Validate each field that has rules
  for (const [fieldName, ruleList] of Object.entries(rules)) {
    const value = fields[fieldName];
    const valueStr = value !== null && value !== undefined ? String(value) : '';

    for (const rule of ruleList) {
      let result: FieldValidation;

      if (rule.type === 'regex' && rule.pattern) {
        result = validateRegex(valueStr, rule.pattern);
      } else if (rule.type === 'required') {
        result = validateRequired(valueStr || null);
      } else {
        const validator = validatorMap[rule.type];
        result = validator ? validator(valueStr) : { isValid: true };
      }

      if (!result.isValid) {
        fieldResults[fieldName] = result;
        errors[fieldName] = result.error || `Validation failed: ${rule.type}`;
        allValid = false;
        break; // Stop at first error per field
      }
    }

    // If no error recorded, mark as valid
    if (!fieldResults[fieldName]) {
      fieldResults[fieldName] = { isValid: true };
    }
  }

  return {
    isValid: allValid,
    errors,
    fieldResults,
  };
}
