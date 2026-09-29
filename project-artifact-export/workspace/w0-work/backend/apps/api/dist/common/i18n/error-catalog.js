"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGE_CATALOG = void 0;
exports.localizeErrorCode = localizeErrorCode;
exports.assertCatalogCoverage = assertCatalogCoverage;
const contracts_1 = require("@platform/contracts");
exports.ERROR_MESSAGE_CATALOG = {
    RESOURCE_NOT_FOUND: { en: 'The requested resource was not found.', ru: 'Запрошенный ресурс не найден.' },
    FORBIDDEN: { en: 'You are not allowed to perform this action.', ru: 'Вам не разрешено выполнять это действие.' },
    UNAUTHORIZED: { en: 'Authentication is required.', ru: 'Требуется аутентификация.' },
    AUTH_REQUIRED: { en: 'Bearer token required.', ru: 'Требуется Bearer-токен.' },
    AUTH_INVALID_CREDENTIALS: { en: 'Invalid email or password.', ru: 'Неверный адрес электронной почты или пароль.' },
    AUTH_SESSION_REVOKED: { en: 'Your session is no longer active.', ru: 'Ваша сессия больше не активна.' },
    AUTH_MFA_REQUIRED: { en: 'Multi-factor verification is required.', ru: 'Требуется многофакторная проверка.' },
    AUTH_MFA_INVALID: { en: 'Invalid verification code.', ru: 'Неверный код подтверждения.' },
    VALIDATION_ERROR: { en: 'The submitted data is invalid.', ru: 'Отправленные данные недействительны.' },
    STATE_TRANSITION_NOT_ALLOWED: { en: 'This state transition is not allowed.', ru: 'Этот переход состояния запрещён.' },
    VERIFICATION_REQUIRED: { en: 'Verification is required before this action.', ru: 'Перед этим действием требуется верификация.' },
    AGREEMENT_REQUIRED: { en: 'You must accept the required agreement first.', ru: 'Сначала необходимо принять требуемое соглашение.' },
    COMMISSION_RULE_NOT_FOUND: { en: 'No applicable commission rule was found.', ru: 'Применимое правило комиссии не найдено.' },
    SUBSCRIPTION_REQUIRED: { en: 'An active subscription is required.', ru: 'Требуется активная подписка.' },
    PAYMENT_FAILED: { en: 'The payment could not be processed.', ru: 'Платёж не удалось обработать.' },
    RATE_LIMITED: { en: 'Too many requests. Please slow down.', ru: 'Слишком много запросов. Пожалуйста, снизьте темп.' },
    CONFLICT: { en: 'The resource was modified by another request.', ru: 'Ресурс был изменён другим запросом.' },
    RESOURCE_NOT_OWNED: { en: 'You do not manage this resource.', ru: 'Вы не управляете этим ресурсом.' },
    ORG_SCOPE_REQUIRED: { en: 'Organization scope is required.', ru: 'Требуется указать организацию.' },
    LISTING_NOT_PUBLISHABLE: { en: 'The listing does not satisfy publication requirements.', ru: 'Объявление не соответствует требованиям публикации.' },
    LISTING_VERSION_CONFLICT: { en: 'The listing was modified concurrently.', ru: 'Объявление было изменено параллельно.' },
    LISTING_STATE_CONFLICT: { en: 'The listing state has changed.', ru: 'Состояние объявления изменилось.' },
    MEDIA_NOT_OWNED: { en: 'The media asset is not owned by you.', ru: 'Медиа-ресурс вам не принадлежит.' },
    MEDIA_QUARANTINED: { en: 'The uploaded file failed the security scan.', ru: 'Загруженный файл не прошёл проверку безопасности.' },
    MEDIA_TOO_LARGE: { en: 'The uploaded file exceeds the size limit.', ru: 'Загруженный файл превышает допустимый размер.' },
    MEDIA_UNSUPPORTED_TYPE: { en: 'The file type is not supported.', ru: 'Тип файла не поддерживается.' },
    OAUTH_PROVIDER_NOT_CONFIGURED: { en: 'The OAuth provider is not configured.', ru: 'Поставщик OAuth не настроен.' },
    CHALLENGE_REQUIRED: { en: 'An additional verification challenge is required.', ru: 'Требуется дополнительная проверка.' },
    TEMPORARILY_BLOCKED: { en: 'You are temporarily blocked. Try again later.', ru: 'Вы временно заблокированы. Попробуйте позже.' },
    DISPOSABLE_EMAIL_REJECTED: { en: 'Disposable email addresses are not allowed.', ru: 'Одноразовые адреса электронной почты запрещены.' },
    MFA_ALREADY_ACTIVE: { en: 'Multi-factor authentication is already active.', ru: 'Многофакторная аутентификация уже включена.' },
    TOKEN_EXPIRED: { en: 'The token has expired.', ru: 'Срок действия токена истёк.' },
    TOKEN_CONSUMED: { en: 'The token was already used.', ru: 'Токен уже был использован.' },
    QUOTA_EXCEEDED: { en: 'Your plan quota is exhausted.', ru: 'Квота вашего плана исчерпана.' },
    BUDGET_EXCEEDED: { en: 'The campaign budget is exhausted.', ru: 'Бюджет кампании исчерпан.' },
    AD_NOT_SERVED: { en: 'No advertisement is available for this placement.', ru: 'Нет доступной рекламы для этого размещения.' },
    ENTITLEMENT_LIMIT_REACHED: { en: 'The plan entitlement limit has been reached.', ru: 'Достигнут лимит возможностей плана.' },
    DEPENDENCY_UNAVAILABLE: { en: 'A required dependency is unavailable.', ru: 'Необходимая зависимость недоступна.' },
    INTERNAL_ERROR: { en: 'Internal server error.', ru: 'Внутренняя ошибка сервера.' },
};
function localizeErrorCode(code, locale) {
    const entry = exports.ERROR_MESSAGE_CATALOG[code];
    if (!entry)
        return undefined;
    if (locale.toLowerCase().startsWith('ru'))
        return entry.ru;
    return entry.en;
}
/** Compile-time guard: every catalog key must be a known error code. */
function assertCatalogCoverage() {
    const missing = contracts_1.ERROR_CODES.filter((code) => !(code in exports.ERROR_MESSAGE_CATALOG));
    return missing;
}
