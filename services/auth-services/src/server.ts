import express from 'express';
import type { Request, Response } from 'express';
const app = express();
const PORT = process.env.PORT || 3000;   
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Auth Service is running');
});

app.listen(PORT, () => {
    console.log(`Auth Service listening on port ${PORT}`);
});