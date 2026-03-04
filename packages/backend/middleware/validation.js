const { body, param, validationResult } = require('express-validator');

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Geçersiz veri', details: errors.array() });
    }
    next();
};

const direkEkleValidation = [
    body('numara').optional().trim().isLength({ max: 50 }).withMessage('Numara max 50 karakter'),
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('Geçersiz enlem'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('Geçersiz boylam'),
    body('tip_id').isInt({ min: 1 }).withMessage('Geçersiz tip'),
    body('cins_id').isInt({ min: 1 }).withMessage('Geçersiz cins'),
    body('aciklama').optional().trim().isLength({ max: 500 }).withMessage('Açıklama max 500 karakter'),
    validate
];

const direkGuncelleValidation = [
    param('id').isInt({ min: 1 }).withMessage('Geçersiz direk ID'),
    body('numara').optional().trim().isLength({ max: 50 }),
    body('lat').optional().isFloat({ min: -90, max: 90 }),
    body('lng').optional().isFloat({ min: -180, max: 180 }),
    body('tip_id').optional().isInt({ min: 1 }),
    body('cins_id').optional().isInt({ min: 1 }),
    body('aciklama').optional().trim().isLength({ max: 500 }),
    validate
];

const hatEkleValidation = [
    body('direk1_id').isInt({ min: 1 }).withMessage('Geçersiz direk1 ID'),
    body('direk2_id').isInt({ min: 1 }).withMessage('Geçersiz direk2 ID'),
    body('iletken_tipi').optional().trim().isLength({ max: 50 }),
    body('iletken_cinsi').optional().trim().isLength({ max: 50 }),
    body('kesit_mm2').optional().isFloat({ min: 0 }),
    body('mesafe_metre').optional().isFloat({ min: 0 }),
    validate
];

const projeOlusturValidation = [
    body('ad').trim().notEmpty().withMessage('Proje adı gerekli')
        .isLength({ max: 100 }).withMessage('Proje adı max 100 karakter'),
    body('aciklama').optional().trim().isLength({ max: 500 }),
    validate
];

const loginValidation = [
    body('username').trim().notEmpty().isLength({ max: 50 }).withMessage('Kullanıcı adı gerekli'),
    body('password').notEmpty().isLength({ min: 3, max: 100 }).withMessage('Şifre gerekli'),
    validate
];

module.exports = {
    validate,
    direkEkleValidation,
    direkGuncelleValidation,
    hatEkleValidation,
    projeOlusturValidation,
    loginValidation
};
