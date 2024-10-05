import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { saltOrRounds } from './constants';


@Injectable()
export class HashService{
    async getPasswordHash(password: string){
        const salt = await bcrypt.genSalt(parseInt(saltOrRounds));
        const hash = await bcrypt.hash(password, salt);
        return hash;
    }
    
}