import crypto from 'crypto';

export const generateRoomToken = () => crypto.randomBytes(32).toString('hex');
