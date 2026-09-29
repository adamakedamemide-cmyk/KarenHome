"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const iam_service_1 = require("../../modules/iam/application/iam.service");
(0, globals_1.describe)('refresh token hashing', () => {
    (0, globals_1.it)('is deterministic and one-way sized', () => {
        const token = 'example-refresh-token-abcdef';
        const a = (0, iam_service_1.hashRefreshToken)(token);
        const b = (0, iam_service_1.hashRefreshToken)(token);
        (0, globals_1.expect)(a).toBe(b);
        (0, globals_1.expect)(a).toHaveLength(64);
        (0, globals_1.expect)(a).not.toBe(token);
    });
});
