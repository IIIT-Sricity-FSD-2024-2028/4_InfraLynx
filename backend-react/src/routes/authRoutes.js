import express from 'express';
import { login, getMe, logout, registerTownship, setPassword } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & retrieve token (Rate limited against brute-force attacks)
 * @access  Public
 */
router.post('/login', authRateLimiter, login);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, getMe);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, logout);


/**
 * @route   POST /api/v1/auth/register-township
 * @desc    Register a new Township & Township COO account
 * @access  Public
 */
router.post('/register-township', authRateLimiter, registerTownship);

/**
 * @route   POST /api/v1/auth/set-password
 * @desc    Update / set user password with strict validation
 * @access  Private
 */
router.post('/set-password', authenticate, authRateLimiter, setPassword);

export default router;
