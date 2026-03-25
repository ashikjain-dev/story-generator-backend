import { Router } from 'express';
import { createContact } from '../controllers/contact.controller';

const contactRouter = Router();

// POST /api/v1/contact
contactRouter.post('/', createContact);

export { contactRouter };

