// src/routes/auth.routes.ts (Example - Apply in your actual file)
import { Router, Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../data-source'; // Assuming TypeORM standalone
import { User } from '../users/entities/users.entity'; // Correct path
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_very_secret_jwt_key';
const router = Router();

// ... (validation middleware) ...

router.post('/login', /* validateLogin, */ async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const userRepository = AppDataSource.getRepository(User);
    // Fetch user including the password
    const user = await userRepository.findOne({
        where: { email },
        select: ["id", "email", "passwordHash", "role", "firstName", "lastName"] // Explicitly select password
    });

    if (!user || !user.passwordHash) { // Check if user exists and password was loaded
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // --- FIX: Use user.password ---
    const isPasswordValid = bcrypt.compare(password, user.passwordHash);
    // --- End Fix ---

    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return necessary user details + token
    res.json({
      message: 'Login successful!',
      accessToken: token, // Changed 'token' key to 'accessToken' for consistency
      // Return user object structure matching NestJS login response if possible
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      // Or flat structure matching your NestJS login response
      // id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// ... other routes ...
export { router as authRoutes };