import { isValidHexCode } from '../utils/codeGenerator.js';

// Validate :code route param middleware
export function validateCodeParam(req, res, next) {
  const { code } = req.params;
  const expected = parseInt(process.env.HEX_CODE_LENGTH || '6');
  if (!code || !isValidHexCode(code, expected)) {
    return res.status(400).json({
      error: 'Invalid code',
      message: `Code must be a ${expected}-character hexadecimal string`
    });
  }
  next();
}