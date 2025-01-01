import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { baseUrl } from './hash/constants';

@Injectable()
export class SendMailService {

    constructor() { }

    async sendEmail(recipient: string, user_id: string, playerName: string) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [recipient],
            subject: `Welcome to Pokemon Game!`,
            html: `
            <h1>Welcome to Pokemon Game! ${playerName}</h1>
            <p>Please click the following link to verify your email address:</p>
            https://apipokemongamenestjs.onrender.com/pokemon-api/email_verification/${user_id}"
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
    }

    async sendEmailVerificationOK(recipient: string, nickName: string) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const { data, error } = await resend.emails.send({
            from: "noreply@javivc.site",
            to: [recipient],
            subject: `Pokemon Game email verifification done`,
            html: `
            <h2>${nickName}, you are now verified!, enjoy the game!!</h2>
            `,
        });
        if (error) {
            console.log(error)
            return error
        } else {
            console.log(data)
            return data
        }
      }

}